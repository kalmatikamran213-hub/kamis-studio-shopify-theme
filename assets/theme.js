/* =========================================================
   kamis:studio — theme interactions
   nav scroll · overlays (menu/search/bag/filter) · cart Ajax
   · predictive search · qty · accordion · variant picker
   · scroll reveal + parallax
   ========================================================= */
(function () {
  'use strict';
  var money = function (cents) {
    try { return window.Shopify.formatMoney(cents, window.theme.moneyFormat); }
    catch (e) { return 'Rs.' + Math.round(cents / 100).toLocaleString(); }
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- scroll lock ---------- */
  var lockCount = 0;
  function lock() { if (lockCount++ === 0) document.body.style.overflow = 'hidden'; }
  function unlock() { if (lockCount > 0 && --lockCount === 0) document.body.style.overflow = ''; }

  /* ---------- nav scroll state + progress ---------- */
  var nav = $('[data-header]');
  var progress = $('[data-scroll-progress]');
  var alwaysSolid = nav && nav.classList.contains('always-solid');
  function onScroll() {
    if (nav && !alwaysSolid) nav.classList.toggle('is-scrolled', window.scrollY > 80);
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- overlays ---------- */
  var openKind = null;
  function overlayEl(kind) { return $('[data-overlay="' + kind + '"]'); }
  function open(kind) {
    var el = overlayEl(kind);
    if (!el) return;
    close(true);
    openKind = kind;
    if (kind === 'menu' || kind === 'search') el.classList.add('is-open');
    else el.classList.remove('overlay-hidden');
    el.setAttribute('aria-hidden', 'false');
    lock();
    if (kind === 'search') { var i = $('[data-search-input]', el); if (i) setTimeout(function () { i.focus(); }, 120); }
    syncFab();
  }
  function close(silent) {
    if (!openKind) { return; }
    var el = overlayEl(openKind);
    if (el) {
      el.classList.remove('is-open');
      el.classList.add('overlay-hidden');
      el.setAttribute('aria-hidden', 'true');
    }
    openKind = null;
    unlock();
    syncFab();
  }
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open]');
    if (opener) { e.preventDefault(); open(opener.getAttribute('data-open')); return; }
    if (e.target.closest('[data-close]')) { e.preventDefault(); close(); return; }
    var ov = e.target.closest('.overlay');
    if (ov && e.target === ov) close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  /* ---------- bag fab ---------- */
  var fab = $('[data-bag-fab]');
  function syncFab() {
    if (!fab) return;
    var count = cartState ? cartState.item_count : 0;
    if (count > 0 && openKind !== 'bag') {
      fab.hidden = false;
      fab.textContent = 'bag · ' + count + ' · ' + money(cartState.total_price);
      fab.setAttribute('data-open', 'bag');
    } else { fab.hidden = true; }
  }

  /* ---------- cart ---------- */
  var cartState = null;
  var ROUTES = window.theme.routes;
  function setCount(n) { $$('[data-bag-count]').forEach(function (el) { el.textContent = '(' + n + ')'; }); }
  function fetchCart() {
    return fetch(ROUTES.cart + '.js', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (c) { cartState = c; renderCart(); return c; });
  }
  function cartAdd(id, qty) {
    return fetch(ROUTES.cart_add, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: id, quantity: qty || 1 })
    }).then(function (r) { return r.json(); }).then(function () { return fetchCart(); });
  }
  function cartChange(line, qty) {
    return fetch(ROUTES.cart_change, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ line: line, quantity: qty })
    }).then(function (r) { return r.json(); }).then(function (c) { cartState = c; renderCart(); return c; });
  }
  function renderCart() {
    var body = $('[data-cart-body]');
    setCount(cartState.item_count);
    syncFab();
    if (!body) return;
    var threshold = parseInt(body.getAttribute('data-threshold'), 10) || 2500000;
    var shopAll = ROUTES.cart.replace(/\/cart$/, '') + '/collections/all';
    if (cartState.item_count === 0) {
      body.innerHTML =
        '<div class="empty"><p>your bag is empty.</p>' +
        '<p class="muted">drop:one of spring:summer \'26 is now live.</p>' +
        '<a class="btn-outline dark" href="' + shopAll + '">shop drop:one</a></div>';
      return;
    }
    var toFree = threshold - cartState.total_price;
    var pct = Math.min(100, (cartState.total_price / threshold) * 100);
    var html = '<div class="ship-progress"><span class="small">' +
      (toFree > 0 ? 'add ' + money(toFree) + ' for free shipping' : '✓ free shipping unlocked') +
      '</span><div class="ship-bar"><div class="ship-fill" style="width:' + pct + '%"></div></div></div><ul class="bag-list">';
    cartState.items.forEach(function (it, i) {
      var img = it.image ? '<img src="' + it.image + '" alt="">' : '';
      var variant = (it.variant_title && it.variant_title.indexOf('Default') === -1) ? it.variant_title.toLowerCase() : '';
      html += '<li class="bag-item" data-line="' + (i + 1) + '">' +
        '<a href="' + it.url + '">' + img + '</a>' +
        '<div class="bag-meta"><div class="bag-name">' + it.product_title.toLowerCase() + '</div>' +
        '<div class="bag-variant">' + variant + '</div>' +
        '<div class="bag-price">' + money(it.final_price) + '</div>' +
        '<div class="qty-row"><button class="qty-btn" type="button" data-qty-down>−</button>' +
        '<span class="qty-num">' + it.quantity + '</span>' +
        '<button class="qty-btn" type="button" data-qty-up>+</button></div></div>' +
        '<button class="linklike small" type="button" data-remove>remove</button></li>';
    });
    html += '</ul><div class="bag-foot"><div class="bag-sub"><span>subtotal</span><span>' +
      money(cartState.total_price) + '</span></div>' +
      '<a class="btn-fill" href="/checkout">checkout</a>' +
      '<p class="muted small">shipping &amp; taxes calculated at checkout.</p></div>';
    body.innerHTML = html;
  }

  // add-to-cart forms (quick add + PDP)
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-quick-add], [data-product-form]');
    if (!form) return;
    e.preventDefault();
    // PDP: require a size before adding
    var proot = form.closest('[data-product]');
    if (proot && proot.getAttribute('data-require-size') === 'true' && !proot.querySelector('.pdp-size.is-active')) {
      var sizes = proot.querySelector('.pdp-sizes');
      if (sizes) { sizes.classList.remove('shake'); void sizes.offsetWidth; sizes.classList.add('shake'); }
      return;
    }
    var id = (form.querySelector('[name="id"]') || {}).value;
    if (!id) return;
    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'adding…'; }
    cartAdd(id, 1).then(function () {
      if (btn) { btn.disabled = false; btn.textContent = label; }
      open('bag');
    }).catch(function () { if (btn) { btn.disabled = false; btn.textContent = label; } });
  });

  // qty steppers + remove
  document.addEventListener('click', function (e) {
    var li = e.target.closest('.bag-item'); if (!li) return;
    var line = parseInt(li.getAttribute('data-line'), 10);
    var qEl = li.querySelector('.qty-num');
    var q = qEl ? parseInt(qEl.textContent, 10) : 1;
    if (e.target.closest('[data-qty-up]')) cartChange(line, q + 1);
    else if (e.target.closest('[data-qty-down]')) cartChange(line, Math.max(0, q - 1));
    else if (e.target.closest('[data-remove]')) cartChange(line, 0);
  });

  /* ---------- predictive search ---------- */
  var searchInput = $('[data-search-input]');
  if (searchInput) {
    var pop = $('[data-search-popular]');
    var res = $('[data-search-results]');
    var grid = $('[data-search-grid]');
    var countEl = $('[data-search-count]');
    var t;
    function runSearch(q) {
      q = q.trim();
      if (!q) { if (pop) pop.hidden = false; if (res) res.hidden = true; return; }
      if (pop) pop.hidden = true; if (res) res.hidden = false;
      fetch(ROUTES.search + '/suggest.json?q=' + encodeURIComponent(q) +
        '&resources[type]=product&resources[limit]=8')
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var items = (d.resources && d.resources.results && d.resources.results.products) || [];
          if (countEl) countEl.textContent = items.length + ' result' + (items.length === 1 ? '' : 's') + ' for “' + q + '”';
          if (!grid) return;
          if (!items.length) { grid.innerHTML = '<div class="empty" style="padding:48px 0"><p>nothing found for “' + q + '”.</p><p class="muted">try “hoodie”, “cap”, or “trouser”.</p></div>'; return; }
          grid.innerHTML = items.map(function (p) {
            var img = p.featured_image && p.featured_image.url ? '<img src="' + p.featured_image.url + '" alt="">' : '<img alt="">';
            return '<a class="search-card" href="' + p.url + '">' + img +
              '<div class="search-card-meta"><span class="search-card-name">' + p.title.toLowerCase() + '</span>' +
              '<span class="muted small">' + (p.type || '').toLowerCase() + '</span>' +
              '<span class="search-card-price">' + (p.price ? money(p.price) : '') + '</span></div></a>';
          }).join('');
        }).catch(function () {});
    }
    searchInput.addEventListener('input', function () { clearTimeout(t); var v = this.value; t = setTimeout(function () { runSearch(v); }, 180); });
    $$('[data-search-chip]').forEach(function (c) {
      c.addEventListener('click', function () { searchInput.value = c.textContent; runSearch(c.textContent); searchInput.focus(); });
    });
  }

  /* ---------- announcement dismiss ---------- */
  var anno = $('.anno');
  if (anno) {
    var key = 'kamis:anno';
    var closer = anno.querySelector('.anno-close');
    try { if (localStorage.getItem(key) === '1') anno.style.display = 'none'; } catch (e) {}
    if (closer) closer.addEventListener('click', function () { anno.style.display = 'none'; try { localStorage.setItem(key, '1'); } catch (e) {} });
  }

  /* ---------- accordions (PDP + FAQ) ---------- */
  document.addEventListener('click', function (e) {
    var h = e.target.closest('.acc-h, .faq-h'); if (!h) return;
    var body = h.nextElementSibling;
    var isOpen = h.getAttribute('aria-expanded') === 'true';
    h.setAttribute('aria-expanded', String(!isOpen));
    if (body) body.classList.toggle('open', !isOpen);
    var icon = h.querySelector('.acc-icon, .faq-icon'); if (icon) icon.textContent = isOpen ? '+' : '−';
  });

  /* ---------- card hover (quick add) ---------- */
  $$('[data-card]').forEach(function (card) {
    var quick = card.querySelector('.card-quick');
    card.addEventListener('mouseenter', function () { card.classList.add('is-hover'); if (quick) quick.classList.add('show'); });
    card.addEventListener('mouseleave', function () { card.classList.remove('is-hover'); if (quick) quick.classList.remove('show'); });
  });

  /* ---------- collection view toggle (product / look) ---------- */
  $$('.seg-btn[data-view]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var v = btn.getAttribute('data-view');
      $$('.seg-btn').forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      $$('.shop-stream').forEach(function (s) { s.setAttribute('data-view', v); });
    });
  });

  /* ---------- variant picker (PDP) ---------- */
  $$('[data-product]').forEach(function (root) {
    var dataEl = root.querySelector('[data-product-json]');
    if (!dataEl) return;
    var variants; try { variants = JSON.parse(dataEl.textContent); } catch (e) { return; }
    var selected = {};
    $$('.pdp-swatch[data-option-index], .pdp-size[data-option-index]', root).forEach(function (b) {
      if (b.classList.contains('is-active')) selected[b.getAttribute('data-option-index')] = b.getAttribute('data-option');
    });
    function match() {
      return variants.find(function (v) {
        return Object.keys(selected).every(function (i) { return v.options[i] === selected[i]; });
      });
    }
    function update() {
      var v = match();
      var idInput = root.querySelector('[name="id"]');
      var priceEl = root.querySelector('[data-product-price]');
      var cta = root.querySelector('[data-add-to-cart]');
      if (v) {
        if (idInput) idInput.value = v.id;
        if (priceEl) priceEl.textContent = money(v.price);
        if (cta) { cta.disabled = !v.available; if (!v.available) cta.textContent = 'sold out'; else if (cta.textContent === 'sold out') cta.textContent = 'add to bag'; }
      }
    }
    root.addEventListener('click', function (e) {
      var opt = e.target.closest('[data-option-index]'); if (!opt) return;
      var idx = opt.getAttribute('data-option-index');
      selected[idx] = opt.getAttribute('data-option');
      var group = opt.classList.contains('pdp-size') ? '.pdp-size' : '.pdp-swatch';
      $$(group + '[data-option-index="' + idx + '"]', root).forEach(function (b) { b.classList.toggle('is-active', b === opt); });
      var nameEl = root.querySelector('[data-color-name]');
      if (group === '.pdp-swatch' && nameEl) nameEl.textContent = (opt.getAttribute('data-option') || '').toLowerCase();
      update();
    });
    update();
  });

  /* ---------- scroll reveal ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var t = en.target;
        t.classList.add('is-in', 'is-visible');
        if (t.classList.contains('pg-grid')) t.classList.add('pg-visible');
        io.unobserve(t);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    $$('.sfx-reveal, .pg-reveal, [data-reveal], .pg-grid').forEach(function (el) { io.observe(el); });
  } else {
    $$('.sfx-reveal, .pg-reveal, [data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
    $$('.pg-grid').forEach(function (el) { el.classList.add('pg-visible'); });
  }

  /* ---------- parallax (lookbook + hero bg) ---------- */
  var parallaxEls = $$('[data-parallax]');
  if (parallaxEls.length) {
    var praf = 0;
    function ptick() {
      praf = 0;
      var vh = window.innerHeight;
      parallaxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var prog = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.setProperty('--img-parallax', (-prog * 40).toFixed(1));
      });
    }
    window.addEventListener('scroll', function () { if (!praf) praf = requestAnimationFrame(ptick); }, { passive: true });
    ptick();
  }

  /* ---------- init ---------- */
  fetchCart();
})();
