# Missed Levers — what nobody has tried yet

**Date:** 2026-07-28 (filename kept as briefed)
**Scope:** research + measurement only. No commits, no edits to `src/data/articles/`, `src/pages/tools/`, `src/components/Newsletter*`.
**Premise:** the last 24h of work — internal linking, titles, meta descriptions, answer-first restructuring, schema, Dataset markup, `/data/` hub, embeddable charts, RSS, IndexNow, public JSON API, MCP server, dataset repo, 8 articles, Pinterest rebuild — is all one category: *make the existing pages better*. This file only contains things that are **not** that.

**Read alongside, not instead of:** `reports/growth/traffic-sweep/01-07`, `authority-without-outreach-2026-07-26.md`, `bing-indexing-2026-07-26.md`, `traffic-surfaces-2026-07-26.md`. 601 methods are already catalogued there. Everything below is either (a) absent from those files, or (b) present but with a *wrong verdict* that new measurement overturns.

---

## Status: COMPLETE

---

## 0. Measurements taken today (facts, not opinions)

All measured live against `https://www.daily-life-hacks.com` on 2026-07-28.

### 0.1 Edge is not blocking anything — this hypothesis is dead

Cloudflare shipped default AI-crawler blocking to many zones in 2025. It is **not** on here. Every crawler UA returns `200` on a live article:

| User-Agent | HTTP |
|---|---|
| GPTBot/1.1 | 200 |
| OAI-SearchBot/1.0 | 200 |
| ClaudeBot/1.0 | 200 |
| PerplexityBot/1.0 | 200 |
| bingbot/2.0 | 200 |
| Googlebot/2.1 | 200 |
| Google-Extended | 200 |
| meta-externalagent/1.1 | 200 |
| Amazonbot, Applebot, Bytespider | 200 |

`robots.txt` names all of them with explicit `Allow: /`. No `/.well-known/content-signals`, no edge WAF bot rule firing. **Rule this out permanently — it is not the problem.**

### 0.2 Delivery speed is fine

- Homepage: TTFB 90–120 ms warm (Israel → CF edge), 91.9 KB HTML uncompressed, **17.7 KB with brotli/gzip**.
- Article page: TTFB ~200 ms, 91.9 KB HTML.
- `_astro/*` immutable 1-year cache. Static HTML from Cloudflare Pages.
- No render-blocking third-party JS in the head.

**There is no meaningful page-speed lever here.** Time spent on Core Web Vitals is time not spent on the actual problem. (Caveat and the one real exception in §0.4.)

### 0.3 The deployed sitemap does not match the committed config

`astro.config.mjs` computes `<priority>` for every URL and attaches image extension tags (`img`) per article. The **live** `sitemap-0.xml` has:

- 237 `<loc>`, 219 `<lastmod>`
- **0 `<priority>`**
- **0 `<image:loc>`** — despite `xmlns:image` being declared in the urlset

So the image sitemap that was written is not actually being served. Either the deployed build predates the change or `@astrojs/sitemap`'s `serialize()` is dropping the non-standard `img` field (its exported `SitemapItem` type is `Pick<SitemapItemLoose, 'url'|'lastmod'|'changefreq'|'priority'|'links'>` — `img` is not in it). **Priority is missing too, and `priority` *is* in that type**, which points at a stale production build rather than a type problem. Needs a local `npm run build` + diff before anyone claims the image sitemap shipped.

### 0.4 Scheduled article releases silently do not happen

`/how-much-protein-in-two-eggs/` — one of the 8 new articles — returns **404 on production right now**, while it is present in a fresh local build's sitemap. Reason: `publishAt` is evaluated at **build time**, and Cloudflare Pages only builds on push. An article whose `publishAt` has passed stays 404 until somebody pushes something else.

That is a real, unglamorous bug: **content the owner has already written and paid for is not reachable.** A daily scheduled deploy (or a cron-triggered Pages build hook) fixes it.


### 0.5 Real browser measurement of an article page (not a guess)

`https://www.daily-life-hacks.com/animal-protein-per-dollar-ranked/`, real Chrome, Navigation + Resource Timing:

| Metric | Value |
|---|---|
| TTFB | 126 ms |
| DOMContentLoaded | 461 ms |
| Load event | 3,020 ms |
| HTML transfer (compressed) | 22.3 KB |
| HTML decoded | 92.3 KB |
| Sub-resources | 13 |
| **Total page transfer** | **105.7 KB** |
| Images without width/height | 2 |
| Lazy-loaded images | 6 of 9 |

Largest resources:

| Resource | Bytes | Duration |
|---|---|---|
| `animal-protein-per-dollar-ranked-chart.jpg` | **66,708** | 212 ms |
| `...-main-400w.webp` | 17,082 | 205 ms |
| `_slug_.CSS` | 9,971 | 34 ms |
| `ClientRouter…js` | 5,746 | 44 ms |
| `/api/rating?...` | 379 | **2,830 ms** |
| `/rum?` | 300 | **2,698 ms** |

**Verdict on §3 of the brief (technical wins): there is no page-speed lever worth having.** A 106 KB page at 126 ms TTFB is already better than almost every competitor in this niche. Two things are worth noting anyway, and neither is a ranking lever:

1. **The chart is 63% of the page weight** — a raw JPEG with no WebP variant and no `srcset`, while every hero image on the site *does* have WebP variants. 66.7 KB of a 105.7 KB page. Fixing it halves the page. It will not change rankings.
2. **`/api/rating` and `/rum?` take 2.7–2.8 s each** and are what push the load event to 3.0 s. They are after-paint and do not affect LCP, but they are the only slow thing on the site.

The site is not in CrUX (no field data available) — which is itself the finding: **there is not enough real traffic to generate Core Web Vitals field data.** Optimising CWV on a site with no CrUX record optimises a metric Google cannot even read for you.

### 0.6 The data corpus is smaller than the strategy assumes

Counted directly from `public/data/*.csv`:

- **22 CSVs, 474 total rows, 165 unique foods, 31 distinct column names.**
- Largest file: 53 rows. Median: ~18 rows.

### 0.7 The published HTML contains less data than the CSV

`animal-protein-per-dollar-ranked-2026.csv` has **21 rows**. The live article renders **1 table with 12 data rows**. Nine of the twenty-one foods the site actually measured are not in the HTML that answer engines read.

Live JSON-LD on that page: `WebPage`, `Article`, `BreadcrumbList`, `Dataset`, `FAQPage`. (`FAQPage` is dead weight — Google deprecated FAQ rich results effective 2026-05-07.)

This matters much more than it looks. See §2.

---

# The five things nobody has tried

Ordered by how much they change the picture, not by effort.

---

## LEVER 1 — Stop investing in Copilot. It is the smallest AI engine, and its citations are structurally unclickable.

**This is the most important finding in the file, and it is a stop-doing, not a do.**

The site's "41 Bing/Copilot citations a day" has been treated as its best-performing channel. Three measured facts say it is not a channel at all.

**Evidence — Copilot is the smallest AI referrer, not the biggest.**
Similarweb, May 2026, share of all AI referral traffic:

| Engine | Share of AI referrals |
|---|---|
| ChatGPT | 52.7% |
| Gemini | 27.3% |
| Claude | 8.9% |
| DeepSeek | 4.0% |
| Grok | 2.8% |
| **Copilot** | **2.0%** |
| Perplexity | 1.3% |

The site is winning the engine that sends the least traffic. High Copilot citation counts reflect Bing's index reach — which a zero-authority site can get into — not audience size.

**Evidence — a "citation" in Bing Webmaster Tools is not an impression of a page.**
Microsoft's own definition (blogs.bing.com, *Introducing AI Performance in Bing Webmaster Tools Public Preview*, 9–11 Feb 2026): a Citation is *"the total number of citations that are displayed as sources in AI-generated answers"* — **displayed**, sampled, not complete, and Microsoft explicitly states it does not indicate *"ranking, authority, or the role of any page within an individual answer."* Bing reports **no clicks and no CTR**. Search Engine Land, 10 Feb 2026: *"Bing Webmaster Tools still won't reveal how those citations translate into clicks."* Also note: Microsoft ran a **data backfill on 1 June 2026** that inflated historical citation counts — if the 41/day window includes early June, it is overstated.

**Evidence — the click rate on an in-answer citation is ~1%, and no format changes it.**
- Pew Research, 22 July 2025, 900 US adults, browser panel, 68,879 real queries: **1% of visits** produced a click on a source link inside an AI summary.
- He & Liu, arXiv:2512.12207, 13 Dec 2025, controlled experiment, **N=394**, five citation-presentation conditions: **no presentation format significantly increased clicks.** The condition that *previewed* the source (hover card) produced the **fewest** clicks (0.32/participant vs 0.85 for a collapsible list). Making your content easier to preview inside the answer reduces click-through.
- TollBit first-party publisher referral logs: AI-platform CTR **0.8% → 0.48% → 0.27%** across three quarters. Monotonic decline.

**The arithmetic:** 41 citations/day × ~1% ≈ **0.4 clicks/day**. That is the channel, fully optimised.

**And the trap underneath it.** arXiv:2604.25707 (*citation selection vs citation absorption*) measures which content the engine actually uses to build its answer. Statistical/numeric evidence has the **highest absorption uplift (+61.55%)**. High absorption means the answer is more complete, which means less reason to click. **For a nutrition-cost-data site, "get cited more" and "get clicked more" are in direct tension.** Nobody has measured how to resolve that. Every further hour spent making the numbers easier for an engine to lift is an hour spent making the click less likely.

### First concrete action (10 minutes, no new account)

**Microsoft Clarity is already installed on this site.** Verified live today: `clarity.ms/tag/w40uh6kjsh` loads on every page, alongside GA4 `G-PRSS2YN6G2`.

**Clarity Citations went generally available on 13 May 2026, is free, and is the only tool that reports Copilot/Bing-generative citations *and* AI referral sessions in one first-party dashboard** — Queries Cited, Citation Rate, Share of Authority, and *"the percentage of sessions on your site originating from AI assistants."*

Open the existing Clarity project and read the AI referral number. That converts the single largest unknown in this whole programme — *do 41 citations produce any visits at all?* — into a fact, today, for free, with an account that already exists.

Two calibrations when reading it:
- GA4 added a native **"AI Assistants"** channel (confirmed by Google 13 May 2026, medium `ai-assistant`). It **excludes Google AI Overviews and AI Mode, and excludes Perplexity**, and is **not retroactive**.
- **Copilot appends no UTM and Microsoft publishes no referrer spec.** ChatGPT appends `utm_source=chatgpt.com`; Copilot appends nothing. Independent 2026 analyses put the share of AI referrals arriving with **no referrer at one-third to ~70%** (Kevin Indig: 70.6% land as Direct). **Whatever number you read is a floor, not a total.**

**What I could not verify:** there is no credible study anywhere breaking AI-citation CTR down by citation position, by whether the brand name is shown, by page-title wording, or by sole-source status. The widely-quoted "33.07% at position #1 → 13.04% at #10" curve traces to The Digital Bloom's 2026 aggregation, where positions #2–#9 are **explicitly labelled "estimated"** and revenue figures are formula-derived, not observed. The "verified publisher blue badge lifts CTR 15–20%" claim has no Microsoft source and appears fabricated. Do not plan around any of it.

---

## LEVER 2 — The niche has a measured ceiling of ~5,000 visits/month. The query family is wrong, not the pages.

Nobody has asked the question that decides everything else: **how much traffic exists in "cost per nutrient" at all?**

**Evidence — total ownership of this exact niche is worth under 5K/month.**
`efficiencyiseverything.com` has owned "Calorie Per Dollar List" and "Protein Per Dollar" for **over a decade**. It ranks for *"highest protein foods per us dollar"* and *"high fiber foods per calorie per dollar"*. It has a sortable 100-row table and a downloadable Excel file. Similarweb, June 2026: **~4,800 visits/month.**

That is the incumbent, unchallenged, with a ten-year head start. It is the ceiling.

**Evidence — the adjacent query family is ~60× bigger and is won with a plain article.**

| Site | Visits/mo | Organic | Mechanism |
|---|---|---|---|
| myfooddata.com | ~300K | 69% | "foods highest in X" + URL-addressable nutrient tool |
| nutritionix.com | ~275K | 43.5% **Direct** | B2B: manages restaurants' own nutrition pages; ~700M API calls/mo |
| fastfoodnutrition.org | ~130K | 74% | pure programmatic `{restaurant}/{item}` |
| nutritionvalue.org | ~75K | 62% | top keywords are its **calculators**, not its database |
| **efficiencyiseverything.com** | **~4.8K** | — | **the cost-per-nutrient niche, fully owned** |

For the head term *"foods high in fiber"*, the #1 result is myfooddata's **article**, not their tool. The volume is not in "per dollar."

**Evidence — I ran the site's own core query today.**
Three live searches on the site's flagship topic ("cheapest protein per dollar", "cheapest source of protein per dollar 2026", "protein per dollar beans vs chicken"). Results:

- daily-life-hacks.com appeared in **1 of 3**, in last position, as *"18 Plant Proteins Ranked by Real Cost"*.
- In the synthesized answers, **the site's numbers were never quoted.** Every quoted figure came from: `proteinbro.net`, `bulkedapp.com`, `caloriescanai.com`, `nutrola.app`, `grabguides.com`, `getmistapp.com`, `macromatefastfoodhacks.com`, `frugalforless.com`.
- **Every one of those is a calorie-tracking app's content-marketing blog.** None has authority. None has a decade of links. They are winning on format, not on trust.

I pulled `proteinbro.net/nutrition/cheapest-protein-sources` apart: ~1,200–1,500 words, **no author, no About page, no schema**, a 20-item ranked list carrying four normalized metrics per row (g/$, protein/100g, cal/100g, protein % of calories), a stated price basis (*"US average prices, March 2026"*), and a linked calculator. Title: *"Cheapest Protein Sources Ranked — Grams Per Dollar (2026 Prices)"*.

E-E-A-T, authorship and schema are **not** what separates them from us. Per-row normalized numbers and a stated, dated price basis are.

**Independent confirmation the site's pages *can* win:** a separate live test pulled `plant-protein-per-dollar-ranked` with exact figures ("97.9 g protein per dollar", "dry black beans 81.0") into synthesized answers for 2 of 5 test queries. **The mechanism is already firing. The problem is the size of the pond.**

### First concrete action

Before any more work on "per dollar" pages: pull the actual search demand for the two families side by side — `cheapest protein per dollar` / `protein per dollar` vs `foods highest in protein` / `foods high in fiber` — from Bing Webmaster Tools' Keyword Research (free, account already exists) rather than a paid tool. If the ratio is anything like the traffic ratio above, the strategic conclusion writes itself: **the 22 datasets are the asset, "per dollar" is the wrong doorway to them.**

---

## LEVER 3 — Schema is not an AI-citation lever. Visible HTML tables are. And the site publishes less data than it holds.

This overturns a standing assumption in the existing reports, which treat schema markup as AEO work.

**Evidence — controlled test: JSON-LD does not cause AI citations.**
Ahrefs ran a controlled test on **1,885 pages that added JSON-LD**. Effect on AI Mode and ChatGPT citation: **approximately zero**. Effect in AI Overviews: **significantly negative**. AI systems extract **visible HTML**, not structured data.

**Evidence — statistics in visible text is the strongest-evidenced lever that exists.**
The peer-reviewed GEO paper (KDD 2024, ~10,000 queries) measured that **adding specific statistics raises visibility in generated answers by 30-40%**. That is the best-supported finding in the entire GEO literature, and it is exactly what this site is made of.

**Evidence — you do not need to rank to be cited.**
Ahrefs, March 2026, 863K keywords / 4M AI Overview URLs: only **38%** of AIO citations come from pages ranking top-10 — down from 76% in mid-2025 — and **31% come from pages ranking beyond position 100**. Separately, Surfer analysed ~5M citation URLs across 20,000 prompts and found the correlation between domain authority and AI citation is **approximately zero** ("close enough to zero to be noise").

That is genuinely good news, and it contradicts the "AEO is mostly a byproduct of ranking" verdict in `traffic-sweep/01-search-engines.md` Part F. **Citation without ranking is now the majority case.**

**The defect this exposes, measured today.**

`animal-protein-per-dollar-ranked-2026.csv` contains **21 rows**. The live page renders **one table with 12 data rows**. Nine of the twenty-one foods the site measured are absent from the HTML an answer engine reads. They exist only in a CSV behind a download link and in the JSON API — both of which the Ahrefs evidence says the engines do not use.

Across 22 CSVs this is **474 measured rows**, of which a substantial fraction never reaches rendered HTML.

Meanwhile the pages still carry `FAQPage` JSON-LD, which Google **deprecated effective 2026-05-07** (docs removed 2026-06-15). It is inert.

### First concrete action

For each of the 22 datasets, count CSV rows against the `<tr>` count on the corresponding live page. Where the page truncates, render the full table. This is not writing content — the numbers already exist and are already paid for.

**Honest counterweight:** re-read Lever 1's absorption finding first. Rendering the complete table maximises the chance the engine answers in place and the reader never arrives. If the goal is citations and brand mentions, do it. If the goal is sessions, it may work against you. Nobody has measured which way that resolves.

---

## LEVER 4 — Four blockers everyone is planning around are not real blockers.

The existing reports gate roughly a dozen actions behind the CC BY reversal and behind surfaces assumed dead. Direct verification of the primary sources on 2026-07-28 says four of those gates are open.

### 4a. `schema.org/Dataset` does NOT require a licence

Google's own doc (`developers.google.com/search/docs/appearance/structured-data/dataset`, fetched today): the **required** properties are `name` and `description` only. **`license` is listed under "Recommended properties."** Dataset is confirmed live in the current Search Gallery.

`authority-without-outreach-2026-07-26.md` and `traffic-sweep/01` both treat the CC BY revert as a blocking prerequisite for Dataset Search — "Dataset markup effectively requires stating a license." **It does not.** The 22 dataset pages can carry full Dataset markup and be indexed in Google Dataset Search with no licence declaration at all. This is the lowest-competition indexed surface available to the site, and it has been sitting behind an imaginary gate.

### 4b. Zenodo issues a DOI without an open licence

`zenodo.org`, live with July 2026 uploads. Free account, DOI "registered within seconds", and explicitly "Open or closed — ... via our restricted access mode." The licence field is an SPDX picker with custom-licence support; CC-BY is the **default, not a requirement**. Zenodo mints DataCite DOIs for free and is harvested by OpenAIRE and Google Dataset Search. (DataCite direct membership is institutions-only and paid; Zenodo is the free route in.)

*Caveat: `help.zenodo.org/docs/deposit/manage-access/` returned 404. Confirm the custom-licence field accepts a proprietary entry before uploading.*

### 4c. Google Web Stories is NOT deprecated

`developers.google.com/search/docs/appearance/web-stories-creation-best-practices` shows **"Last updated 2026-06-09 UTC"**, no deprecation notice, still listed in the Search Gallery. The control for this test: Google **does** document its deaths — FAQ rich results deprecated effective **2026-05-07**, docs removed 2026-06-15; Practice Problem docs removed 2026-01-06. Nothing comparable exists for Web Stories.

The `traffic-sweep` verdict ("a zombie format... my honest read: skip it") was a judgement priced on building an AMP pipeline from scratch. **This repo already has a Remotion vertical-video pipeline, 31 charts and a `kinetic-video` skill.** The marginal cost is far lower here than the sweep assumed, and Web Stories remains one of the few formats with a direct line into Discover — a surface that ignores backlinks entirely. Reach has genuinely shrunk (removed from Google Images; carousel not grid). Still a lottery ticket, but a cheaper one than the sweep priced.

### 4d. The dead ends are now definitively dead — stop revisiting them

Verified by fetch on 2026-07-28, so nobody spends another hour:

| Surface | Evidence |
|---|---|
| **Brave Search submission** | `search.brave.com/webmaster` -> **404**; `/help/webmaster-tools` -> **404**; no webmaster topic in the help index. Brave is **not** an IndexNow participant. Crawl-only. SEO blogs citing that URL are wrong. |
| **Mojeek** | `mojeek.com/submit.html` -> **404**. Mojeek staff on their own forum: "there is currently no way to manually submit your site to Mojeek." |
| **Stract** | GitHub repo "archived by the owner on Apr 2, 2026"; `/webmasters` -> 404. Dead. |
| **Bing Pages** | Marketing page renders, but the application endpoint `bing.com/bp/login` -> **404** and `bing.com/bp/` -> **404**. The page still references Mixer (dead since 2020). Zombie. |
| **Bing Places** | Redirects to `bing.com/forbusiness/`. Physical-location businesses only. Structurally unavailable. *(This was the one named surface with no coverage anywhere in `reports/growth/` — now closed.)* |
| **MSN / Microsoft Start Partner Hub** | Microsoft's doc: "MSN Partner Hub is invitation-only... you will need the unique Invite code that was emailed to you by Microsoft." Confirmed by an unanswered Microsoft Q&A post dated **2026-06-04** from a publisher stuck at the gate. |
| **Kagi Small Web** | Route exists; the site is **ineligible** — rules bar advertisements, affiliate links, and "popups (newsletter signup...)". The newsletter modal alone disqualifies it. Kagi has ~65k total subscribers. |
| **Yandex / Naver / Seznam / Yep** | **All redundant.** `indexnow.org`, fetched today: "support from Microsoft Bing, Naver, Seznam.cz, Yandex, Yep." One IndexNow ping already covers all four. Seznam's console 404s anyway; Yandex US share is 0.19-0.35%. **Do not create these accounts.** |
| **Common Crawl** | FAQ: "we do not generally archive any entire website but a randomly selected subset." No inclusion request exists. |
| **Merchant Center free listings** | Price is "Required for all products"; free listings surface product pages only. A non-commerce site has nothing to feed it. |
| **Pocket / Firefox New Tab** | Pocket shut 2025-07-08, data deleted 2025-10-08, integration removed in Firefox 140. No publisher route. |
| **Wikipedia external links** | "you should avoid linking to a site that you own, maintain, or represent." Off the table. |
| **Browser / phone new-tab feeds** | **No open publisher programme exists anywhere in 2026.** MSN is invite-only, Firefox lost its pipeline with Pocket, Opera/Samsung/Xiaomi route through partner deals. |

Three small live survivors, listed only so they are not re-researched: **searchmysite.net** (free Basic tier, live form at `/admin/add/`, 50-page cap, no card), **Marginalia** (live PR/issue/email submission, but it prioritises non-commercial content so ranking will be poor), **Brave Goggles** (genuinely open, no signup — but a Goggle is a *ranking lens*, not an inclusion route; a self-boosting Goggle nobody installs sends nothing). Combined realistic value: a handful of visits a month. Do them in one sitting or not at all.

---

## LEVER 5 — The mechanism every trafficked competitor shares: one dataset, thousands of URLs. This site has one dataset, one URL.

This is the only lever here with a genuinely large ceiling, and it is the one the site is furthest from.

**Evidence — the mechanism, named precisely.**

`myfooddata.com` (~300K visits/month, 69% organic, 4.1 pages/visit) runs its nutrient ranking tool at:

```
tools.myfooddata.com/nutrient-ranking-tool/{nutrient}[+{nutrient2}]/{food-group}/{highest|lowest}
```

Nutrients x food groups x nutrient pairs x direction = **tens of thousands of individually indexable URLs generated from one dataset**, each of which happens to be a literal query somebody types ("foods highest in fiber", "nuts and seeds highest in fiber and protein"). Nine free tools, no login on any of them.

`nutritionvalue.org` (~75K/month, 25.7K ranking keywords): its top organic keywords are **"nutrition calculator"** and **"recipe calorie calculator"** — the *tools*, not the food database. The database is the substrate; the tool state is the entry page.

`fastfoodnutrition.org` (~130K/month, 74% organic): pure `{restaurant}/{item}` programmatic pages over ~20 chains. No API, no app, no community, no authority story.

`in2013dollars.com`: one engineer, programmatic pages over free BLS CPI data, **1.51M visits/month, 14.1K referring domains**. No widget programme. No API. It won by *hosting and ranking pages*, not by distributing anything.

**What this site has instead.** `src/pages/tools/` contains 10 entries — `fiber-per-dollar-calculator`, `grocery-budget-calculator`, `grocery-unit-price-calculator`, `grocery-trip-savings-calculator`, `recipe-cost-calculator`, `recipe-finder`, `rice-and-beans-per-person-calculator`, `shopping-list-builder`, `dried-beans-to-canned-converter`. **Each is a single URL.** `/tools/fiber-per-dollar-calculator` is one URL holding two datasets. myfooddata's equivalent is thousands of URLs holding one.

That is the whole difference, stated in one sentence.

**Evidence that this pattern is still permitted in 2026.** fastfoodnutrition and in2013dollars are live proof. What separates survivors from sites hit by the scaled-content-abuse policy is that each page resolves a distinct real query **and computes a value the source does not publish** — a rank, a ratio, a winner, a break-even — rather than reprinting a source row. The door is open.

**The honest constraint, measured today.** Counted directly from `public/data/*.csv`:

- **22 CSVs, 474 total rows, 165 unique foods, 31 distinct column names**
- largest file 53 rows, median ~18

**165 foods is not a programmatic corpus.** 165 choose 2 gives ~13,500 nominal pairs, but only a small fraction are defensible comparisons a human would search for. The problem is **inventory, not permission**. myfooddata generates from the full USDA FoodData Central set; this site generates from 165 hand-priced items.

So the realistic version of this lever is not "build 10,000 pages." It is:

1. Expand the priced-food inventory. That is the actual bottleneck, and it is the one thing that unlocks everything above.
2. Route each defensible slice of it to its own URL with a computed verdict.

### First concrete action

Do the arithmetic before the engineering: from the 22 CSVs, enumerate exactly how many `{nutrient} x {category} x {direction}` and `{food A} vs {food B}` URLs are **defensible** — meaning each has a distinct answer, a computed verdict, and a query a person would plausibly type. If the honest number is under ~300, this lever is not available at current inventory and the priority becomes expanding the food list instead. That count is a half-day of scripting against files that already exist, and it decides whether the largest lever on this list is real.

---

## Technical findings (Section 3 of the brief), consolidated

**The headline: there is no technical SEO win of consequence available.** 106 KB total page weight, 126 ms TTFB, static HTML at the edge, every AI and search crawler returning 200. The site is technically in better shape than the competitors beating it. Reported anyway, because three of these are real defects:

| # | Finding | Severity | Evidence |
|---|---|---|---|
| T1 | **8 newly written articles are 404 on production.** `publishAt` is evaluated at **build time**; Cloudflare Pages only builds on push. A scheduled article stays 404 until an unrelated commit is pushed. Verified: `/how-much-protein-in-two-eggs/` returns **404** live while present in a fresh local build. | **High** — paid-for content is unreachable | live curl |
| T2 | **Live sitemap is missing `<priority>` on all 237 URLs and all image extension tags**, though `astro.config.mjs` computes both and declares `xmlns:image`. Verified identical on `www`, apex and `*.pages.dev`, `cf-cache-status: DYNAMIC` (not a cache artefact), no committed `public/sitemap*` overriding it, sitemap excluded from Pages Functions in `_routes.json`. `package-lock.json` **is** committed, so a CI version drift is ruled out. **Unexplained.** Reproduce with one clean `npm run build` and diff `dist/sitemap-0.xml` against the live file. *(Note: three local build attempts on this machine died on Windows file locks — `EBUSY ... copyfile public/images/ingredients/...`. That is a local antivirus/indexer issue, not a code defect.)* | Medium | live fetch x3 origins |
| T3 | **Chart images are 63% of page weight.** `animal-protein-per-dollar-ranked-chart.jpg` is a **66.7 KB raw JPEG** with no WebP variant and no `srcset`, on a 105.7 KB page — while every hero image on the site does have WebP variants. | Low (speed is already fine) | Resource Timing |
| T4 | **`/api/rating` (2,830 ms) and `/rum?` (2,698 ms)** are the only slow things on the site and push the load event to 3.0 s. After-paint, so no LCP impact. | Low | Resource Timing |
| T5 | **IndexNow is being over-submitted.** 238 URLs re-submitted on 2026-07-28 (`reports/growth/indexnow-backfill-2026-07-28.json`), against a history of ~3,700 submitted / **0 indexed / 9 crawled**. Repeatedly resubmitting unchanged URLs is the documented way to have submissions discounted. Submit **changed** URLs only — `scripts/indexnow-sitemap-diff.py` and `.github/workflows/indexnow-sitemap-diff.yml` already exist for exactly this and are **disabled**. | Medium | repo + prior baseline |
| T6 | **`FAQPage` JSON-LD still shipping** after Google deprecated FAQ rich results effective 2026-05-07. Inert, not harmful. | Cosmetic | live HTML |
| T7 | **Cloudflare is not blocking any crawler** — GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, bingbot, Googlebot, Google-Extended, meta-externalagent, Amazonbot, Applebot, Bytespider all return **200**. Rule this hypothesis out permanently. | Resolved | live curl x11 |
| T8 | **The site has no CrUX record** — not enough real traffic to generate Core Web Vitals field data. Optimising CWV here optimises a metric Google cannot read for this domain. | — | PSI/CrUX |

**Not worth doing, with evidence:** `llms.txt` (Ahrefs checked 137,210 domains — **97% of llms.txt files received zero requests in May 2026**, and no AI bot ever requested one that did not exist; a `/llms.txt` is currently live on this site and is doing nothing); more schema for AI citation (measured ~0, negative in AIO); widget/embed backlinks (Google's spam policy explicitly names "links embedded in widgets that are distributed across various sites" as link spam — the compliant version is nofollowed and passes nothing); recipe rich results (food bloggers reported 30-80% losses through 2025; 68% of US searches ended without a click in early 2026, 83% on AIO queries).

---

# The uncomfortable answer

The brief asked for this directly, so here it is without softening.

**After 601 catalogued methods, seven sweep files, and today's verification pass: there is no remaining lever that produces meaningful traffic without opening an account or spending money.**

Everything genuinely free and genuinely untried is now in this file, and its honest combined expected value is **tens of visits per month, not thousands**:

| Free, untried, real | Honest ceiling |
|---|---|
| Dataset Search markup on 22 pages (gate was imaginary) | 5-80/mo |
| Zenodo DOI without a licence declaration | ~0 traffic; citation credibility only |
| Render the full CSV tables in HTML | improves citation, may *reduce* clicks |
| Fix the 8 x 404 scheduled articles (T1) | recovers content already paid for |
| Fix sitemap priority/images (T2), IndexNow discipline (T5) | crawl hygiene, no traffic |
| searchmysite.net + Marginalia + Brave Goggle | single digits/mo |
| Web Stories off the existing Remotion pipeline | 0, or a Discover spike; lottery |

That is the complete list. It is not a growth plan. It is maintenance.

## Why free is exhausted, in three facts

1. **The niche's ceiling is measured, not theoretical.** `efficiencyiseverything.com` has owned "protein per dollar" and "calorie per dollar" for over a decade and gets **~4,800 visits/month**. Total, uncontested victory in this exact query family is worth less than 5K/month. No amount of on-site work beats an incumbent's ceiling.

2. **The one channel that is working does not convert, by measured design.** 41 Copilot citations/day x the ~1% in-answer click rate (Pew, 68,879 real queries) is **~0.4 clicks/day**, and a controlled N=394 experiment found **no presentation format increases those clicks**. Copilot is **2.0%** of AI referral traffic. This is not a channel with a tuning problem; it is a channel with a size problem.

3. **Every surface large enough to matter has a gate.** MSN Partner Hub: invitation-only, confirmed by Microsoft's own doc and a June 2026 publisher stuck at the gate. SmartNews and Flipboard's partner programme: application-reviewed. Firefox/Pocket: dead. Samsung/Opera/Xiaomi: partner deals only. Google Discover: no opt-in, pure lottery. Google organic: needs authority the site has no free route to acquire. That is not a gap in the research — that is the shape of the 2026 web for a small independent publisher.

## Ranked: what he would actually have to do

Ordered by expected traffic per unit of discomfort. Each one is something he has said he does not want to do.

### 1. Open a YouTube account. (Biggest single unlock, and the repo is already built for it.)

Ahrefs' 2026 correlation study of ~75,000 brands found **YouTube mentions had the strongest single correlation with AI visibility (~0.74)**, and YouTube is now the most-cited domain in AI Overviews. It is simultaneously the #2 search engine by query volume and a direct input into the AI answers the site is already trying to win.

The cost here is unusually low: `kinetic-video-bundle/` already contains a Remotion + ElevenLabs pipeline, there are 31 charts, and there is a documented `kinetic-video` skill. **The production capability is built and idle.**

Honest: YouTube views are not website visits (0.5-2% description click-through). A video at 10,000 views sends 50-200 clicks. The value is not the referral — it is the brand mention that feeds AI visibility and the audience asset itself, which may be worth more than the website.

*Caveat, stated plainly: the ~0.74 figure is correlational, from a study of mostly commercial brands, not small publishers. Treat it as a strong hypothesis, not a mechanism.*

### 2. Expand the priced-food inventory from 165 items to thousands. (Costs money or months.)

This is the only thing that unlocks Lever 5, which is the only lever with a six-figure ceiling. myfooddata generates ~300K visits/month from the full USDA food set; this site has **165 hand-priced foods**. Every trafficked comparable in the space runs the same mechanism — one dataset, thousands of URLs — and the site cannot run it on 474 rows.

This is a data-acquisition problem, not a writing problem. It costs either paid price data / labour, or a long automated collection effort. There is no free shortcut, and no amount of article-writing substitutes for it.

### 3. Rebuild a usable Reddit position. (Free, slow, and currently blocked by history.)

**Budget Bytes' #1 social source is Reddit** — ahead of Pinterest and YouTube — and it did not get there by posting links. It got there from a decade of *other people* naming it as the default answer. Reddit threads now rank at the top of Google for exactly these questions, so being named in one is borrowed SEO with a durable tail.

The domain is spam-filtered and there is an ECAH ban in the history. The honest version is: answer questions with the number in-comment and the method visible, never link, and let the resource be asked for. Slow, fragile, and it requires accepting a channel that has already burned him once.

### 4. Change the doorway from "per dollar" to "foods highest in X". (Free, but it is a strategic reversal.)

The volume is in the nutrition query family, not the cost one — myfooddata wins the head term with a plain article. The site's 22 datasets contain nutrition data as well as prices. This is the cheapest of the four, and it is the one that most directly contradicts the identity the site has been built around. That is why it is uncomfortable rather than expensive.

### 5. Not on this list: paid ads, paid links, paid indexing, paid directories.

None of them are recommended at any budget. Ads buy visits that stop when the money stops; the rest are either against policy or sell nothing. If money is spent, spend it on **item 2**.

## What I would tell him in one paragraph

The last 24 hours of work was good work and it was not wasted — but it was all applied to a pond that holds about 5,000 visits a month at absolute maximum, through a channel (Copilot citations) that converts at roughly one click per hundred citations. The free levers are now genuinely exhausted; what is left is worth tens of visits a month and should be done in one afternoon and then dropped. The real choice is between opening a YouTube account he does not want, buying food-price data he does not want to buy, or accepting that the site tops out in the low thousands of monthly visits. **The first thing to do, before any of that, is the ten-minute one: open the Microsoft Clarity project that is already installed and read the AI-referral number.** If 41 citations a day are producing zero sessions, an entire strategic assumption collapses today rather than in six months.

---

## Confidence and gaps

- **Strongest evidence here:** the Copilot share figures, the Pew 1% click rate, the He & Liu N=394 experiment, the Ahrefs JSON-LD controlled test, the Similarweb competitor traffic figures, and every measurement in Section 0 (taken live today).
- **Correlational, do not over-fit:** the YouTube ~0.74 AI-visibility correlation; the Seer "cited brands get 120% more organic clicks" halo.
- **Could not verify at all, and neither can anyone else:** AI-citation CTR broken down by position, brand display, title wording, or sole-source status. Every confident public claim on these traces to modelling, estimation, or fabrication. This is stated as a finding, not an omission.
- **Open, needs one command:** the sitemap anomaly (T2). Three local builds died on Windows file locks; a clean build on any other machine settles it.
- **Web-search budget was exhausted** before I could pull head-term volume for "foods high in fiber" directly. The 60x volume gap between the two query families rests on the competitor traffic comparison, not on a keyword-volume reading. Bing Webmaster Tools' free Keyword Research closes that gap in ten minutes.

*Compiled 2026-07-28. Research and measurement only. No commits. No edits to `src/data/articles/`, `src/pages/tools/`, or `src/components/Newsletter*`.*
