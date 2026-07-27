# Bing / IndexNow indexing audit — 2026-07-26

Scope: maximise indexing on Bing and the engines that consume its index
(DuckDuckGo, Yahoo, AOL, Ecosia-outside-EU) plus the AI grounding surfaces
(Copilot, ChatGPT search) that read the same index.

Baselines used: `reports/growth/traffic-sweep/01-search-engines.md` (D1, D2),
`reports/growth/search-live-baseline-2026-07-15.md`,
`reports/growth/gsc-structured-data-indexing-2026-07-26.md`,
`reports/growth/indexnow-recovery-2026-07-15.md`.

Nothing was committed. All changes are left in the working tree.

---

## 0. HEADLINE — `main` has not been deployable since 2026-07-26 17:21 UTC

This outranks every indexing question below: nothing new can be indexed if
nothing new ships.

**`main` does not build in CI.** Commit `207442c` ("revert(license)") added
`src/pages/data/index.astro`, which imports `../../content/datasets`
(`src/pages/data/index.astro:5-8`). `src/content/datasets.ts` **was never
git-added**:

```
$ git ls-files src/content/
src/content/clusters.ts
src/content/pillars.ts
src/content/relatedArticleScoring.js
src/content/release.ts

$ git status --porcelain src/content/
?? src/content/datasets.ts
```

The file exists in the local working tree, which is why `npm run build` passes
locally and fails on a clean CI checkout:

```
Could not resolve "../../content/datasets" from "src/pages/data/index.astro"
[ERROR] [vite] Build failed in 1.58s
```

`gh run list --workflow=deploy-cloudflare-pages.yml`:

| Run | Commit | Result |
|---|---|---|
| 30200394803 | `cbb19ff` | success (11:34 UTC) — last good deploy |
| 30211749018 | `f443e10` | **failure** (17:02) |
| 30212413754 | `207442c` | cancelled (17:21) |
| 30212458239 | `795002c` | **failure** (17:23) |
| 30214111560 | `bc2fc86` | **failure** (18:09) |
| 30214344262 | `f850d77` | **failure** (18:15) |
| 30214814292 | `5618d37` | **failure** (18:29) |
| 30214927666 | `12a841e` | **failure** (18:32) |
| 30235641471 | `3396ed7` | in progress — will fail identically |

Live proof: `/deploy-proof/` reports
`data-commit="f443e106d68f51febf2f11a45fb76f34ba61f58c"`. Production is 8
commits behind `main`.

Every failure stops at `Build and verify routing`, which is **before** the
`Notify IndexNow about changed canonical pages` step
(`.github/workflows/deploy-cloudflare-pages.yml:107-116`). IndexNow has
therefore not fired on any push since 11:34 UTC.

This is a recurrence of the recorded lesson that new files must be git-added or
the deploy silently fails.

**Fix required (not applied — it is a content/ownership decision):** either
`git add src/content/datasets.ts`, or revert `src/pages/data/index.astro` and
`src/pages/embed/[slug].astro` out of `207442c`. Note `207442c` is labelled a
revert but *adds* three new files; whoever owns that decision should confirm
which half was intended.

---

## 1. What the site publishes

Fresh `npm run build` (exit 0) on `main` + the untracked `datasets.ts`:

- `dist/sitemap-index.xml` — a sitemap **index** with exactly one child,
  `https://www.daily-life-hacks.com/sitemap-0.xml`
- `dist/sitemap-0.xml` — **236 URLs**
- Built HTML pages: **266**
- Source articles: **219** in `src/data/articles/`. All 219 are in the sitemap.
- Alias slugs: **585** in `pipeline-data/slug-aliases.json`, all correctly kept
  out of the sitemap (`astro.config.mjs:36-41`)

The 266 − 236 = **30-page gap is entirely intentional noindex**, verified page
by page: `404.html`, `/contact/`, `/dashboard/`, `/deploy-proof/`,
`/disclaimer/`, `/privacy/`, `/terms/`, `/thank-you/`, and 22 `/embed/*` pages.
Nothing indexable is missing from the sitemap.

**Release gate:** 5 articles carry `publishAt`
(`how-to-pack-lunch-crisp-sandwiches-salads`, `how-to-preheat-skillet-even-browning`,
`how-to-quick-soak-dried-beans-same-day`, `keep-berries-fresh-longer-when-to-wash`,
`protein-per-serving-beans-chicken-tofu-compared`) — **all dates are in the
past**, so zero articles are currently held back. The gate is not suppressing
anything today.

Sitemap hygiene — all clean:

| Check | Result |
|---|---|
| Wrong host (apex / non-www) | 0 / 236 |
| Missing trailing slash | 0 / 236 (matches `trailingSlash: 'always'`, `astro.config.mjs:122`) |
| Duplicate entries | 0 |
| Sitemap entry with no built page | 0 |

**Live sitemap vs. freshly built sitemap:** also 236 URLs, differing by exactly
two entries — the frozen-deploy delta from §0:

- in local build, not live: `/data/` → **404 live**, must not be submitted
- live, not in local build: `/license/` → still live because the revert never
  deployed; it is scheduled to disappear, so it must not be submitted either

---

## 2. How many are actually indexed on Bing — what I could and could not verify

**Could not verify directly.** Being explicit about this:

- **Bing Webmaster Tools:** no credentials in this environment, and no Bing WMT
  export CSV exists anywhere in the repo. I searched `reports/` and
  `pipeline-data/` — the only Bing-named artefact is
  `reports/growth/bing-query-opportunity-2026-07-26.md`, which is analysis, not
  an index export. The CSVs present (`indexation-link-audit-2026-07-13.csv`,
  `content-indexing-triage-report.csv`, `search-recovery-cohort-2026-07-23.csv`,
  `gsc-post-deploy-action-plan-2026-06-29.csv`) are Google/internal, not Bing.
- **`site:` queries:** both Bing and DuckDuckGo returned bot challenges
  (Bing served an anti-bot interstitial; DuckDuckGo's HTML endpoint returned
  *"Please complete the following challenge to confirm this search was made by a
  human"*). I did not attempt to bypass either.

**Best available figure, from the recorded baseline**
(`search-live-baseline-2026-07-15.md`, 12 days old):

| Bing metric | Value | Date |
|---|---:|---|
| Site Explorer indexed URLs | 255 | 2026-07-15 |
| Known URLs | 348 | 2026-07-15 |
| Warnings / excluded / errors | 48 / 45 / 0 | 2026-07-15 |
| Sitemap last crawl | 2026-05-15 | — |
| Sitemap discovered URLs | 300 | — |
| IndexNow URLs submitted | ~3,700 | — |
| IndexNow URLs **indexed** | **0** | — |
| IndexNow URLs crawled | 9 | — |
| 3-month search impressions / clicks | 211 / 3 | — |
| 7-day AI citations | 106 | — |

Two things stand out and both are still true today:

1. **255 "indexed" against a 236-URL sitemap** means Bing's index contains
   URLs that are not canonical site pages — almost certainly the pin-alias and
   `-v{n}` variants that now 301, plus legacy tag URLs. Those are being cleaned
   up correctly by the redirect layer (verified in §4), so this number should
   fall toward 236 over time. It is not a sign of good coverage.
2. **Sitemap last crawled 2026-05-15** is the single most actionable number in
   the whole baseline. A sitemap that has not been re-read in 10 weeks means
   every article published since then reached Bing only via IndexNow or organic
   crawl. That is exactly the gap IndexNow is supposed to close, and §3 shows it
   was not closing it.

**Verifiable substitute I did run:** all 236 live sitemap URLs were fetched
directly (§4). 236/236 return `200` with zero redirect hops, so every URL the
site publishes is at minimum *crawlable*. That bounds the problem: whatever is
not indexed on Bing is not failing for a crawl-access reason.

**To actually close this out**, someone with Bing WMT access needs to export
Site Explorer → *Indexed URLs* and diff it against `dist/sitemap-0.xml`. That is
a 10-minute job and I could not do it from here.

---

## 3. IndexNow — what was broken, what I fixed, what I submitted

### 3.1 What was actually broken

The script was working when it ran. The problem was that it barely ran, and it
could not express two of the URLs it was asked to submit.

**Trap A — the 9 comparison articles were never submitted.** Confirmed exactly,
not inferred. Pulling the IndexNow step output from the last successful run:

```
$ gh run view 30200394803 --log | grep -A4 "IndexNow eligible"
IndexNow eligible canonical pages: 2
  https://www.daily-life-hacks.com/
  https://www.daily-life-hacks.com/peanut-butter-vs-almonds-protein-cost/
```

So `peanut-butter-vs-almonds-protein-cost` (added in `cbb19ff`) *was* submitted.
The other 8 landed in `8e0873a`, which was pushed with `f443e10` as the head
commit — the run that failed at build. `git diff --name-status cbb19ff f443e10`
confirms those 8 markdown files are exactly the live-but-unsubmitted set.

**Trap B — relative paths are silently dropped, and on Windows they are
mangled.** The known trap is worse than documented locally. Running
`--urls /data/` under Git Bash, MSYS path-translation rewrote the argument
before Python ever saw it:

```json
{ "url": "C:/Program Files/Git/data/", "reason": "not a canonical site URL" }
```

The script skipped it and still **exited 0**. A hand-supplied URL that never
gets submitted, with a success exit code, is the failure mode most likely to go
unnoticed.

**Trap C — the script could not express `/rss.xml` at all.**
`canonicalize_url()` unconditionally appended a trailing slash, so `/rss.xml`
became `https://www.daily-life-hacks.com/rss.xml/` — a URL the site does not
serve — which then failed the sitemap allowlist and was dropped:

```json
{ "url": "https://www.daily-life-hacks.com/rss.xml/",
  "reason": "not in built sitemap (unreleased, noindex, redirect, or missing)" }
```

### 3.2 Fixes applied to `scripts/notify-indexnow.py`

All three fixes preserve the deliberate fail-closed design.

1. **`canonicalize_url()` no longer invents trailing slashes on file-style
   endpoints** (`.xml`, `.json`, `.txt` — `FILE_SUFFIXES`). An article slug that
   happens to contain a dot is unaffected and still normalises to a trailing
   slash.
2. **`load_sitemap_urls()` admits the RSS feed** — but only when *this build*
   actually emitted `rss.xml` next to the sitemap (`FEED_PATHS`). A missing or
   renamed feed still fails closed. Feeds are never in a sitemap, so without
   this the feed is unsubmittable by design.
3. **A rejected `--urls` value is now a hard failure.** `build_plan()` tags each
   skip with its source and returns `rejected_explicit_urls`; `main()` prints
   `REJECTED --urls <url>: <reason>` to stderr and **exits 1**. URLs derived
   from a Git diff still skip quietly — that is correct, since a diff legitimately
   contains assets and unreleased pages. Only URLs a human typed now fail loudly.

Tests extended in `tests/test_notify_indexnow.py` (4 new cases: file-style
endpoints, feed-only-if-built, loud rejection, and a regression guard that
Git-derived skips are *not* treated as explicit rejections):

```
$ python -m pytest tests/test_notify_indexnow.py -q
11 passed in 0.24s
```

### 3.3 The submission — real response, not an assumption

Submitted against the **live** sitemap (`_live_sm/`, fetched from production),
not the local build, so that `/data/` could not slip in and the URLs were
guaranteed live at submission time. All 9 articles were confirmed `200` live
beforehand.

Dry run first: 10 eligible, 0 skipped. Then the real call:

```
$ python scripts/notify-indexnow.py --sitemap-dir _live_sm \
    --log-file reports/growth/indexnow-submission-2026-07-26.json --urls <10 URLs>

IndexNow eligible canonical pages: 10
  https://www.daily-life-hacks.com/chicken-thighs-vs-breast-protein-cost/
  https://www.daily-life-hacks.com/eggs-vs-greek-yogurt-protein-cost/
  https://www.daily-life-hacks.com/frozen-vs-fresh-vegetables-fiber-cost/
  https://www.daily-life-hacks.com/ground-beef-vs-beans-protein-cost/
  https://www.daily-life-hacks.com/lentils-vs-chicken-breast-protein-cost/
  https://www.daily-life-hacks.com/peanut-butter-vs-almonds-protein-cost/
  https://www.daily-life-hacks.com/popcorn-vs-almonds-fiber-cost/
  https://www.daily-life-hacks.com/rss.xml
  https://www.daily-life-hacks.com/tofu-vs-chicken-protein-cost/
  https://www.daily-life-hacks.com/whole-wheat-flour-vs-quinoa-fiber-cost/
Ignored non-page source paths: 0
Skipped URL candidates: 0
IndexNow response: status=200 ok=True
EXIT=0
```

**Actual HTTP response: `200`, empty body**, from
`https://api.indexnow.org/indexnow`. Under the IndexNow spec `200 OK` is
"URL submitted successfully" (as distinct from `202`, accepted-pending-key-check).
Key file verified live first: `/bfae002c508721fed055bda08154ede6.txt` → `200`,
body `bfae002c508721fed055bda08154ede6`, matching `DEFAULT_INDEXNOW_KEY`.

Full machine-readable log: `reports/growth/indexnow-submission-2026-07-26.json`.

Two honest caveats:

- `peanut-butter-vs-almonds-protein-cost` is a **re-submission** (it went out at
  11:36 UTC). It was included because the task named all 9; one duplicate is
  harmless, but it was not new.
- `/rss.xml` carries `X-Robots-Tag: noindex` (`public/_headers:33-34`). Bing will
  crawl it for link discovery but will not index the feed document itself. The
  submission is a discovery signal, not an indexing one. See finding B4.
- `/license/` is live and in the live sitemap but was deliberately **excluded**:
  the owner decided to remove it (`207442c`), so submitting it would buy a crawl
  of a page that is about to 404.

---

## 4. Crawl path — verified clean

### 4.1 Full live status sweep

Every one of the **236 live sitemap URLs** fetched individually,
redirects not followed:

```
Counter({200: 236})
```

**236/236 → `200`. Zero redirects, zero 404s, zero `X-Robots-Tag` noindex
headers on any sitemap URL.** No sitemap URL 404s or redirects.

Key endpoints:

| URL | Status |
|---|---|
| `/robots.txt` | 200 |
| `/sitemap-index.xml` | 200 |
| `/sitemap-0.xml` | 200 |
| `/rss.xml` | 200 |
| `/bfae002c508721fed055bda08154ede6.txt` | 200 |
| `/data/` | **404** (built locally, never deployed — §0) |
| `/embed/one-dollar-fiber-what-it-buys/` | **404** (same cause) |

### 4.2 Redirect chains — all single-hop

| Request | Chain |
|---|---|
| `/lentils-vs-chicken-breast-protein-cost` (no slash) | 301 → 200, **1 hop** |
| `https://daily-life-hacks.com/...` (apex) | 301 → 200, **1 hop** |
| `http://www.daily-life-hacks.com/...` | 301 → 200, **1 hop** |
| `https://daily-life-hacks.com/` (apex root) | 301 → 200, **1 hop** |
| `/tag/pizzanight/` (legacy) | 301 → 200, **1 hop** |
| `/${p.slug}` (malformed legacy) | **410**, 0 hops |
| `/definitely-not-a-real-page/` | **404**, 0 hops |

No redirect chains anywhere. This confirms the
`gsc-structured-data-indexing-2026-07-26.md` conclusion held after deploy.

### 4.3 Internal link graph — no orphans

`npm run verify:internal-links`:

```
OK: checked 9174 internal anchor(s) across 266 HTML file(s); indexable canonical targets=236
Article graph: 219 indexable article(s); rendered orphans=0; rendered inbound <=1=0; contextual inbound=0=0
```

Independently confirmed by parsing `dist/` directly: zero sitemap URLs with no
inbound internal link. The 9 new comparison articles are all linked
contextually from other article bodies (spot-checked
`tofu-vs-chicken-protein-cost`, reached from `/cauliflower-fried-rice-with-eggs/`,
`/high-protein-on-a-budget-complete-guide/`,
`/natto-japanese-fermented-soybeans-gut-health/` with real in-prose anchors).

`npm run verify:routing` also passes: 219 canonical pages, 585 pin destinations
runtime-301 only, `leakedAliasHtml=0`.

### 4.4 Thin / near-duplicate content — none found

- Shortest article body: **738 words** (`chicken-thighs-vs-breast-protein-cost`).
  Nothing thin.
- Near-duplicate sweep over all 219 article bodies (8-word shingles, Jaccard):
  **0 pairs above 0.10**. Despite sharing a template, the 9 comparison articles
  are not near-duplicates of each other.

### 4.5 robots.txt — one real bug, fixed

**The bug (now fixed):** every named group in the old `public/robots.txt` had
`Allow: /` and **no `Disallow` lines**. Per the robots exclusion protocol a
crawler obeys only the most specific group that names it and does *not* merge
the `*` group — so `GPTBot`, `Google-Extended`, `ClaudeBot`, `PerplexityBot` and
`Bytespider` were all being granted `/admin/`, `/.git/` and `/node_modules/`
that the wildcard group denies. Old file, lines 8-21.

**The gap (now fixed):** `OAI-SearchBot` was not named. It builds the ChatGPT
*search* index and is a distinct agent from `GPTBot` (training) and
`ChatGPT-User` (live fetches). Given the site earns ~41 AI citations/day, naming
it explicitly rather than relying on the wildcard is the cheapest possible
insurance on that channel.

Rewritten `public/robots.txt` now has 12 groups, each repeating the same
`Disallow` set, with a comment explaining the non-merging precedence rule so it
does not regress:

`*`, `bingbot`, `adidxbot`, **`OAI-SearchBot`**, `ChatGPT-User`, `GPTBot`,
`PerplexityBot`, `ClaudeBot`, `Claude-User`, `Google-Extended`,
`Applebot-Extended`, `Bytespider`

`Sitemap: https://www.daily-life-hacks.com/sitemap-index.xml` retained and
correct — it points at the index, and the index correctly points at the one
child sitemap.

---

## 5. Blockers found — file and line

Ranked by actual impact.

### A. Blocking

**A1. `main` does not build; production frozen 8 commits back.**
`src/pages/data/index.astro:5-8` imports `../../content/datasets`;
`src/content/datasets.ts` is untracked. Every deploy since 17:21 UTC fails.
See §0. *This is the only finding that is currently costing indexing.*

**A2. A failed deploy loses its IndexNow window permanently.**
`.github/workflows/deploy-cloudflare-pages.yml:107-116` runs IndexNow after
`Build and verify routing`, diffing `github.event.before..sha`. When the build
fails the step never runs — and the *next* push diffs from a base **after** those
commits, so the URLs are never submitted by any later run. This is precisely how
8 of the 9 comparison articles were lost. Fixed by the automation in §6.

**A3. Scheduled `publishAt` releases are never submitted to IndexNow — ever.**
Same file, line 108: `if: github.ref_name == 'main' && github.event_name == 'push'`.
The daily `schedule` rebuild (line 17-18) is the mechanism that releases
future-dated articles (they enter the sitemap with no commit behind them), but
the IndexNow step is gated to `push` events, so a Git diff finds nothing and the
scheduled article is never announced. Not biting today (all 5 `publishAt` dates
are past) but it is a permanent structural hole. Fixed by §6.

### B. Worth fixing, not blocking

**B1. `/rss.xml` is `noindex`.** `public/_headers:33-34`. Deliberate
(commit `2eaf880`), and defensible — but Bing does treat feeds as a discovery
surface, and a `noindex` feed is a weaker signal than an indexable one. Worth a
conscious re-decision now that Bing/IndexNow is the priority channel.

**B2. Legal and trust pages are `noindex`.**
`src/pages/privacy.astro:10`, `src/pages/terms.astro:10`,
`src/pages/disclaimer.astro:10`, `src/pages/contact.astro:10` — all
`robots="noindex, follow"`. Intentional (`astro.config.mjs:44-53` also excludes
them from the sitemap). But for a nutrition/YMYL-adjacent site, a visible,
indexable Contact and Privacy page is a standard trust signal, and Bing in
particular is documented as weighting site-completeness signals. Removing
`/contact/` from the index is the one I would reconsider first.

**B3. Dead code in the edge router.**
`functions/[[path]].js:131` defines `applyProxyRobotsPolicy()` — 45 lines
including an `HTMLRewriter` path — and **nothing calls it**. It is a leftover
from the HTML-proxy era that was replaced by 301s (`functions/[[path]].js:568-571`).
Harmless at runtime, but it is exactly the kind of code someone re-wires by
mistake, and re-introducing an HTML proxy would create soft-duplicate URLs.

**B4. Every article HTML is served uncached through the Worker.**
Live headers on an article: `Cache-Control: public, max-age=0, must-revalidate`,
`cf-cache-status: DYNAMIC`. Because `functions/[[path]].js` is a catch-all,
every HTML request runs the Worker (including a D1 `funnel_events` insert at
line 615-632). At 236 pages this is not a crawl-budget problem — Google scopes
crawl budget to 1M+ page sites — but it does mean crawler traffic is doing D1
writes, and it is why `X-Robots-Tag` from `public/_headers` needs the
`env.ASSETS.fetch` path to survive. Monitor, do not optimise.

**B5. `/dashboard` header rule may not match the served path.**
`public/_headers:27-28` scopes `X-Robots-Tag: noindex, nofollow` to `/dashboard`
(no trailing slash), but the built page is `/dashboard/`. Belt-and-braces only —
`src/pages/dashboard.astro:195` sets the meta tag and `astro.config.mjs:45`
keeps it out of the sitemap, so it is not exposed. Worth changing to
`/dashboard*` for consistency.

### C. Checked and clean — explicitly not a problem

- **Canonical tags:** 264/266 pages carry exactly one `<link rel="canonical">`.
  Zero mismatches on indexable pages. The 22 `/embed/*` pages canonicalise to
  their parent article — correct and deliberate. The 2 without a canonical
  (`/dashboard/`, `/deploy-proof/`) are `noindex, nofollow`.
- **Trailing slashes:** consistent everywhere. 236/236 sitemap URLs, one 301 from
  the slashless form, `trailingSlash: 'always'`.
- **Redirect chains:** none. All single-hop (§4.2).
- **Orphans:** none (§4.3).
- **Thin / near-duplicate:** none (§4.4).
- **Release gate:** correct and not suppressing anything (`src/content/release.ts`,
  `src/pages/[slug].astro:351`, `astro.config.mjs:56-64`).
- **`public/_headers`:** nothing interferes with indexing. The only
  `X-Robots-Tag` rules are `/embed/*`, `/dashboard`, `/rss.xml` — all intended.
- **`functions/[[path]].js`:** the legacy 301/410 map (lines 21-88) is doing its
  job; the KV self-reference guard at lines 441-446 correctly prevents an alias
  from shadowing a canonical article.

---

## 6. Automation

### 6.1 What already existed

IndexNow **is** already wired to deploys —
`.github/workflows/deploy-cloudflare-pages.yml:107-124` — and it works when it
runs (`status=200 ok=True` in run 30200394803). It was not missing; it was
lossy, in the three ways catalogued as A2 and A3 above.

### 6.2 What I wrote (not run, left for review)

**`scripts/indexnow-sitemap-diff.py`** — a state-based diff instead of an
event-based one. It compares the sitemap the current build produced against a
cached snapshot of the last sitemap that was successfully submitted, and emits
absolute canonical URLs that are new or whose `lastmod` moved. It does **not**
talk to IndexNow: it prints URLs for `notify-indexnow.py --urls`, so that script
remains the single audited submission path (sitemap allowlist, canonicalisation,
HTTP logging, and now loud rejection).

Safety properties, each tested locally against the real 236-URL sitemap:

| Behaviour | Result |
|---|---|
| Cold start (no snapshot) | Seeds the snapshot, submits **nothing**. A lost cache can never trigger a full-site resubmission. |
| No change since last run | 0 candidates, exit 0 |
| 2 new + 1 `lastmod` bumped | Exactly those 3 emitted, exit 0 |
| Stale snapshot → 236 candidates | **Exit 1, output file not written**, nothing submitted. `--max-urls` defaults to 60 on the reasoning that no legitimate single build changes more than that; exceeding it means a template touched every page and blasting IndexNow would be a spam signal. |
| Malformed / missing sitemap | Fails closed, exit 1 |

**`.github/workflows/indexnow-sitemap-diff.yml`** — triggers on
`workflow_run` after **Deploy Cloudflare Pages succeeds** on `main`, plus manual
`workflow_dispatch` (defaulting to dry-run). Because it is state-based and keyed
to deploy success rather than to a push event, it closes all three holes:

- **A2 (failed deploys):** the snapshot only advances after a *successful*
  submission, so URLs accumulate across failed deploys and the next good deploy
  picks up everything. Nothing is lost.
- **A3 (scheduled releases):** a `publishAt` article entering the sitemap on a
  daily rebuild is a sitemap *diff* even though it is not a Git diff, so it gets
  submitted.
- **Force-pushes / merges:** `github.event.before` is irrelevant to a sitemap
  comparison.

It also cannot submit a URL that is not live, because it only runs after a
verified successful deploy of that exact commit
(`ref: github.event.workflow_run.head_sha`).

Both YAML files parse. **The workflow is deliberately not enabled end-to-end**:
its header notes that adopting it means deleting the `Notify IndexNow` and
`Upload IndexNow deploy report` steps from `deploy-cloudflare-pages.yml`, so the
two paths do not both submit. That is a review decision, not mine to make.

---

## 7. Recommended order of work

1. **Fix the build** (§0 / A1). Everything else is theoretical until `main`
   deploys. Decide whether `src/content/datasets.ts` should be committed or
   whether `src/pages/data/index.astro` and `src/pages/embed/[slug].astro`
   should come back out of `207442c`.
2. **Deploy**, then confirm `/deploy-proof/` advances past `f443e10`.
3. **Review and enable** `.github/workflows/indexnow-sitemap-diff.yml`, removing
   the two superseded steps from the deploy workflow.
4. **Export Bing WMT → Site Explorer → Indexed URLs** and diff against
   `dist/sitemap-0.xml`. That is the one number in this report I could not
   produce, and it is 10 minutes with credentials.
5. **Resubmit the sitemap in Bing WMT.** Last crawl 2026-05-15 is the most
   suspicious figure in the baseline.
6. Optional: reconsider B1 (`/rss.xml` noindex) and B2 (`/contact/` noindex).

---

## Files changed (working tree, uncommitted)

| File | Change |
|---|---|
| `scripts/notify-indexnow.py` | File-style endpoints keep their extension; feed eligible when built; rejected `--urls` now fails loudly with exit 1 |
| `tests/test_notify_indexnow.py` | +4 tests (11 pass) |
| `public/robots.txt` | Rewritten: `OAI-SearchBot` + 5 more named; `Disallow` set repeated in every named group |
| `scripts/indexnow-sitemap-diff.py` | New — state-based sitemap diff |
| `.github/workflows/indexnow-sitemap-diff.yml` | New — post-deploy IndexNow, not enabled |
| `reports/growth/indexnow-submission-2026-07-26.json` | New — submission log, HTTP 200 |
| `reports/growth/bing-indexing-2026-07-26.md` | This report |

Pre-existing uncommitted changes (`astro.config.mjs`, `public/_headers`,
`functions/[[path]].js` — the `/embed/*` work) were left untouched.
