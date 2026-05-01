# SPEC: Build-Time Image Optimization

## 1. Problem

The site serves article images as unoptimized JPGs (1408x768 or 1920x960) at full resolution for ALL display contexts — including 300x168 card thumbnails. Lighthouse reports massive waste:

- **Mobile:** 5,176 KiB recoverable from images alone
- **Desktop:** 6,603 KiB recoverable
- **Home page total payload:** ~7.3MB, of which ~90% is images

The `<Image>` component from `astro:assets` is used in ArticleCard, HeroSection, and [slug].astro, but it receives **string paths** to `public/` images. Astro passes these through without any format conversion or resizing. The `inferSize={true}` prop only reads dimensions at build time — it does NOT optimize.

**Root cause:** Images in `public/images/` bypass Astro's image pipeline entirely. Only images imported from `src/` get optimized.

## 2. Goal

- Home page image payload drops from ~6MB to under 500KB (90%+ reduction)
- All article images served as WebP with responsive `srcset` matching actual display sizes
- Original JPGs remain at current URLs for external references (Pinterest `data-pin-media`, OG tags, RSS)
- Build time increase under 2 minutes
- Zero visual regression

**Out of scope:**
- Pin images (`public/images/pins/`) — external Pinterest references, different pipeline
- Logo optimization (separate small task)
- Cloudflare paid features (Polish, Image Resizing)
- Moving images out of `public/` (would break external URLs)
- Accessibility fixes (contrast, heading order) — separate task

## 3. Approach

Add a **build-time Sharp script** that generates WebP at 3 responsive sizes into `public/images/opt/`. Create an `<OptImage>` Astro component that renders `<picture>` with WebP srcset + JPG fallback. Replace current `<Image>` / `<img>` usage in all article image contexts.

**Why not Astro native `image()` schema migration:** Requires moving all images from `public/` to `src/assets/`, which breaks every external image URL (Pinterest, OG, RSS). Also requires updating 77+ article frontmatter files. High risk, same outcome.

**Why not Cloudflare Polish/Image Resizing:** Requires Pro plan ($20/mo). Build-time optimization is free and gives more control.

## 4. Responsive Size Rationale

Actual display widths across the site:

| Context | Rendered width | Used by |
|---------|---------------|---------|
| Sidebar card | ~298-336px | HeroSection must-reads |
| Grid card | ~298-336px | ArticleCard in grids |
| FreshToday card | ~400px | FreshToday component |
| Hero featured | ~662px | HeroSection featured |
| Article page hero | ~768px | [slug].astro |

Generated sizes:
- **400w** — sidebar cards, grid cards, FreshToday (1x), small mobile
- **800w** — hero cards, retina cards, article hero (1x)
- **1200w** — retina hero, large desktop

## 5. Plan

### Task 1: Add Sharp dev dependency

- **File:** `package.json`
- **Action:** `npm install --save-dev sharp`
- **Acceptance:** Sharp importable from Node
- **Verification:** `node -e "import('sharp').then(() => console.log('ok'))"`
- **Depends on:** none

### Task 2: Create image optimization script

- **File:** `scripts/optimize-images.mjs`
- **Action:** Node ESM script that:
  - Reads all `*-main.jpg` from `public/images/`
  - For each, generates WebP at widths 400, 800, 1200 → `public/images/opt/{slug}-main-{w}w.webp`
  - Skips if output file exists and is newer than source
  - Logs summary (processed / skipped / errors)
- **Acceptance:** Running produces correct WebP files at expected sizes
- **Verification:** `node scripts/optimize-images.mjs && node -e "import('sharp').then(async s => { const m = await s.default('public/images/opt/' + (await import('fs')).readdirSync('public/images/opt/')[0]).metadata(); console.log(m.format, m.width) })"`
- **Depends on:** Task 1

### Task 3: Add gitignore + prebuild hook

- **Files:** `.gitignore`, `package.json`
- **Action:** Add `public/images/opt/` to `.gitignore`. Add `"prebuild": "node scripts/optimize-images.mjs"` to package.json scripts.
- **Acceptance:** Optimized images are gitignored; `npm run build` runs optimization first
- **Verification:** `grep -q 'images/opt' .gitignore && grep -q prebuild package.json && echo ok`
- **Depends on:** Task 2

### Task 4: Create OptImage.astro component

- **File:** `src/components/OptImage.astro`
- **Action:** Component that renders `<picture>` with:
  - `<source type="image/webp" srcset="/images/opt/{name}-400w.webp 400w, ...-800w.webp 800w, ...-1200w.webp 1200w" sizes={sizes}>`
  - `<img src={original JPG} ...>` as fallback
  - Props: `src`, `alt`, `width`, `height`, `sizes`, `class`, `loading`, `decoding`, `fetchpriority`, plus passthrough `data-*` attrs
- **Acceptance:** Renders correct `<picture>` HTML
- **Verification:** `npm run build && grep -c '<picture>' dist/index.html`
- **Depends on:** none (just a component, doesn't need generated files to define)

### Task 5: Replace `<Image>` in ArticleCard.astro

- **File:** `src/components/ArticleCard.astro`
- **Action:** Replace `<Image inferSize>` with `<OptImage>`. Add `sizes="(max-width: 768px) 100vw, 320px"`.
- **Acceptance:** Card images render as `<picture>` with WebP srcset
- **Verification:** `npm run build && grep 'picture' dist/index.html | head -2`
- **Depends on:** Task 4

### Task 6: Replace `<Image>` in HeroSection.astro

- **File:** `src/components/HeroSection.astro`
- **Action:** Replace `<Image inferSize>` with `<OptImage>` for sidebar images. Use `sizes="(max-width: 768px) 100vw, 336px"`.
- **Acceptance:** Sidebar images render as `<picture>`
- **Verification:** `npm run build && grep -c 'picture' dist/index.html`
- **Depends on:** Task 4

### Task 7: Replace `<Image>` in [slug].astro

- **File:** `src/pages/[slug].astro`
- **Action:** Replace `<Image inferSize>` with `<OptImage>` for article hero. Use `sizes="(max-width: 768px) 100vw, 768px"`. Preserve all `data-pin-*` attributes.
- **Acceptance:** Article hero renders as `<picture>`
- **Verification:** `npm run build && grep 'picture' dist/best-high-protein-breads-healthy-sandwiches/index.html`
- **Depends on:** Task 4

### Task 8: Update FreshToday.astro client-side JS

- **File:** `src/components/FreshToday.astro`
- **Action:** Change `buildCard()` JS to render `<picture>` with WebP srcset instead of plain `<img>`. Compute opt path from `article.image` string.
- **Acceptance:** FreshToday cards use `<picture>` elements
- **Verification:** `npm run build && grep -c 'picture' dist/index.html` (count should include FreshToday cards)
- **Depends on:** none

### Task 9: Full build + verify

- **Action:** Full build from clean state, verify output
- **Acceptance:** Build succeeds, `<picture>` elements present, WebP files referenced, no broken images
- **Verification:** `npm run build && echo "Build exit: $?" && grep -c 'images/opt' dist/index.html && ls dist/images/opt/*.webp | wc -l`
- **Depends on:** Tasks 1-8

## 6. Out-of-scope

- **Pin images** — served to Pinterest at fixed URLs, different optimization story
- **Logo** — single file, could be SVG; separate 5-minute task
- **AVIF format** — better compression than WebP but slower to encode and less browser support; can add later
- **Lazy-loading strategy changes** — current lazy/eager split is correct
- **CDN-level caching headers** — Cloudflare handles this automatically for Pages
