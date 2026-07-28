# Schema + AEO Audit — 2026-07-27

**Scope:** every distinct page type on daily-life-hacks.com, validated against a fresh
`npm run build` of `dist/` (267 HTML files, 934 JSON-LD blocks).
**Owned in this pass:** `src/pages/`, `src/layouts/`, `src/components/` (except `OptImage.astro`).
**Not touched:** `src/data/articles/`, `public/images/`, `astro.config.mjs`, `public/robots.txt`, `public/_headers`.
**Nothing committed.**

---

## Framing: what schema is for here, and what it isn't

The site currently earns roughly 41 AI citations/day on Bing/Copilot — its best-performing
channel. A properly controlled Ahrefs study found **schema markup has no measurable effect
on AI citation and a slightly negative one on AI Overviews**. So this audit treats schema as
serving two concrete, non-AI purposes:

1. **Google rich results** — of which only a handful survive. Recipe is the one that still
   produces a real SERP feature for this site.
2. **Google Dataset Search** — the 22 `Dataset` nodes and the `/data/` `DataCatalog` are the
   only route into that index.

The AI lever is elsewhere and is handled in sections 3–4: **content shape** (clean heading
tree, real tables/lists, visible dates, source attribution as text) and **being the only
source for a number**.

---

## 1. Baseline validation (before any fix)

Programmatic extraction of every `<script type="application/ld+json">` in `dist/`,
`json.loads` on each, then `@id` resolution per page (a node "defines" an `@id` if it carries
any property beyond `@id`; anything else referencing that `@id` is a pointer).

| Metric | Before |
|---|---|
| HTML files scanned | 267 |
| JSON-LD blocks | 934 |
| **Blocks that failed to parse** | **0** |
| **Dangling `@id` references** | **243** |
| Pages emitting zero JSON-LD | 30 |

### Dangling references, by cause

| Reference | Count | Where | Cause |
|---|---|---|---|
| `https://www.daily-life-hacks.com/#website` | 221 | 219 article pages + 2 nodes on `/data/` | `WebPage.isPartOf` points at a `WebSite` node that is only ever *defined* on `/` and `/about/`. Every other page emits a bare pointer to a node that does not exist in that page's graph. |
| `https://www.daily-life-hacks.com/data/#catalog` | 22 | `Dataset.includedInDataCatalog` on the 22 data-study articles | Same problem: the `DataCatalog` node is defined on `/data/` only. |

These are not parse errors and they do not trigger a Search Console error, but Google's
structured-data parser resolves `@id` **per page**. On 219 article pages the `WebSite` link
resolved to nothing, so the article/recipe entity was never actually connected to a site
entity.

---

## 2. Per-page-type validation table (before)

| Page type | Pages | LD blocks | Types emitted | Dangling | Missing required | Missing recommended | Retired types |
|---|---|---|---|---|---|---|---|
| home (`/`) | 1 | 2 | Organization, WebSite, ContactPoint, ImageObject | 0 | `Organization.url` on the nested publisher stub | — | — |
| article (plain) | 139 | — | WebPage, Article, BreadcrumbList, Person/Organization, FAQPage | `#website` | — | — | FAQPage |
| article (recipe) | 80 | — | WebPage, **Recipe**, HowToStep ×524, NutritionInformation, BreadcrumbList, FAQPage | `#website` | **none** | `recipeCategory` ×80, `recipeCuisine` ×80 | FAQPage |
| article (data study) | 22 of the above | — | + **Dataset**, DataDownload | `#website`, `#catalog` | — | — | FAQPage |
| pillar | (no separate template — same as article) | — | — | — | — | — | — |
| category (`/nutrition/` `/tips/` `/recipes/` `/guides/` `/research/`) | 5 | 9 | CollectionPage, ItemList (4 of 5), WebSite | 0 | — | **no BreadcrumbList**; `/nutrition/` and `/tips/` had no `ItemList` | — |
| tools index | 1 | 2 | CollectionPage, ItemList, Organization, WebSite | 0 | — | no BreadcrumbList | — |
| tool calculator | 7 | 13 | **WebApplication** ×7, Offer, Organization, FAQPage ×6 | 0 | — | no BreadcrumbList | FAQPage |
| about | 1 | 3 | AboutPage, **Person**, Organization, WebSite | 0 | — | — | — |
| methodology | 1 | 1 | WebPage, WebSite, Organization, Thing | 0 | — | no BreadcrumbList | — |
| data hub (`/data/`) | 1 | 3 | CollectionPage, **DataCatalog**, Dataset ×22, DataDownload ×22, BreadcrumbList | 2 (`#website`) | — | — | — |
| api-docs | 1 | 3 | WebPage, WebAPI, BreadcrumbList, Organization, WebSite | 0 | — | — | — |
| embed (`/embed/*`) | 22 | 0 | — (intentionally chrome-free, `noindex`, own `<head>`) | 0 | n/a | n/a | — |
| contact / privacy / terms / disclaimer / thank-you / 404 | 6 | 0 | — | 0 | no Organization or WebSite at all | — | — |
| dashboard / deploy-proof | 2 | 0 | — (internal, no `h1`) | 0 | n/a | n/a | — |
| tag (`/tag/*`) | 0 built | — | route is a redirect stub, emits no pages | — | — | — | — |

**Recipe was the good news:** all 80 recipes already carried `name`, `image`, `author`,
`datePublished`, `dateModified`, `description`, `prepTime`, `cookTime`, `totalTime`,
`recipeYield`, `recipeIngredient`, `recipeInstructions` (as `HowToStep` with per-step
anchors), `nutrition.calories` and `keywords`. Google's Recipe doc requires only `name` and
`image`; both were present on 80/80. The only gaps were the two recommended taxonomy
properties.

---

## 3. What Google no longer supports (verified against current docs, not memory)

Fetched `developers.google.com/search/docs/appearance/structured-data/search-gallery`
on 2026-07-27. The current supported list is: Article, Breadcrumb, Carousel, Course list,
Dataset, Discussion forum, Education Q&A, Employer aggregate rating, Event, Image metadata,
Job posting, Local business, Math solver, Movie, Organization, Product, Profile page, Q&A,
Recipe, Review snippet, Software app, Speakable, Subscription/paywalled content, Vacation
rental, Video.

| Retired thing | Status | Do we emit it? | Verdict |
|---|---|---|---|
| **FAQ rich results** | Absent from the gallery; Google's FAQ rich result ended 2026-05-07 | **Yes — 225 `FAQPage` nodes** (219 articles + 6 tool pages) | **Keep.** See below. |
| **HowTo rich results** | Deprecated 2023, absent from gallery | No standalone `HowTo` anywhere. The 524 `HowToStep` nodes are inside `Recipe.recipeInstructions`, which is exactly what Google's *current* Recipe doc still recommends. | No action. |
| **Sitelinks search box** (`WebSite.potentialAction` / `SearchAction`) | Retired 2024-11-21 | **No** — zero `SearchAction` nodes site-wide | Already clean. Do not add one. |
| `SiteNavigationElement` | Never a Google feature | No | Clean. |
| `Speakable` | Still in the gallery but US-news-publisher only | No | Correctly absent. |

### The FAQPage decision (deliberate, and it goes against the obvious call)

Google killed the FAQ *rich result*, so the 225 `FAQPage` nodes buy nothing on Google.
The obvious move is to delete them. **I did not, and this is the reason:** this site's
single best channel is Bing/Copilot at ~41 citations/day, and Bing has not followed Google —
Bing, DuckDuckGo and the retrieval-side AI crawlers still parse `FAQPage` and Bing still
weights it. Removing markup that is worthless on the losing channel and possibly load-bearing
on the winning one is a bad trade for a few hundred bytes. `FAQPage` remains a valid
schema.org type, throws no error, and carries no penalty.

**Flagged, not removed.** If Bing ever drops it, deleting the block is a two-line change in
`src/pages/[slug].astro` and each tool page.

---

## 4. What was fixed

### 4.1 The sitewide entity graph — `src/layouts/BaseLayout.astro`

The root cause of 221 of the 243 dangling references. `BaseLayout` now emits an
`@graph` containing the `Organization` (`#organization`) and `WebSite` (`#website`)
nodes on **every** page, ahead of whatever the page itself declares. A new
`siteGraph` prop (default `true`) can suppress it.

Knock-on effects:
- Every `isPartOf: {"@id": ".../#website"}` and `publisher: {"@id": ".../#organization"}`
  on the site now resolves.
- The 6 legal/utility pages that previously emitted **no** structured data at all
  (`/contact/`, `/privacy/`, `/terms/`, `/disclaimer/`, `/thank-you/`, `404`) now
  carry a publisher identity.
- Duplicate `Organization`/`WebSite` definitions removed from `src/pages/index.astro`
  (replaced with a `WebPage` node specific to the home page) and trimmed on
  `src/pages/about.astro` to just the `founder` edge.

There is deliberately **no** `potentialAction`/`SearchAction` in the `WebSite` node.
Google retired the sitelinks search box on 2024-11-21 and the site had correctly
never emitted one; a comment in the file says so, so nobody re-adds it.

### 4.2 The Dataset → DataCatalog link — `src/pages/[slug].astro`

`Dataset.includedInDataCatalog` was a bare `{"@id": ".../data/#catalog"}` pointer on
all 22 study pages, and the `DataCatalog` node only exists on `/data/`. It is now
defined inline (type, name, url, publisher) so Dataset Search sees an actual catalog
from any study page it lands on.

### 4.3 Recipe completeness — all 80 recipes

Required properties were already 80/80. Added:
- `recipeCategory` derived **only** from an explicitly authored meal-type tag
  (`dinner`, `breakfast`, `salad`, `soup`, `dessert`, …). **38 of 80** now carry one.
  The remaining 42 declare no tag that supports a value, so nothing is emitted —
  a guessed meal type is worse than an absent one.
- `recipeCuisine` — **0 of 80**, and this is the honest answer. Not a single article
  in `src/data/articles/` carries a cuisine tag (checked all 15 common cuisine terms
  across every file). There is no value here we can state truthfully from the data
  we have, so none is emitted. Fixing this means adding `recipeCuisine` to the
  frontmatter, which is another agent's file.

### 4.4 The client-injected `aggregateRating` was creating a phantom entity

`src/pages/[slug].astro` injects an `aggregateRating` node into `<head>` once a page
has 5+ ratings. It carried `@type: Recipe|Article` + `url` + `name` but **no `@id`**,
so a parser saw a *second, unrelated* Recipe/Article entity on the page competing
with the server-rendered one. It now carries the same `@id` as the server-rendered
entity, so the rating merges onto it instead.

### 4.5 BreadcrumbList added where it was missing

Added to the 7 tool calculators, the tools index, `/about/`, `/methodology/`,
`/nutrition/` and `/tips/` — all of which render a visible breadcrumb trail but had
no markup for it. Breadcrumb is one of the surviving Google rich results.

---

## 5. AI-engine content shape (template level)

These are the changes that actually matter for citation, per the framing above.

### 5.1 Visible published AND modified dates — `src/pages/[slug].astro`

**The site had zero `<time>` elements on any page.** The publish date was rendered as
bare text; `dateModified` existed only inside JSON-LD, where a text extractor never
looks. Freshness is one of the strongest measured correlates of AI citation, and 64
of the 80 recipes plus a large share of articles carry a `dateModified` that was
completely invisible on the page.

Article headers now render:

```
Published <time datetime="2026-04-08">April 8, 2026</time> • Updated <time datetime="2026-07-20">July 20, 2026</time>
```

The "Updated" half only appears when the modified date actually differs from the
published date — no date theatre on pages that were never revised.

### 5.2 Source attribution as text, next to the claim

The 22 data studies previously stated their provenance only in the JSON-LD `Dataset`
node and in a citation box far below the fold. A source line now renders directly
under the byline, in the text:

> Source: Daily Life Hacks {dataset name} ({n} rows, prices observed {period}, United
> States). Nutrition values from USDA FoodData Central. Full methodology and the raw
> CSV are public.

This is the "only source for a number" lever made legible: an extractor reading the
top of the page gets the number, the count, the observation period, the geography and
the upstream nutrition authority in one sentence.

### 5.3 Heading hierarchy

`/nutrition/` and `/tips/` jumped **h1 → h3** (the article cards render `h3`, and
unlike `/recipes/` those two pages had no intervening `h2`). `/contact/` rendered an
`h3` before its first `h2`. All three fixed with real section headings, not level
relabelling.

### 5.4 Tables

`th` elements in every template I own now carry `scope`. See section 8 for the one
case I could not reach.

---

## 6. The calculator crawlability verdict

**Verdict: they were half-invisible, and the half that was invisible was the half
worth citing.**

All 7 calculators already rendered their prose, headings, form labels and FAQ
server-side — so "invisible to a crawler" was too harsh. But every tool that carries
*data* fetched its CSV at runtime and rendered a placeholder in the static HTML:

- `/tools/fiber-per-dollar-calculator/` → "Loading 102 rows of beans, oats, eggs…"
- `/tools/grocery-budget-calculator/` → "Loading the published menus…"
- `/tools/grocery-unit-price-calculator/` → "Loading the published food-price tables…"

Worse, on the fiber calculator the whole tool body — **including the `DataProvenance`
block naming the sources** — sat inside `<div id="fpd-content" class="hidden">`, which
stays `display:none` until the fetch resolves. A crawler saw a headline, an intro
paragraph, and no numbers at all.

### What I changed

Both data-carrying calculators now read the same CSVs **at build time** and render a
static, always-visible table below the interactive tool. The tool is untouched and
still owns interactivity; the static block owns crawlability. `DataProvenance` was
moved out of the JS-hidden container.

| Tool | no-JS `<main>` text before | after | tables | `th` (all scoped) | data rows |
|---|---:|---:|---:|---:|---:|
| fiber-per-dollar-calculator | 2,277 | **11,596** | 3 | 122 | **105** |
| grocery-budget-calculator | 5,302 | **7,389** | 3 | 22 | 13 |
| grocery-unit-price-calculator | 4,393 | 4,393 | 0 | 0 | 0 |
| recipe-cost-calculator | 3,481 | 3,481 | 1 | 8 | 1 |
| grocery-trip-savings-calculator | 3,000 | 3,000 | 0 | 0 | 0 |
| recipe-finder | 3,280 | 3,280 | 0 | 0 | 0 |
| shopping-list-builder | 3,402 | 3,402 | 0 | 0 | 0 |

The fiber calculator now serves all **102 ranked rows** (53 fiber + 49 protein) as real
HTML with `<caption>`, `scope="col"` headers and `scope="row"` food names, plus the
source, observation period and geography in text above them. The budget planner serves
all **10 priced menu days** with grams and cost per person.

The other four tools are genuinely input-only utilities — they compute from what the
user types and have no dataset to expose. Nothing to render, and padding them with
fake output would be worse than leaving them.

**Note on scope drift:** another agent added new tool pages to `src/pages/tools/`
during this audit (an 8th calculator was present in the final build). Those inherit the
sitewide entity graph automatically from `BaseLayout` — verified, zero dangling refs —
but they were authored after my pass and did not get a `BreadcrumbList` or a
build-time static data block. Whoever owns them should apply the same two patterns;
`src/pages/tools/grocery-budget-calculator/index.astro` is the shortest example of both.

**Deliberately not done:** `/tools/grocery-unit-price-calculator/` loads the *same two
CSVs* as the fiber calculator. Rendering them there too would put 102 identical rows on
two URLs and manufacture a duplicate-content problem to solve a crawlability one.

### Schema type

All 7 are marked up as **`WebApplication`**, not `SoftwareApplication`. That is the
correct choice — `WebApplication` is a subtype of `SoftwareApplication`, so it inherits
eligibility for Google's "Software app" rich result while being more specific. Each
carries `applicationCategory`, `operatingSystem`, `browserRequirements`,
`isAccessibleForFree` and a zero-price `Offer`. They now also carry an `@id`,
`isPartOf` the site, a resolving `publisher`, and a `BreadcrumbList`.

---

## 7. Verification — the real numbers

`npm run build` (clean, exit 0, 275 pages), then every `<script type="application/ld+json">`
block in `dist/` extracted by regex and passed through `json.loads`, then `@id`
resolution per page, then a heading-hierarchy pass over every built file.

| Check | Before | After |
|---|---:|---:|
| HTML files | 267 | 276 |
| JSON-LD blocks | 934 | **1,232** |
| **Blocks failing `json.loads`** | **0** | **0** |
| **Dangling `@id` references** | **243** | **0** |
| Indexable pages with zero JSON-LD | 8 | **0** |
| Pages with a heading-hierarchy issue | 27 | 24 |
| — of those, indexable pages | 3 | **0** |
| `<time>` elements sitewide | **0** | **370** |
| `th` elements carrying `scope` | 4 | **198** |

A note on how these were measured: another agent was running `astro build` against the
same working tree throughout, which repeatedly wiped `dist/` mid-audit and produced
spurious `Cannot find module dist/chunks/…` and `prepareOutDir` failures that were not
code errors. The final numbers come from a build that exited 0, immediately snapshotted
to a stable directory, and audited there.

The 24 remaining pages without an `h1` are the 22 `/embed/*` chart pages (intentionally
chrome-free, `noindex`, own `<head>`, meant to be iframed) plus `/dashboard/` and
`/deploy-proof/`, which are internal. **Zero indexable page has a heading problem.**
Likewise the 24 pages with no JSON-LD are those same 22 embeds plus the two internal
pages.

Per-page-type, after:

| Page type | Pages | LD blocks | Zero-LD | Dangling | Missing required | Missing recommended |
|---|---:|---:|---:|---:|---|---|
| article (incl. recipe + study) | 227 | 1,157 | 0 | **0** | none | `recipeCuisine` ×80, `recipeCategory` ×42 |
| category | 5 | 16 | 0 | **0** | none | none |
| tool calculator | 7 | 27 | 0 | **0** | none | none |
| tools index | 1 | 4 | 0 | **0** | none | none |
| home | 1 | 2 | 0 | **0** | none | none |
| about | 1 | 5 | 0 | **0** | none | none |
| methodology | 1 | 3 | 0 | **0** | none | none |
| data hub | 1 | 4 | 0 | **0** | none | none |
| api-docs | 1 | 4 | 0 | **0** | none | none |
| contact / privacy / terms / disclaimer / thank-you / 404 | 6 | 6 | 0 | **0** | none | none |
| embed | 22 | 0 | 22 | 0 | n/a (`noindex`) | n/a |
| dashboard / deploy-proof | 2 | 0 | 2 | 0 | n/a (internal) | n/a |

Audit scripts: `audit_jsonld.py` and `audit_html.py` in the session scratchpad. Both are
re-runnable against any `dist/`.

**Caveat on the counts:** another agent was editing `src/data/articles/` and running
builds concurrently during this audit, so article counts drift between runs (219 → 227).
The before/after deltas for schema and headings are unaffected — they are per-page
properties, not totals.

---

## 8. What I could not fix, and who owns it

### 8.1 `th` without `scope` in markdown tables — `astro.config.mjs` (other agent)

156 `<th>` elements across 31 article pages come from markdown tables rendered by
Astro's own pipeline. They are unreachable from any template I own, because
`render(article)` hands back a component, not editable HTML.

**The fix is one rehype plugin** in `astro.config.mjs`:

```js
// markdown: { rehypePlugins: [...] }
function rehypeTableScope() {
  return (tree) => visit(tree, "element", (node, _i, parent) => {
    if (node.tagName !== "th") return;
    const inHead = parent?.type === "element" && parent.tagName === "tr";
    node.properties.scope = node.properties.scope ?? "col";
  });
}
```

**Honest sizing:** this is an accessibility improvement, not a citation blocker. A `th`
inside `<thead>` already has its column scope inferred by the HTML spec, and every
serious extractor parses table structure rather than the `scope` attribute. Worth doing;
not worth prioritising.

### 8.2 `recipeCuisine` on 80 recipes — `src/data/articles/` (other agent)

**Zero** articles carry a cuisine tag. I checked all 15 common cuisine terms across
every file in `src/data/articles/`. There is no honest derivation available and I did
not invent one. Same for the 42 recipes with no meal-type tag.

Both are *recommended*, not required, so no recipe is invalid without them. Fixing it
means adding `recipeCategory` / `recipeCuisine` to the frontmatter of the 80 recipes.
The schema fields already exist in `src/content.config.ts` and the template already
prefers a declared value over the derived one — so the moment frontmatter gains a value,
it wins automatically. No further template work needed.

### 8.3 `robots.txt` — other agent. Nothing needs changing.

Reported, not edited. It is in good shape and I found no problem:

- Every AI-answer crawler that matters is named **explicitly** with its own group:
  `OAI-SearchBot`, `ChatGPT-User`, `GPTBot`, `PerplexityBot`, `ClaudeBot`, `Claude-User`,
  `Google-Extended`, `Applebot-Extended`, `Bytespider`. The file's own comment correctly
  notes that a crawler obeys only its most specific group and does not merge `*` — which
  is the mistake most sites make.
- `bingbot` **and** `adidxbot` are both named. Given that ~41 AI citations/day come via
  Bing/Copilot, that is the single most load-bearing thing in the file.
- Sitemap and image-sitemap both declared. No `Crawl-delay`.

Two observations, neither urgent:
1. **`Perplexity-User` is not named.** Perplexity runs a live user-triggered fetcher
   separate from `PerplexityBot`, exactly as OpenAI runs `ChatGPT-User` alongside
   `GPTBot`. It currently falls through to the permissive `*` group, so it *is* allowed —
   but every other engine's live-fetch agent is named explicitly here and this one is the
   odd omission.
2. Unnamed crawlers (`Amazonbot`, `meta-externalagent`, `cohere-ai`, `YouBot`) inherit
   `*`'s `Allow: /`. That is the right default for a site that wants citation. No change
   needed — noting it so nobody "tightens" it by accident.

### 8.4 `llms.txt` — confirmed current, not expanded

Per the brief, and per this project's own research (F8 in
`traffic-sweep/01-search-engines.md`: ~408 fetches across 500M AI bot visits over 90
days, flagged `MYTH`), I spent no time expanding it. I verified it instead:

- The claims match the data. "53 foods ranked" / "49 sources ranked" — the CSVs hold
  exactly 53 and 49 data rows.
- Every URL in it resolves to a page that exists in `dist/`.
- The limitations paragraph is honest and still accurate (the CSVs still carry no
  FoodData Central ID or per-row observation date).
- **One fix made:** `/about` and `/contact` were the only two URLs missing a trailing
  slash, so they 301'd. Now consistent with the other 12.

It is current and correct. Leave it alone.

---

## 9. Bottom line

The schema was never *broken* — nothing failed to parse, before or after. What it was
is **disconnected**: 243 pointers into nodes that did not exist on the page doing the
pointing, so on 219 article pages the article entity floated free of any site entity,
and on 22 study pages the dataset floated free of any catalog. That is now zero.

But the schema work is housekeeping, and it should be read as housekeeping. Per the
controlled Ahrefs finding, none of section 4 will move AI citation. The changes with a
real claim on the 41/day Bing/Copilot channel are the boring ones in sections 5 and 6:

1. **370 `<time>` elements where there were 0**, and a visible "Updated {date}" on every
   article that was actually revised. Freshness is a measured correlate of citation and
   it was living exclusively in JSON-LD, where a text extractor never looks.
2. **102 ranked food rows and 10 priced menu days promoted from JS-fetched to
   server-rendered.** These are the numbers nobody else has — the entire basis of the
   "only source for a number" strategy — and until this change an extractor with no JS
   saw the word "Loading" where the numbers should be.
3. **Source attribution rendered as text** under the byline on all 22 data studies, with
   row count, observation period, geography and the USDA upstream in one sentence an LLM
   can lift whole.

Nothing was committed.


