# Indexation audit and fix — 2026-07-27/28

Scope: why `daily-life-hacks.com` shows ~132 indexed / 486 not indexed in Google
Search Console, what is structurally blocking indexation, and what changed.

Owned and modified here: `astro.config.mjs`, `public/_routes.json`,
`scripts/notify-indexnow.py`. Nothing under `src/data/articles/` or `src/pages/`
was touched. **Nothing was committed.**

Live probes were run against production on 2026-07-28 (all timestamps UTC).

---

## 0. Headline

**The "486 not indexed" number is roughly 78% noise, and the real problem is not
technical.**

Reconciling GSC's own coverage buckets against the site's actual canonical URL
set shows that ~356 of the 486 are non-canonical URLs — Pinterest alias slugs,
`-v{n}` pin variants, legacy WordPress paths and tag URLs — which the site
*correctly* keeps out of the index. They are supposed to be there.

What is left after that subtraction is ~94 canonical pages sitting in
**"Discovered – currently not indexed" (62)** and **"Crawled – currently not
indexed" (32)**. Those two buckets do not mean something is broken. They mean
Google fetched (or declined to fetch) the page and chose not to select it.

Every technical precondition for indexation passes, verified this session:

| Check | Result |
|---|---|
| Live status of all canonical sitemap URLs | **237/237 → HTTP 200**, zero redirects, zero 404s |
| Redirect chains | All single-hop (one 2-hop case, HTTP apex — §3.4) |
| Canonical tags | 265/267 pages, zero mismatches on indexable pages |
| `robots` meta on sitemap pages | 237/237 `index, follow, max-image-preview:large, max-snippet:-1` |
| Trailing slash consistency | 237/237, matches `trailingSlash: 'always'` |
| Sitemap URLs that 404 or redirect | **0** |
| Indexable pages missing from the sitemap | **0** |
| Thin / near-duplicate content | none found (prior sweep, re-confirmed) |
| `max-image-preview:large` (Discover eligibility) | 237/237 |

So the honest answer to "why is most of the site not indexed" is in §6, and it
is not a robots.txt bug.

---

## 1. The real numbers

### 1.1 What the site publishes

Fresh `npm run build` on the current working tree:

- `dist/sitemap-index.xml` — a sitemap **index** with exactly one child,
  `https://www.daily-life-hacks.com/sitemap-0.xml`
- `dist/sitemap-0.xml` — **240 URLs** (237 at the time of the live probe; three
  articles were added by another agent mid-session)
- Built HTML pages: **270**
- Source articles: **222** in `src/data/articles/`
- Alias slugs: **585** in `pipeline-data/slug-aliases.json`, all correctly kept
  out of the sitemap (`astro.config.mjs:42-44`)

The 270 − 240 = **30-page gap is entirely intentional noindex**, enumerated and
verified page by page:

`404.html`, `/contact/`, `/dashboard/`, `/deploy-proof/`, `/disclaimer/`,
`/privacy/`, `/terms/`, `/thank-you/`, and 22 `/embed/*` pages.

**Confirmed as requested, and left untouched:**

- The `publishAt` release gate (`src/content/release.ts`,
  `astro.config.mjs:59-67`) is working. It excludes future-dated articles from
  the sitemap. It is not suppressing anything today.
- `/embed/*` is noindex via both a meta tag and an `X-Robots-Tag` header set in
  `functions/[[path]].js:388`, and each embed canonicalises to its parent
  article. Correct and deliberate.
- `/dashboard/` is `noindex, nofollow`.
- The four legal/utility pages are `noindex, follow`.

### 1.2 Reconciliation against GSC

Indexation data that actually exists in the repo:

| Source | Date | Contents |
|---|---|---|
| `pipeline-data/audit/content-indexing-audit.sqlite` | 2026-06-29 | GSC coverage issues, coverage chart, 109 GSC page rows, 421 query rows, 231 Bing URL rows |
| `pipeline-data/audit/gsc-post-deploy-action-plan-2026-06-29.csv` | 2026-06-29 | 344 URLs with live status + bucket |
| `pipeline-data/audit/content-indexing-triage-report.csv` | 2026-06-29 | 340 triage candidates |
| `reports/growth/indexation-link-audit-2026-07-13.csv` | 2026-07-13 | 187 article link/canonical rows |
| `reports/growth/gsc-structured-data-indexing-2026-07-26.md` | 2026-07-26 | the 132/486 figure, dated 2026-07-10 |

The `gsc_coverage_issues` table (export dated 2026-06-29) is the key artefact.
It breaks the not-indexed total down:

| GSC reason | Pages | Is this a problem? |
|---|---:|---|
| Excluded by `noindex` tag | 167 | **No** — legacy. The router used to HTML-proxy alias URLs with `X-Robots-Tag: noindex, follow` (`PROXY_ROBOTS`, `functions/[[path]].js:16`). Those are now 301s. This bucket is decaying history. |
| Alternative page with proper canonical tag | 92 | **No** — this is canonicalisation working. |
| Page with redirect | 42 | **No** — alias and slashless URLs 301ing to canonical. Intended. |
| Not found (404) | 54 | **Mostly no** — legacy WP paths. Remediated in the 2026-07-26 pass. |
| Redirect error | 1 | **No** — verified single-hop today. |
| **Discovered – currently not indexed** | **62** | **This is the real number.** |
| **Crawled – currently not indexed** | **32** | **This is the real number.** |
| Server error (5xx) | 0 | — |
| **Total** | **450** | matches `gsc_coverage_chart` for 2026-06-12 (450 not indexed / 149 indexed) |

So:

```
486 not indexed
- 356  non-canonical by design (noindex 167 + alt-canonical 92 + redirect 42 + 404 54 + 1)
=  94  canonical pages Google fetched or discovered and declined to index
```

And on the other side:

```
132 indexed
+ 94 declined
= 226  ≈  the 237 canonical URLs the site published at that time
```

That reconciles to within rounding and export-date drift. **The correct way to
state the site's coverage is "132 of ~237 canonical URLs indexed (~56%)", not
"132 of 618".** The 618 denominator counts a URL universe of 585 aliases + 160
`-v{n}` router variants + ~40 legacy paths that nobody wants indexed.

### 1.3 What I could NOT verify

Being explicit, as required:

- **No live GSC access.** The 132/486 figure comes from
  `gsc-structured-data-indexing-2026-07-26.md`, which reports the Page indexing
  report as last updated **2026-07-10**. It is 18 days stale. There is no
  Search Console API credential and no fresher export anywhere in the repo.
- **No per-URL GSC index status.** The coverage export is aggregate counts by
  reason. GSC does not export the URL list per bucket, and none was saved. So I
  can state the *bucket totals* with evidence but I cannot name which 94
  specific pages are unindexed.
- **No Bing Webmaster Tools access,** and no Bing index export in the repo. The
  `bing_urls` table (231 rows, 2026-06-29) is a crawl-status export, not an
  index export; 127 of its 231 paths are canonical today and 104 are not.
- **`site:` queries were not attempted.** Prior sessions recorded bot
  challenges from both Bing and DuckDuckGo; I did not try to work around them.
- **GSC impressions are a floor, not a census.** 95 distinct normalised paths
  have ever recorded an impression, of which only 69 are canonical today.
  168 of the current canonical URLs have zero impressions in the export — that
  is consistent with, but does not prove, non-indexation.

**The one 10-minute job that would close this out** and that I could not do:
export GSC → Page indexing → each not-indexed reason → the URL list, and Bing
WMT → Site Explorer → Indexed URLs, then diff both against `dist/sitemap-0.xml`.

---

## 2. Live verification — actual status codes

### 2.1 All canonical URLs

Every one of the **237 live sitemap URLs** fetched individually, redirects not
followed:

```
Counter({200: 237})
```

**237/237 → `200`. Zero redirects, zero 404s, zero `X-Robots-Tag: noindex` on
any canonical URL.** This is the full set, not a 40-URL sample.

### 2.2 Key endpoints

| URL | Status | Notes |
|---|---|---|
| `/robots.txt` | 200 | `Sitemap:` points at the index — correct |
| `/sitemap-index.xml` | 200 | one child, resolves |
| `/sitemap-0.xml` | 200 | 237 URLs live |
| `/rss.xml` | 200 | `x-robots-tag: noindex` (deliberate) |
| `/bfae002c508721fed055bda08154ede6.txt` | 200 | IndexNow key, body matches |
| `/data/` | **200** | the build blocker from the 2026-07-26 report is **fixed and deployed** |
| `/embed/one-dollar-fiber-what-it-buys/` | 200 | `x-robots-tag: noindex` |
| `/license/` | 200 | still live, `x-robots-tag: noindex`, `Age: 123765` — a stale cached artefact, not in the current build |
| `/methodology/`, `/nutrition/`, `/recipes/`, `/tips/` | 200 | |
| `/dashboard/`, `/contact/`, `/privacy/`, `/terms/`, `/disclaimer/`, `/thank-you/` | 200 | all noindex by meta tag |
| `/data/api-index-v1.json` | 200 | |
| `/definitely-not-a-real-page/` | 404 | correct |

`/deploy-proof/` reports `data-commit="d0a5fba80abbc5776f1b8bad05825ee2afc671fb"`
— production is current. The "main has not been deployable" headline from
`bing-indexing-2026-07-26.md` §0 **no longer applies**: `src/content/datasets.ts`
is now tracked (`git ls-files src/content/` confirms).

### 2.3 Redirect chains

| Request | Chain | Hops |
|---|---|---|
| `/lentils-vs-chicken-breast-protein-cost` (no slash) | 301 → 200 | 1 |
| `https://daily-life-hacks.com/...` (apex) | 301 → 200 | 1 |
| `http://www.daily-life-hacks.com/...` | 301 → 200 | 1 |
| `https://daily-life-hacks.com/` (apex root) | 301 → 200 | 1 |
| `/tag/pizzanight/` (legacy) | 301 → 200 | 1 |
| `/nutrition/1/` (legacy pagination) | 301 → 200 | 1 |
| `/${p.slug}` (malformed legacy) | 410 | 0 |
| **`http://daily-life-hacks.com/`** | **301 → 301 → 200** | **2** |

One two-hop chain: HTTP-on-apex takes an edge HTTP→HTTPS hop and then the
apex→www hop. It is cosmetic (no modern crawler starts there) and fixing it
means a Cloudflare edge rule, not a repo change. Noted, not fixed.

---

## 3. Structural blockers — file and line

### A. Real, and costing something

**A1. Twelve live articles have a 404 hero image.**
Verified live: `https://www.daily-life-hacks.com/images/{slug}-main.jpg` returns
**HTTP 404** for all twelve. Each declares `image: "/images/{slug}-main.jpg"` in
frontmatter with a written `imageAlt`, and the file is simply absent from
`public/images/`. The rendered `<img>` and the `og:image` meta tag both point at
the missing file.

```
chicken-thighs-vs-breast-protein-cost      lentils-vs-chicken-breast-protein-cost
eggs-vs-greek-yogurt-protein-cost          peanut-butter-vs-almonds-protein-cost
frozen-vs-fresh-vegetables-fiber-cost      popcorn-vs-almonds-fiber-cost
ground-beef-vs-beans-protein-cost          tofu-vs-chicken-protein-cost
how-much-protein-in-peanut-butter          whole-wheat-flour-vs-quinoa-fiber-cost
how-much-rice-and-beans-per-person-per-day
how-to-save-money-on-groceries-at-walmart
```

Impact: these pages are ineligible for Google Discover (which requires a large
image), invisible in Google Images, produce a blank social/Pinterest preview,
and carry an `Article.image` pointing at a 404. Discover is flagged in the
project's own traffic sweep (C1) as the highest-ceiling channel available to a
zero-authority site; this silently disqualifies twelve pages from it.

Not fixed here — `src/data/articles/` and image generation are owned elsewhere.
Filed as a separate task.

**A2. `notify-indexnow.py` could not submit anything when the secret was unset.**
`scripts/notify-indexnow.py:328` (before this change):

```python
key = os.environ.get("INDEXNOW_KEY", DEFAULT_INDEXNOW_KEY).strip()
```

GitHub Actions sets an **empty** environment variable for a secret that is not
configured. `os.environ.get(name, default)` therefore returns `""`, not the
default — the hardcoded fallback never fires — and the script exits 1 with
"INDEXNOW_KEY is empty".

This is not theoretical. Three runs of `.github/workflows/indexnow-sitemap-diff.yml`
failed exactly this way, each with a URL in hand:

| Run | Date | Outcome |
|---|---|---|
| 30238449228 | 2026-07-27 04:57 | `eligible canonical pages: 1` → exit 1 |
| 30238655318 | 2026-07-27 05:02 | `eligible canonical pages: 1` → exit 1 |
| 30256943498 | 2026-07-27 10:09 | `eligible canonical pages: 1` → exit 1 |

The runs that "succeeded" had **zero** candidates and returned before reaching
the key check. An `INDEXNOW_KEY` repo secret was created at
**2026-07-28T03:37:55Z** (one minute before run 30325989786, the first genuine
`status=200 ok=True`), which masks the bug rather than removing it.

**Fixed** — `scripts/notify-indexnow.py:328-334` now treats an empty value as
unset:

```python
key = (os.environ.get("INDEXNOW_KEY") or "").strip() or DEFAULT_INDEXNOW_KEY
```

11/11 tests in `tests/test_notify_indexnow.py` still pass.

**A3. The IndexNow snapshot cold-started and seeded 236 URLs as
"already submitted" without ever submitting them.**
`.github/workflows/indexnow-sitemap-diff.yml` was described in the previous
report as "written but never run". It is committed and **has** run 11 times.
Its first run, 30236502430 (2026-07-27 04:13), logged:

```
Cache not found for input keys: indexnow-sitemap-30236502430, indexnow-sitemap-
Cold start: seeding snapshot with 236 URLs, submitting none.
```

That is the documented cold-start behaviour (`scripts/indexnow-sitemap-diff.py:151-157`)
and it is the right call for preventing a full-site blast on cache loss — but
the consequence is that the system now believes all 236 URLs were submitted when
none of them were, through this path. Nothing would ever re-offer them.

**This is the gap the backfill in §5 closes.**

**A4. The same cold-start behaviour is a permanent silent-loss risk.**
The snapshot lives in a GitHub Actions cache
(`.github/workflows/indexnow-sitemap-diff.yml:85-91, 132-137`). Actions caches
are evicted after 7 days without a read. Every eviction re-triggers a cold start,
which seeds and submits nothing — so any URL added between the eviction and the
next run is silently never announced. A snapshot committed to the repo (or an R2
object) would be durable; the cache is not. Recommended, not changed — it is a
workflow-design decision.

### B. Worth fixing, not blocking

**B1. `public/_headers:27-28` scopes `/dashboard` without a trailing slash.**
The built page is `/dashboard/`. Confirmed live: `/dashboard/` returns **no**
`x-robots-tag` header. Harmless today because
`src/pages/dashboard.astro` sets the meta tag and `astro.config.mjs:48` keeps it
out of the sitemap, so the page is not exposed — but the header rule does
nothing. `/dashboard*` would fix it. Not changed (`public/_headers` scoping for
a `src/pages/`-owned page).

**B2. Dead code in the edge router.** `functions/[[path]].js:131-167` defines
`applyProxyRobotsPolicy()` — 45 lines including an `HTMLRewriter` path — and
nothing calls it. Leftover from the HTML-proxy era replaced by 301s at
`functions/[[path]].js:568-572`. Harmless at runtime, but re-wiring it by
mistake would recreate soft-duplicate URLs, which is the exact thing that
generated the 167-page `noindex` bucket in §1.2. Still present; flagged again.

**B3. Every HTML page view is logged twice.** `functions/[[path]].js:508-514`
inserts a server-side `page_view` into `funnel_events`, and
`src/layouts/BaseLayout.astro:397` fires a client-side `page_view` to
`/api/event` → the same `funnel_events` table
(`functions/api/event.js:41-42`). Human visits are double-counted; bot visits
are counted once (server only). Not an indexation issue, but it means every
Googlebot and Bingbot HTML fetch performs a D1 write. Out of scope, noted.

**B4. `/license/` is live but not in the build.** Returns 200 with
`Age: 123765` and `Cache-Control: public, s-maxage=604800` — a week-long edge
cache of a page removed in commit `207442c`. It is `noindex` so it cannot enter
the index, and it will age out. No action.

**B5. Two competing image sitemaps now exist.** See §4.3.

**B6. Eight articles have zero *contextual* inbound links.**
`npm run verify:internal-links` reports `rendered orphans=0` (nothing is
unreachable) but `contextual inbound=0` for eight articles — they are reached
only from listing/grid modules, never from inside another article's prose:

```
how-much-rice-and-beans-per-person-per-day   grocery-budget-for-one-person-per-month
how-much-protein-in-peanut-butter            how-much-protein-in-a-can-of-beans
how-much-protein-in-two-eggs                 best-high-fiber-foods-ranked-by-fiber-content
how-to-save-money-on-groceries-at-walmart
how-to-grocery-shop-for-a-month-on-a-budget
```

This matters here more than it would elsewhere. With essentially no external
links, internal links are the only PageRank the site has to distribute, and
"Discovered – currently not indexed" (the 62-page bucket in §1.2) is exactly the
state a weakly-linked URL sits in. These are all recently added articles, so
this may simply be the linking pass not having run yet. Owned elsewhere
(`src/data/articles/`); flagged, not fixed.

### C. Checked and explicitly clean

- **Canonical tags:** 265/267 pages carry exactly one `<link rel="canonical">`.
  Zero mismatches on indexable pages. The 22 `/embed/*` pages canonicalise to
  their parent article (correct); `/404.html` canonicalises to `/404/`
  (harmless, noindex). The two pages without a canonical (`/dashboard/`,
  `/deploy-proof/`) are `noindex, nofollow`.
- **Trailing slashes:** 237/237 consistent.
- **Index bloat:** none. No paginated archives are indexable (`/nutrition/1/`
  301s), `/tag/*` is excluded at `astro.config.mjs:104`, and alias/`-v{n}` URLs
  are runtime 301s that never build as HTML (`npm run verify:routing`:
  `leakedAliasHtml=0`).
- **Pages missing from the sitemap that should be in it:** zero.
- **`publishAt` release gate:** working, currently suppressing nothing.
- **robots.txt:** 12 named crawler groups, each repeating the `Disallow` set
  (the non-merging-precedence fix from 2026-07-26 is in place and deployed).

---

## 4. Changes made

### 4.1 `public/_routes.json` — crawl and cost efficiency

**What it cost before.** `include: ["/*"]` with only nine exclusions meant every
request for a static CSV, JSON, PDF, JS file, icon, the RSS feed, `llms.txt`,
`openapi.json` and the IndexNow key file invoked the catch-all Pages Function.

Measured on production, median of 5 requests each, using the `Server-Timing:
cfOrigin` value the edge reports:

| Path | Routed via Function? | `cfOrigin` | `cf-cache-status` |
|---|---|---:|---|
| `/robots.txt` | no (excluded) | **3 ms** | REVALIDATED |
| `/logo.png` | no (excluded) | **3 ms** | REVALIDATED |
| `/bfae0…txt` (IndexNow key) | yes | 12 ms | DYNAMIC |
| `/rss.xml` | yes | 12 ms | DYNAMIC |
| `/llms.txt` | yes | 10 ms | DYNAMIC |
| `/openapi.json` | yes | 10 ms | DYNAMIC |
| `/data/api-index-v1.json` | yes | 10 ms | DYNAMIC |
| `/site.webmanifest` | yes | 10 ms | DYNAMIC |
| `/icon-512.png` | yes | 6 ms | REVALIDATED |
| `/downloads/…pdf` | yes | 6 ms | REVALIDATED |
| `/js/dashboard/api.js` | yes | 6 ms | REVALIDATED |

So the Function adds roughly **+3 to +9 ms of origin time** to every static
asset, and it is a per-request Worker invocation that is billed and can cold
start.

**Honest assessment of the crawl-budget claim: it is not a crawl-budget fix.**
Google documents crawl budget as a concern for sites above ~1M pages, or 10k+
with rapidly changing content. This site has 240. The project's own traffic
sweep already flags crawl budget as a `MYTH` at this scale
(`reports/growth/traffic-sweep/01-search-engines.md`, A9). Excluding static
assets will not cause a single extra page to be indexed. It is a latency and
cost improvement, and it makes the published data files — the assets the site
asks journalists and researchers to fetch — faster and less dependent on a
Worker. That is the whole justification.

**Change applied** — `public/_routes.json` exclusions extended from 9 to 22:

```
+ /js/*            + /downloads/*    + /llms.txt         + /openapi.json
+ /data/*          + /icon-*         + /site.webmanifest + /rss.xml
+ /logo*           + /popup-image.jpg
+ /apple-touch-icon.png              + /git-deploy-smoke.txt
+ /bfae002c508721fed055bda08154ede6.txt
```

**Safety review, each point checked:**

- **No alias collision.** All 585 alias slugs and 160 `-v{n}` variants were
  checked against every new prefix (`/data/`, `/downloads/`, `/js/`, `/logo`,
  `/icon-`, and the exact filenames): **zero matches**, and no alias slug
  contains a dot. So no pin destination can be shadowed.
- **The pin-destination 301 map still loads.** `functions/[[path]].js:233-236`
  fetches `/data/pin-destinations-flat.json` through `env.ASSETS.fetch()`. That
  is the Worker's internal asset binding; `_routes.json` only governs whether
  the Worker is invoked for an *inbound* request, so an excluded path is still
  readable from inside the Worker. The 301 map is unaffected.
- **`_headers` still applies.** It is enforced by the Pages asset server, which
  is precisely what now serves these paths — so `X-Robots-Tag: noindex` on
  `/rss.xml` (`public/_headers:33-34`) and `Access-Control-Allow-Origin: *` on
  `/data/*` (`public/_headers:38-39`) are preserved.
- **`/data` without a trailing slash still 301s.** `/data/*` does not match
  `/data`, so that request still reaches the Function and gets its redirect.
- **Accepted trade-off:** `/data/` (the hub page) loses its *server-side*
  `funnel_events` row. Human visits are still logged client-side via
  `BaseLayout.astro:397` → `/api/event`, so the only loss is bot page views on
  one page — and per B3 that removes a double-count rather than data.
- **Rule count:** 22, well under Cloudflare's 100-rule limit.

Verification: see §7.

### 4.2 `astro.config.mjs` — lastmod and priority

**`lastmod` was already driven by real `dateModified`** (`loadArticleLastModifiedDates()`,
falling back to `date`), not build time — that part was correct before I
arrived. 219 of 237 URLs had it. The 18 without were the home page, the category
hubs and the static/tool pages.

Changed:

- **Hub pages now carry a real `lastmod`.** `/`, `/nutrition/`, `/recipes/`,
  `/tips/`, `/guides/`, `/research/` are generated *from* the article set, so
  their honest last-modified date is the newest article `dateModified` in the
  build. Now 228/240 URLs have a `lastmod`.
- **The remaining 12 deliberately have none.** `/about/`, `/methodology/`,
  `/api-docs/`, `/data/` and the 7 `/tools/*` pages get no `lastmod`, because we
  genuinely do not know when they last meaningfully changed. Google discards a
  `lastmod` it judges unreliable, and stamping build time on a page that did not
  change is exactly how that judgment gets triggered. Omitting is the honest
  option.
- **`priority` added**, reflecting the site's own hierarchy, read from the
  content registries so it cannot drift:

  | Priority | Count | What |
  |---:|---:|---|
  | 1.0 | 1 | home |
  | 0.9 | 4 | parent pillars, from `src/content/clusters.ts` |
  | 0.8 | 28 | category hubs, `/data/`, and dataset articles from `src/content/datasets.ts` |
  | 0.7 | 7 | `/tools/*` calculators |
  | 0.6 | 196 | articles |
  | 0.5 | 4 | `/about/`, `/methodology/`, `/api-docs/`, `/tools/` |

  **Expected effect: zero.** Google has stated publicly that it ignores both
  `priority` and `changefreq`; Bing treats priority as a weak hint at most. This
  documents our hierarchy at no cost. It is not a ranking lever and should not
  be reported as one. `changefreq` was deliberately **not** added — it is pure
  noise.

### 4.3 Image sitemap

234 source images and a real Google Images opportunity (traffic sweep B3/B4)
justify one. Implemented **inline** in `sitemap-0.xml` rather than as a separate
file: Google's documentation explicitly allows image extension tags inside a
normal sitemap, and at 240 URLs / 105 KB (limits: 50,000 URLs / 50 MB) a second
sitemap would add a crawl target for no benefit.

Result: **259 `image:image` entries across 210 URLs**, each with `image:loc` and,
where `imageAlt` exists, `image:caption`.

Two deliberate design choices:

- **Images are read from the article markdown, not the rendered HTML.** The
  rendered page also contains related-article thumbnails belonging to *other*
  pages; listing those would tell Google Images that one photo lives on twenty
  URLs. Reading frontmatter `image` + body `/images/` references gives an exact
  page→image mapping.
- **An image that does not exist in `public/` is never listed.** This is what
  surfaced blocker A1: the loader silently skipped 12 articles, which is how the
  404 hero images were found. The sitemap fails closed rather than advertising
  a 404 to Google Images.

**Conflict to resolve (B5):** another agent shipped
`scripts/build-image-sitemap.mjs` + a checked-in `public/image-sitemap.xml`,
and added a second `Sitemap:` line to `public/robots.txt`. Its own header says:

> "Folding the same data into the existing sitemap-index is strictly better (one
> fewer file, already referenced from robots.txt) … This file is the standalone
> version that ships without touching anything outside scripts/ and public/."

That constraint no longer applies — `astro.config.mjs` is owned here and the
fold-in is now done. The standalone file is also a **static snapshot** that goes
stale whenever an article changes, whereas the inline version regenerates on
every build. Recommendation: delete `public/image-sitemap.xml`,
`scripts/build-image-sitemap.mjs` and the second `Sitemap:` line in
`public/robots.txt`. **Not done here** — those are that agent's files.

One genuinely good catch in their script worth keeping: `/images/{slug}-ingredients.jpg`
is injected client-side by `src/pages/[slug].astro`, so it is invisible to a
non-rendering crawler. That is exactly what image sitemaps are for. It is picked
up by the inline version only where the markdown references it.

---

## 5. IndexNow — submission and freshness

### 5.1 Review of the existing machinery

- `scripts/notify-indexnow.py` — the audited submission path. Fails closed: a
  URL is eligible only if it canonicalises correctly *and* appears in the
  sitemap the same build produced. Requires absolute URLs. Sound design; one
  real bug found and fixed (A2).
- `scripts/indexnow-sitemap-diff.py` — state-based sitemap diff. Well built:
  cold start seeds without submitting, a stale snapshot over `--max-urls` (60)
  refuses and exits 1, malformed sitemap fails closed.
- `.github/workflows/indexnow-sitemap-diff.yml` — **the previous report's claim
  that this was "written but never run" is wrong.** It is committed and has run
  11 times (2026-07-27 04:13 → 2026-07-28 03:27): 7 success, 3 failure, 1
  skipped. The 3 failures are A2. Its first run cold-started (A3).

It also still duplicates the `Notify IndexNow` step in
`.github/workflows/deploy-cloudflare-pages.yml:95-101`, which its own header
says should be deleted on adoption. Both paths can now submit. Not changed —
that is a workflow-ownership decision.

### 5.2 The backfill — real HTTP responses

Run against the **live** sitemap fetched from production, never the local build,
so a URL that had not deployed could not be submitted. Every URL was re-verified
`200` immediately before submission.

```
live sitemap-index children: ['https://www.daily-life-hacks.com/sitemap-0.xml']
live canonical URLs: 237
live status: Counter({200: 237})
submitting: 238            (237 canonical + /rss.xml)
```

Dry run first — 238 eligible, 0 skipped, 0 rejected. Then the real submission,
in three batches through `notify-indexnow.py`:

| Batch | URLs | Response |
|---|---:|---|
| 0 | 80 | **`status=200 ok=True`** |
| 1 | 80 | **`status=200 ok=True`** |
| 2 | 78 | **`status=200 ok=True`** |

**Total: 238 URLs submitted, HTTP 200 on all three, 0 skipped, 0 rejected.**
Endpoint `https://api.indexnow.org/indexnow`; under the IndexNow spec `200 OK`
means "URL submitted successfully". Response bodies were empty.

Key file verified before submitting:
`/bfae002c508721fed055bda08154ede6.txt` → `200`, body
`bfae002c508721fed055bda08154ede6`, matching `DEFAULT_INDEXNOW_KEY`. (Note: it
returns **403** to the default `python-urllib` User-Agent — Cloudflare blocks
that UA. It returns 200 to a browser UA *and to a bingbot UA*, so IndexNow key
validation is unaffected. This tripped up my own first check and is worth
knowing before anyone else reports it as an outage.)

Full machine-readable ledger: `reports/growth/indexnow-backfill-2026-07-28.json`
— per batch, the exact URL list and the HTTP response.

**Every canonical URL the site publishes has now been submitted to IndexNow at
least once, with a recorded response.** That was not previously true and could
not previously be demonstrated.

Caveat, stated plainly: IndexNow is a **Bing-family** protocol (Bing, Yandex,
Naver, Seznam, Yep). **Google does not participate.** This backfill cannot and
will not affect the 132/486 Google numbers. It matters for Bing and the engines
that resell its index, and for the Copilot/ChatGPT-search grounding surfaces.

---

## 6. The honest diagnosis

Ranked by confidence, with the evidence.

### 1. The site is indexed-eligible, and Google is choosing not to select most of it. (High confidence)

This is the answer, and it is the uncomfortable one.

**Evidence.** Every technical precondition passes: 237/237 canonical URLs return
200 with no redirect, every one is `index, follow`, every one is in a valid
sitemap referenced from robots.txt, canonicals are self-referential with zero
mismatches, there are no orphans, no thin pages, no near-duplicates, no chains,
no index bloat. After subtracting the 356 non-canonical URLs that GSC counts as
"not indexed" *because the site correctly excludes them*, what remains is 62
"Discovered – currently not indexed" and 32 "Crawled – currently not indexed".

Those two labels are Google's way of saying the pages are fine and it does not
consider them worth the index slot. "Discovered – currently not indexed" means
Google knows the URL and has not spent a crawl on it. "Crawled – currently not
indexed" means it fetched the page, evaluated it, and declined. Neither is a
configuration error, and neither has a technical fix.

The driver is site-level authority and quality assessment. The site has, by its
own audits: no backlinks worth the name, a pseudonymous single author, no brand
query volume, and YMYL-adjacent food/nutrition content — the hardest category
post-HCU. 2,325 impressions and **5 clicks** total in the GSC export. Google is
not withholding indexation because of a header; it is withholding it because
nothing external vouches for the domain.

**What this means practically.** No further technical SEO work will move this
number. The levers that would are the ones the project's own traffic sweep
already identifies as `WORKS`: original data as a link asset (A12), internal
linking (A5), pillar-and-spoke (A4), and getting the dataset in front of people
who cite things (C6, Dataset Search). Indexation is downstream of authority, not
upstream of it.

### 2. The 486 figure has been read wrong, and that misreading has cost time. (High confidence)

~78% of "not indexed" is the Pinterest alias system working as designed: 585
alias slugs plus 160 `-v{n}` variants, all correctly 301ing, plus legacy
WordPress paths correctly 404/410ing, plus 22 embeds correctly noindexed. GSC
counts every one of those as "not indexed" because that is literally true — they
are not, and must not be, in the index.

The number to track is **canonical URLs indexed / canonical URLs published**
(~132/237 ≈ 56%), and it should be read from the sitemap-submitted view in GSC,
not the site-wide view. Chasing the 486 down is chasing a number that is
*supposed* to be large and that will grow every time a pin is created.

### 3. Twelve articles are disqualified from the image-driven surfaces. (High confidence — directly verified)

Blocker A1: twelve live articles reference a hero image that 404s. This does not
stop indexation, but it removes those pages from Google Discover eligibility
(large image required), from Google Images, and from producing a usable social
preview. Discover is the single highest-ceiling channel available to a
zero-authority site per the project's own research. Directly verified with live
404s, and cheap to fix.

### 4. Bing, not Google, was the fixable indexation problem — and it was genuinely broken. (Medium-high confidence)

Until this session, the IndexNow pipeline had a submission path that could not
submit (A2: three logged failures) and a snapshot that had marked 236 URLs
submitted without submitting them (A3: the cold-start log). The recorded Bing
baseline shows **~3,700 IndexNow URLs submitted, 0 indexed, 9 crawled**, and a
sitemap last crawled **2026-05-15**. Both defects are now fixed and all 238 URLs
have been submitted with recorded 200s. Bing is the channel where a
zero-authority site can realistically rank, so this is the highest-value
*technical* fix available — but its effect will show up in Bing, not in the
132/486 Google numbers.

### 5. Crawl budget is not a factor. (High confidence)

240 URLs. Google scopes crawl budget guidance to 1M+ page sites. The
`_routes.json` change in §4.1 is a latency and cost improvement worth making on
its own merits; presenting it as an indexation fix would be false, and I am not
presenting it as one.

### What I would do next, in order

1. Fix the 12 missing hero images (A1). Cheap, verified, unblocks Discover.
2. Export the actual per-URL lists from GSC and Bing WMT (§1.3). It is the one
   number nobody has, and it is 10 minutes with credentials.
3. Resolve the duplicate image sitemap (§4.3) and the duplicate IndexNow
   workflow path (§5.1).
4. Move the IndexNow snapshot off the Actions cache (A4).
5. Then stop doing technical SEO on this site and go get one external link.
   Diagnosis #1 says everything else is downstream of that.

---

## 7. Verification

| Check | Result |
|---|---|
| `npm run build` | **PASS** — exit 0, 275 pages |
| `npm run verify:routing` | **PASS** — 227 canonical pages; 585 pin destinations runtime-301 only; `leakedAliasHtml=0`, `unmigratedVariants=0` |
| `npm run verify:pin-destinations` | **PASS** — 225 pin destination URLs verified (canonical_article=25, pin_destination=147, version_fallback=53) |
| `npm run verify:internal-links` | **PASS** — 9,687 anchors across 275 files; rendered orphans=0 |
| `python -m pytest tests/test_notify_indexnow.py` | **PASS** — 11 passed |
| Sitemap well-formed XML | **PASS** — `sitemap-0.xml` and `sitemap-index.xml` both parse |
| Sitemap schema conformance | **PASS** — 0 unexpected children, 0 child-order violations, all `lastmod` W3C-datetime, all `priority` in [0.0, 1.0], all `image:loc` absolute and on-host, 0 duplicate `loc`, 0 wrong-host, 0 missing trailing slash |
| IndexNow backfill | **PASS** — 238 URLs, 3× HTTP 200 |

### 7.1 Runtime proof for the `_routes.json` change

`verify:routing` and `verify:pin-destinations` are **static** checks over `dist/`
and the JSON maps — neither one exercises `_routes.json`. Passing them does not
prove the exclusions are safe. So the change was also tested at runtime against
`wrangler pages dev dist --port 8791` with the real `ROUTES_KV` and `DB`
bindings bound:

| Runtime check | Result |
|---|---|
| Pin destination 301s (45-URL sample across the full 585, head/middle/tail) | **45/45 correct single-hop 301s to the canonical article, 0 failures** |
| `-v{n}` version fallback (`…-v4`, `…-v2`) | 301 → canonical, correct |
| Newly excluded paths still serve | 17/17 → 200 (`/data/*.json`, `/data/*.csv`, `/data/`, `/downloads/*.pdf`, `/js/*`, `/rss.xml`, `/llms.txt`, `/openapi.json`, `/site.webmanifest`, icons, IndexNow key, `/robots.txt`, both sitemaps) |
| `/data/pin-destinations-flat.json` readable | 200, 48,230 b — the map the 301s depend on |
| Paths that must still reach the Function | `/data` → 301 `/data/`; `/tag/pizzanight/` → 301; `/nutrition/1/` → 301; `/${p.slug}` → 410; unknown slug → 404; slashless article → 301; article → 200 |

**`_headers` still applies to excluded paths — proved on production, not assumed.**
`wrangler pages dev` does not implement `_headers` at all (paths excluded *before*
this change show the same gap), so the local run could not answer this. Production
can: `/_astro/*` has been in the exclude list all along and still returns its
path-specific rule `Cache-Control: public, max-age=31536000, immutable`
(`public/_headers:30-31`), and `/images/*` returns the sitewide `/*` security
headers. Path-specific `_headers` groups therefore survive Function exclusion, so
`X-Robots-Tag: noindex` on `/rss.xml` (`public/_headers:33-34`) and
`Access-Control-Allow-Origin: *` on `/data/*` (`public/_headers:38-39`) are
preserved by this change.

### 7.2 Note on concurrent agents

Two other agents were building into `dist/` during this session. One `npm run build`
was clobbered mid-render by a concurrent `astro build` (`Cannot find module
dist/chunks/content-assets_*.mjs`). That failure was environmental, not a code
defect — the same tree builds clean in isolation and the final serialised build
passed. Article counts moved from 219 → 227 mid-session for the same reason, which
is why URL counts differ slightly between sections; each section states the count
it actually measured.

## Files changed (working tree, uncommitted)

| File | Change |
|---|---|
| `public/_routes.json` | Exclusions 9 → 22: static assets, data files, downloads, feed, icons and the IndexNow key file no longer invoke the catch-all Function |
| `astro.config.mjs` | Hub-page `lastmod` from newest article `dateModified`; `priority` from the content hierarchy; inline image sitemap (259 `image:image` entries, existence-checked) |
| `scripts/notify-indexnow.py` | Empty `INDEXNOW_KEY` env var now falls back to the default key instead of exiting 1 |
| `reports/growth/indexnow-backfill-2026-07-28.json` | New — full backfill ledger with per-batch HTTP responses |
| `reports/growth/indexation-fix-2026-07-27.md` | This report |
