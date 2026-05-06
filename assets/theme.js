/* =========================================================
   kamis:studio — Shopify theme behaviours
   - Cart drawer (Ajax API)
   - Search overlay (predictive)
   - Variant picker (size + color)
   - Scroll FX (reveal, parallax, progress)
   ========================================================= */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const formatMoney = (cents) => {
    if (window.Shopify && window.Shopify.formatMoney) {
      return window.Shopify.formatMoney(cents, window.theme?.moneyFormat || '${{amount}}');
    }
    return 'Rs.' + Math.round(cents / 100).toLocaleString();
  };

  /* -----------------------------------------------------
     1. NAV — toggle is-scrolled when scrolled past 80px
  ----------------------------------------------------- */
  function initNav() {
    const nav = $('.nav');
    if (!nav) return;
    if (nav.classList.contains('always-solid')) return;
    const onScroll = () => {
      if (window.scrollY > 80) nav.classList.add('is-scrolled');
      else nav.classList.remove('is-scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* -----------------------------------------------------
     2. SCROLL PROGRESS BAR
  ----------------------------------------------------- */
  function initScrollProgress() {
    const bar = $('[data-scroll-progress]');
    if (!bar) return;
    let raf = 0;
    const update = () => {
      const max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
      const p = Math.max(0, Math.min(1, window.scrollY / max));
      bar.style.width = (p * 100) + '%';
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
  }

  /* -----------------------------------------------------
     3. INTERSECTION-OBSERVER REVEAL
  ----------------------------------------------------- */
  function initReveals() {
    const els = $$('[data-reveal]');
    if (!els.length || !('IntersectionObserver' in window)) {
      els.forEach(e => e.classList.add('is-in', 'is-shown'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in', 'is-shown');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  }

  /* -----------------------------------------------------
     4. PARALLAX (image translate as element scrolls through viewport)
     - data-parallax="18"  (strength in px)
     - data-parallax-feature  (used by editorial features for --parallax)
  ----------------------------------------------------- */
  function initParallax() {
    const els = $$('[data-parallax], [data-parallax-feature]');
    if (!els.length) return;
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight || 1;
      els.forEach(el => {
        const r = el.getBoundingClientRect();
        const progress = (r.top + r.height / 2 - vh / 2) / vh;
        const clamped = Math.max(-1.2, Math.min(1.2, progress));
        if (el.hasAttribute('data-parallax')) {
          const strength = parseFloat(el.getAttribute('data-parallax')) || 18;
          el.style.setProperty('--img-parallax', (clamped * strength).toFixed(2));
        }
        if (el.hasAttribute('data-parallax-feature')) {
          const strength = parseFloat(el.getAttribute('data-parallax-feature')) || 60;
          el.style.setProperty('--parallax', (clamped * strength).toFixed(2));
        }
      });
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
  }

  /* -----------------------------------------------------
     5. ANNOUNCEMENT BAR — close
  ----------------------------------------------------- */
  function initAnnoBar() {
    const bar = $('.anno');
    const close = $('.anno-close');
    if (!bar || !close) return;
    close.addEventListener('click', () => {
      bar.style.display = 'none';
      try { localStorage.setItem('kamis_anno_dismissed', '1'); } catch (e) {}
    });
    try {
      if (localStorage.getItem('kamis_anno_dismissed') === '1') {
        bar.style.display = 'none';
      }
    } catch (e) {}
  }

  /* -----------------------------------------------------
     6. DRAWERS — open/close
     Triggers: [data-open="bag|search|menu|filter"]
  ----------------------------------------------------- */
  const drawerHost = () => $('#drawer-host');
  function openDrawer(kind) {
    const host = drawerHost();
    const drawer = $(`[data-drawer="${kind}"]`);
    if (!host || !drawer) return;
    $$('[data-drawer]', host).forEach(d => d.hidden = true);
    drawer.hidden = false;
    host.hidden = false;
    document.body.style.overflow = 'hidden';
    if (kind === 'search') {
      const inp = $('input[data-search-input]', drawer);
      if (inp) setTimeout(() => inp.focus(), 60);
    }
  }
  function closeDrawer() {
    const host = drawerHost();
    if (!host) return;
    host.hidden = true;
    document.body.style.overflow = '';
  }
  function initDrawers() {
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-open]');
      if (opener) {
        e.preventDefault();
        openDrawer(opener.dataset.open);
        return;
      }
      const closer = e.target.closest('[data-close]');
      if (closer) {
        e.preventDefault();
        closeDrawer();
        return;
      }
      // click on backdrop
      if (e.target.matches('.overlay')) closeDrawer();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  /* -----------------------------------------------------
     7. CART (Shopify Ajax API)
  ----------------------------------------------------- */
  async function fetchCart() {
    const r = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
    return r.json();
  }
  async function addToCart({ id, quantity = 1, properties = {} }) {
    const r = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id, quantity, properties }] }),
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.description || err.message || 'Could not add');
    }
    return r.json();
  }
  async function changeCart({ line, quantity }) {
    const r = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line, quantity }),
    });
    return r.json();
  }
  function renderCart(cart) {
    // Bag count in nav
    $$('[data-bag-count]').forEach(el => { el.textContent = '(' + cart.item_count + ')'; });
    // FAB
    const fab = $('[data-bag-fab]');
    if (fab) {
      if (cart.item_count > 0) {
        fab.hidden = false;
        fab.textContent = `bag · ${cart.item_count} · ${formatMoney(cart.total_price)}`;
      } else {
        fab.hidden = true;
      }
    }
    // Drawer body
    const body = $('[data-drawer="bag"] .drawer-body');
    if (!body) return;
    if (cart.item_count === 0) {
      body.innerHTML = `
        <div class="empty">
          <p>your bag is empty.</p>
          <p class="muted">drop:one of spring:summer '26 is now live.</p>
          <button class="btn-outline dark" data-close>see:more</button>
        </div>`;
      return;
    }
    const itemsHtml = cart.items.map((it, i) => `
      <li class="bag-item" data-line="${i + 1}">
        <img src="${it.image || ''}" alt="" />
        <div class="bag-meta">
          <div class="bag-name">${escapeHtml(it.product_title)}</div>
          <div class="bag-variant">${escapeHtml(it.variant_title || '')}</div>
          <div class="bag-price">${formatMoney(it.final_line_price)}</div>
          <div class="qty" style="margin-top:6px">
            <button data-qty="dec" aria-label="decrease">−</button>
            <input value="${it.quantity}" type="number" min="0" />
            <button data-qty="inc" aria-label="increase">+</button>
          </div>
        </div>
        <button class="linklike small" data-remove>remove</button>
      </li>
    `).join('');
    body.innerHTML = `
      <ul class="bag-list">${itemsHtml}</ul>
      <div class="bag-foot">
        <div class="bag-sub"><span>subtotal</span><span>${formatMoney(cart.total_price)}</span></div>
        <a class="btn-fill" href="/checkout" style="display:block;text-align:center;text-decoration:none">checkout</a>
        <p class="muted small">shipping & taxes calculated at checkout.</p>
      </div>
    `;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  }
  function bindCartActions() {
    document.addEventListener('click', async (e) => {
      // Add to cart from a product form
      const addBtn = e.target.closest('[data-add-to-cart]');
      if (addBtn) {
        e.preventDefault();
        const form = addBtn.closest('form');
        if (!form) return;
        const id = form.querySelector('[name="id"]')?.value;
        const qty = parseInt(form.querySelector('[name="quantity"]')?.value || '1', 10);
        if (!id) return;
        addBtn.disabled = true;
        const oldText = addBtn.textContent;
        addBtn.textContent = 'adding…';
        try {
          await addToCart({ id, quantity: qty });
          const cart = await fetchCart();
          renderCart(cart);
          openDrawer('bag');
          addBtn.textContent = '+ added';
          setTimeout(() => { addBtn.textContent = oldText; addBtn.disabled = false; }, 1200);
        } catch (err) {
          addBtn.textContent = 'unavailable';
          setTimeout(() => { addBtn.textContent = oldText; addBtn.disabled = false; }, 1500);
        }
        return;
      }
      // Quantity changes inside drawer
      const qtyBtn = e.target.closest('[data-qty]');
      if (qtyBtn) {
        const item = qtyBtn.closest('[data-line]');
        if (!item) return;
        const line = parseInt(item.dataset.line, 10);
        const inp = item.querySelector('input');
        const cur = parseInt(inp.value || '1', 10);
        const next = qtyBtn.dataset.qty === 'inc' ? cur + 1 : Math.max(0, cur - 1);
        const cart = await changeCart({ line, quantity: next });
        renderCart(cart);
        return;
      }
      const rem = e.target.closest('[data-remove]');
      if (rem) {
        const item = rem.closest('[data-line]');
        if (!item) return;
        const line = parseInt(item.dataset.line, 10);
        const cart = await changeCart({ line, quantity: 0 });
        renderCart(cart);
        return;
      }
    });
    // Quantity input typed change
    document.addEventListener('change', async (e) => {
      const inp = e.target.closest('[data-line] input');
      if (!inp) return;
      const item = inp.closest('[data-line]');
      const line = parseInt(item.dataset.line, 10);
      const next = Math.max(0, parseInt(inp.value || '0', 10));
      const cart = await changeCart({ line, quantity: next });
      renderCart(cart);
    });
  }

  /* -----------------------------------------------------
     8. PREDICTIVE SEARCH
  ----------------------------------------------------- */
  function initSearch() {
    const inp = document.querySelector('input[data-search-input]');
    if (!inp) return;
    const out = document.querySelector('[data-search-results]');
    let t = 0;
    inp.addEventListener('input', () => {
      clearTimeout(t);
      const q = inp.value.trim();
      if (!q) { if (out) out.innerHTML = ''; return; }
      t = setTimeout(async () => {
        try {
          const r = await fetch(`/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=6`);
          const data = await r.json();
          const items = data?.resources?.results?.products || [];
          if (!out) return;
          if (!items.length) {
            out.innerHTML = `<p class="muted small" style="padding:8px 0">no results for "${escapeHtml(q)}"</p>`;
            return;
          }
          out.innerHTML = items.map(p => `
            <a class="search-result" href="${p.url}">
              <img src="${p.image || ''}" alt="" />
              <div>
                <div class="search-result-name">${escapeHtml(p.title)}</div>
                <div class="search-result-meta">${escapeHtml(p.vendor || '')}</div>
              </div>
              <div class="search-result-meta">${p.price ? formatMoney(p.price * 100) : ''}</div>
            </a>
          `).join('');
        } catch (e) {}
      }, 220);
    });
  }

  /* -----------------------------------------------------
     9. PRODUCT VARIANTS (size + color picker on PDP)
  ----------------------------------------------------- */
  function initVariantPicker() {
    const pdp = document.querySelector('[data-product]');
    if (!pdp) return;
    let variants;
    try { variants = JSON.parse(pdp.querySelector('[data-product-json]')?.textContent || '[]'); } catch (e) { return; }
    const optionMap = {}; // index -> selected value
    pdp.querySelectorAll('[data-option]').forEach(el => {
      const idx = parseInt(el.dataset.optionIndex, 10);
      if (el.classList.contains('is-active')) optionMap[idx] = el.dataset.option;
    });

    const cta = pdp.querySelector('[data-add-to-cart]');
    const idInput = pdp.querySelector('[name="id"]');
    const priceEl = pdp.querySelector('[data-product-price]');
    const colorName = pdp.querySelector('[data-color-name]');

    function updateVariant() {
      const sel = Object.keys(optionMap).map(k => optionMap[k]);
      const match = variants.find(v => {
        for (let i = 0; i < sel.length; i++) {
          if (v.options[i] !== sel[i]) return false;
        }
        return true;
      });
      if (!match) {
        if (cta) { cta.textContent = 'unavailable'; cta.disabled = true; cta.classList.remove('btn-fill'); cta.classList.add('btn-outline','dark'); }
        return;
      }
      if (idInput) idInput.value = match.id;
      if (priceEl) priceEl.textContent = formatMoney(match.price);
      if (cta) {
        cta.disabled = false;
        if (match.available) {
          // Only show "+ add to bag" if a size has been picked (size is option 1 typically)
          const sizePicked = pdp.querySelector('[data-option-index="1"][data-option].is-active') || pdp.querySelector('[data-option-index="0"][data-option].is-active');
          if (pdp.dataset.requireSize === 'true' && !sizePicked) {
            cta.textContent = 'select size';
            cta.classList.remove('btn-fill');
            cta.classList.add('btn-outline','dark');
          } else {
            cta.textContent = '+ add to bag';
            cta.classList.add('btn-fill');
            cta.classList.remove('btn-outline','dark');
          }
        } else {
          cta.textContent = 'sold out';
          cta.disabled = true;
          cta.classList.remove('btn-fill');
          cta.classList.add('btn-outline','dark');
        }
      }
    }

    pdp.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-option]');
      if (!btn) return;
      e.preventDefault();
      if (btn.classList.contains('is-out') || btn.disabled) return;
      const idx = parseInt(btn.dataset.optionIndex, 10);
      pdp.querySelectorAll(`[data-option-index="${idx}"]`).forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      optionMap[idx] = btn.dataset.option;
      if (idx === 0 && colorName) colorName.textContent = btn.dataset.option;
      updateVariant();
    });

    updateVariant();
  }

  /* -----------------------------------------------------
     10. ACCORDION
  ----------------------------------------------------- */
  function initAccordion() {
    document.addEventListener('click', (e) => {
      const head = e.target.closest('.acc-h');
      if (!head) return;
      const row = head.closest('.acc-row');
      const body = row.querySelector('.acc-body');
      const icon = head.querySelector('.acc-icon');
      const isOpen = body.classList.contains('open');
      // close siblings
      row.parentElement.querySelectorAll('.acc-body.open').forEach(b => b.classList.remove('open'));
      row.parentElement.querySelectorAll('.acc-h .acc-icon').forEach(i => i.textContent = '+');
      if (!isOpen) {
        body.classList.add('open');
        if (icon) icon.textContent = '×';
      }
    });
  }

  /* -----------------------------------------------------
     11. SHOP VIEW TOGGLE (product / look)
  ----------------------------------------------------- */
  function initShopViewToggle() {
    const stream = document.querySelector('.shop-stream');
    if (!stream) return;
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-view]');
      if (!btn) return;
      const view = btn.dataset.view;
      stream.dataset.view = view;
      document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('is-active', b.dataset.view === view));
      // swap each card's primary image source between product/look variants
      document.querySelectorAll('[data-card-img]').forEach(img => {
        const next = img.dataset[view] || img.dataset.product || img.src;
        if (next && img.src !== next) {
          img.classList.remove('view-fade');
          void img.offsetWidth; // restart animation
          img.classList.add('view-fade');
          img.src = next;
        }
      });
    });
  }

  /* -----------------------------------------------------
     12. NEWSLETTER FORM (uses theme localized success message)
  ----------------------------------------------------- */
  function initNewsletter() {
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('.news');
      if (!form) return;
      // let Shopify handle real signup if action set; otherwise just give feedback
      if (!form.action || form.action === '' || form.action === window.location.href) {
        e.preventDefault();
        const inp = form.querySelector('input');
        if (inp && inp.value) {
          form.insertAdjacentHTML('afterend', '<p class="news-thanks">thanks — you\'re on the list.</p>');
          form.style.display = 'none';
        }
      }
    });
  }

  /* -----------------------------------------------------
     INIT
  ----------------------------------------------------- */
  function init() {
    initNav();
    initScrollProgress();
    initReveals();
    initParallax();
    initAnnoBar();
    initDrawers();
    bindCartActions();
    initSearch();
    initVariantPicker();
    initAccordion();
    initShopViewToggle();
    initNewsletter();
    // Pre-populate cart drawer state
    fetchCart().then(renderCart).catch(() => {});
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
