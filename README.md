# kamis:studio — Shopify theme

A Shopify Online Store 2.0 theme that recreates the kamis:studio editorial e-commerce design. Every hero, banner, product grid and footer column is editable through the **Shopify theme editor**.

## Folder layout

```
shopify-theme/
├── assets/         theme.css, theme.js
├── config/         settings_schema.json, settings_data.json
├── layout/         theme.liquid
├── locales/        en.default.json
├── sections/       hero, banners, product grid, header, footer, PDP, collection…
├── snippets/       product-card, shop-card, feature-section, drawers…
└── templates/      index.json, product.json, collection.json + cart/search/page/404
```

## Getting it onto your store

### Option A · Upload as a zip (fastest)
1. From the project root, zip the theme folder:
   ```bash
   cd shopify-theme && zip -r ../kamis-studio-theme.zip .
   ```
2. In your Shopify admin: **Online Store → Themes → Add theme → Upload zip file**
3. Once uploaded, click **Customize** to open the theme editor.

### Option B · Develop with Shopify CLI (recommended for ongoing work)
1. Install Shopify CLI: `npm install -g @shopify/cli @shopify/theme`
2. From the `shopify-theme/` folder run:
   ```bash
   shopify theme dev --store=your-store.myshopify.com
   ```
   This gives you live-reload local previews against your real store data.
3. To push to your store as a draft theme: `shopify theme push --unpublished`

## What you can edit in Shopify admin

After installing, go to **Online Store → Themes → Customize**:

### Theme settings (top-level)
- **Colors** — bg / fg / muted / rule / card / accent
- **Typography** — wordmark weight
- **Brand** — favicon, tagline
- **Social** — Instagram / TikTok / Pinterest URLs

### Homepage sections (re-orderable, all optional)
- **Hero** — image / video / gradient palette, headline, subheadline, card text & button, marquee strip
- **Intro** — heading + body + button
- **Product grid** — pick a Shopify collection; falls back to striped placeholders if empty
- **Editorial banner** — full-bleed image/gradient + heading + position
- **Colophon** — studio note text

### Header / footer (sticky groups)
- **Announcement bar** — message + link + colour + dismissible toggle
- **Header** — wordmark, main menu picker, transparent-over-hero toggle
- **Footer** — wordmark, tagline, up to 4 menu/newsletter columns

### Product page
- Reads images, title, price, options (size / color), variants directly from Shopify
- Uses these metafields (in `kamis` namespace) when present:
  - `short_description` — single-line on the right pane
  - `details` — accordion body
  - `size_and_fit` — accordion body
  - `shipping` — accordion body
  - `fit` — single-line "model is …" text
  - `size_guide_url` — link

### Collection page
- 4-column product grid with a full-bleed editorial feature every Nth product
- Configure the `feature_every` value in the section settings

## Connecting your products

1. **Add products** in Shopify admin → Products
2. Make sure each product has:
   - At least 1 image (used for the card front)
   - A 2nd image (used for hover swap and editorial features)
   - `Size` and `Color` options if you want the variant picker on the PDP
3. **Add collections** for each homepage row (e.g. `new-in`, `hoodies`, `trousers`, `caps`)
4. In **Customize → Homepage**, open each *Product grid* section and pick its collection

## All button actions are wired up

| Button                   | Action                                            |
| ------------------------ | ------------------------------------------------- |
| `+ add to bag` / quick   | POSTs to `/cart/add.js`, opens drawer             |
| Bag drawer qty +/−       | POSTs to `/cart/change.js`                        |
| Bag drawer remove        | Sets quantity to 0                                |
| Bag fab (bottom right)   | Opens drawer                                      |
| `checkout`               | Goes to `/checkout`                               |
| Search input             | Predictive suggestions via `/search/suggest.json` |
| Search submit            | Goes to `/search?q=…`                             |
| Mobile menu (☰)          | Opens left-side drawer                            |
| Bookmark icons           | Toggle locally                                    |
| Filter button            | Opens filter drawer                               |
| Sort radios              | Reload with `?sort_by=…` in URL                   |
| Newsletter form          | POSTs to Shopify customer endpoint                |
| Announcement close ×     | Persists in `localStorage`                        |
| Variant pickers          | Update price + variant ID in cart form            |

## Empty states

If a section has no content set yet (no collection picked, no image uploaded, no products), it renders **striped SVG placeholders** with mono captions like `[ product · placeholder ]` so the layout never collapses.

## Browser support

- Modern Chrome / Safari / Firefox / Edge
- Vanilla ES2017+ JS (no build step) — fetches & async/await assumed
- Graceful degradation: if `IntersectionObserver` is missing, animated reveals show immediately
