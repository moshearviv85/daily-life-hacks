# Traffic Sweep 01 — Search & Discovery Engines

**Site:** daily-life-hacks.com — budget food, nutrition-per-dollar data, recipes. US audience.
**State at time of writing:** ~216 articles, near-zero organic traffic, no backlinks, no ad budget, one operator (non-technical, works via Claude Code).
**Scope of this file:** every known way to get traffic from a *search or discovery engine* — Google and its properties, other web search engines, in-app/vertical search, AI answer engines, and structured-data/feed-based discovery surfaces.
**Research only.** Nothing here has been implemented. No site edits, no commits, no posting.

**Date compiled:** 2026-07-26

---

## How to read this

Each method has:

- **Name** — short, canonical. Where two popular names describe one tactic, they are merged and noted.
- **What it is** — one sentence.
- **Applied here** — what it concretely means for a budget-food / nutrition-per-dollar data site.
- **Effort** — Low (< 1 day) / Medium (days) / High (weeks+) / Ongoing.
- **Realistic traffic, zero-authority site** — a number range for the first 6–12 months, not a vibe. All numbers are estimates for *this* site's starting position (DR ~0, no links, thin brand signal) unless stated.
- **Flag** — one of:
  - `WORKS` — currently functioning, reproducible, worth doing.
  - `SITUATIONAL` — works only under a named condition. The condition is always stated.
  - `DEAD` — used to work, no longer does, or the surface was removed.
  - `MYTH` — widely repeated, never actually worked or was never a ranking/traffic factor.
- **Sources** — with dates. Anything I could not verify against a primary/dated source is marked `[UNVERIFIED]`.

**Estimating basis (important caveat):** the traffic numbers below are engineering judgment, not measured data from this site. A zero-authority site in a YMYL-adjacent niche (food/nutrition/health claims) is in one of the hardest positions post-2023 Helpful Content Update and the 2024–2025 core updates. Where a method's realistic outcome is "0" for the first year, it says 0.

---

## Index

- **Part A — Classic Google organic levers** (A1–A12): on-page, technical, long-tail, topic clusters, internal linking, refreshing, cannibalization, pruning, crawl budget, CWV, E-E-A-T, original data.
- **Part B — Google SERP features** (B1–B13): featured snippet, PAA, image pack, Google Images, video carousel, Top Stories, sitelinks, knowledge panel, recipe rich results, local pack, FAQ, HowTo, retired schema types.
- **Part C — Google properties as channels** (C1–C8): Discover, News, Web Stories, Business Profile, YouTube search, Dataset Search, Shopping free listings, request-indexing.
- **Part D — Non-Google search engines** (D1–D14): Bing, IndexNow, DuckDuckGo, Yahoo, Brave, Ecosia/Qwant/Staan, Yandex, Baidu, Naver, Seznam, Startpage, Mojeek, Marginalia, micro-engines.
- **Part E — Vertical and in-app search** (E1–E8): Pinterest, YouTube, TikTok, Instagram, Reddit, Amazon, recipe aggregators, Google Lens.
- **Part F — AI answer engines** (F1–F9): AI Overviews, AI Mode, ChatGPT, Perplexity, Copilot, other assistants, off-site brand mentions, llms.txt, training-data myths.
- **Part G — Structured data and feeds** (G1–G7): surviving schema types, sitemaps, RSS/Atom/JSON Feed, WebSub, IndexNow, MSN Partner Hub, robots image directives.
- **Part H — Browser/OS recommendation surfaces** (H1–H7): Chrome feed, Edge/Windows widgets, Firefox/Pocket, Samsung, Opera, Arc, AI browsers.
- **Part I — The graveyard** (I1–I22): dead, dubious and mythical methods still widely recommended.
- **Part J — Synthesis**: tally by flag, structural read, top 5, and what to deliberately avoid.

---

## Methods

# PART A — Classic Google Organic Levers

These are the "do the SEO properly" levers. For a zero-authority site they are necessary-but-not-sufficient: they determine whether you *can* rank once authority arrives, and they rarely create traffic on their own in year one. Budget them as insurance, not as growth.

---

## A1. On-page optimization (title tag, H1, intro, entity coverage)

**What it is:** Matching the page's title, heading, opening paragraph and body entities to the query the page is actually trying to win.

**Applied here:** Every one of the ~216 articles should have a title tag built around one head query with the modifier the niche actually uses ("cheapest protein per dollar", "cost per gram of protein", "$50 grocery budget for one week"). Nutrition-per-dollar content has an unusual advantage: the queries are numeric and specific, so exact-match titles are genuinely what users type.

**Effort:** Medium (216 pages, auditable by script; rewriting is the slow part).

**Realistic traffic, zero-authority site:** 0–100 visits/month on its own. Title rewrites move CTR on pages that *already* rank; with no rankings there is no CTR to move.

**Flag:** `WORKS` — but as a prerequisite, not a growth lever.

**Merge note:** "keyword optimization", "title tag optimization", "SEO copywriting" and "search intent matching" are the same tactic at different zoom levels. Counted once.

**Sources:** Google Search Central, "Creating helpful, reliable, people-first content" (updated 2024); Google, "Control your title links in Google Search results" (docs, current).

---

## A2. Technical SEO baseline (indexability, canonicals, sitemap, robots)

**What it is:** Ensuring Google can crawl, render, canonicalize and index every page you want indexed and nothing you don't.

**Applied here:** Astro 5 static output on Cloudflare Pages is already close to the ideal case — static HTML, edge delivery, no JS-rendering dependency. Realistic failure modes for this stack: paginated category/tag archives generating near-duplicate indexable URLs, `/tags/` pages competing with articles, trailing-slash or www/non-www duplicates. Worth a one-time audit of what is actually indexed vs. what is in `sitemap.xml`.

**Effort:** Low–Medium (one-time).

**Realistic traffic, zero-authority site:** 0 visits/month directly. Negative insurance: getting it wrong can cost 100% of potential traffic; getting it right earns nothing by itself.

**Flag:** `WORKS` (as insurance).

**Sources:** Google Search Central Documentation, crawling and indexing section (current 2026).

---

## A3. Long-tail / low-competition query targeting

**What it is:** Deliberately targeting low-volume, low-competition queries where a zero-authority domain can actually rank, instead of head terms owned by Healthline and Allrecipes.

**Applied here:** The highest-leverage classic lever for this site. Head terms ("cheap healthy meals", "high protein foods") are unwinnable for years. But "how much protein in a can of black beans per dollar", "is canned salmon cheaper than chicken breast per gram of protein", "cheapest source of iron at Aldi" are winnable because almost no one has the underlying cost data and this site does (22 CSVs). The moat is the dataset, not the prose.

**Effort:** Ongoing; Medium per article.

**Realistic traffic, zero-authority site:** 0–30 visits/month for the first ~6 months, then 100–800/month by month 12–18 *if* the site accumulates any authority at all. The pre-2022 "publish 500 long-tails, get 10k visits" playbook no longer executes — long-tail rankings now still require site-level trust.

**Flag:** `SITUATIONAL` — condition: the site must first clear Google's site-level quality/trust threshold. Long-tail volume without site-level trust produced nothing for thousands of sites after Sept 2023 HCU and the March 2024 core update.

**Sources:** Google Search Central Blog, "Google Search's September 2023 helpful content update" (2023-09-14); Google Search Central Blog, "What web creators should know about our March 2024 core update and new spam policies" (2024-03-05).

---

## A4. Topic clusters / pillar-and-spoke architecture

**What it is:** One comprehensive pillar page per major topic surrounded by narrow spoke articles, all mutually linked, demonstrating depth on a subject.

**Applied here:** Natural fit. Pillars: "Cost per gram of protein: complete 2026 ranking"; "The cheapest source of every essential nutrient"; "How to eat well on $50/week". Each pillar links to 15–30 existing articles and each links back. Repo tasks #4 (internal linking) and #5 (3 pillar articles) are the same project and should be executed together, not separately.

**Effort:** High (weeks) for genuine pillars.

**Realistic traffic, zero-authority site:** 0–50 visits/month in year one from the pillars themselves. The real payoff: pillars are the only pages on this site plausibly capable of *attracting a link*, which unlocks everything else.

**Flag:** `WORKS`.

**Merge note:** "topical authority", "content hubs", "pillar pages", "semantic SEO architecture" — one tactic. Counted once.

**Sources:** Industry practice, not a documented Google system. Google Search Relations staff have publicly stated there is no "topical authority" score; treat the mechanism as better internal linking plus better coverage. `[UNVERIFIED as a named Google signal]`

---

## A5. Internal linking (contextual, in-prose)

**What it is:** Links from the body copy of one article to another, with descriptive anchor text.

**Applied here:** With 216 articles and near-zero external links, internal links are essentially the *only* PageRank the site has to distribute. Every article should link to 3–6 siblings from within the prose; a comparison article ("canned tuna vs. chicken breast") should link to both ingredient pages and to the protein-per-dollar pillar. Cheap, entirely under one operator's control, no external dependency, no approval gate.

**Effort:** Medium (candidate generation scriptable; anchor quality needs human review).

**Realistic traffic, zero-authority site:** 0–200 visits/month within 3–6 months. One of very few levers with a genuine short-term effect on a large, already-published, under-linked archive.

**Flag:** `WORKS`. Best effort-to-effect ratio in Part A for this specific site.

**Sources:** Google Search Central, "Link best practices for Google" (docs, current 2026).

---

## A6. Content refreshing and re-dating

**What it is:** Updating an existing article and its visible/structured date so it reads as current.

**Applied here:** Two things get conflated and must be separated.
- **Genuine refresh** — re-running the price data, updating numbers, adding 2026 costs. `WORKS`, and unusually powerful for a price-data site because the content genuinely decays: 2025 grocery prices are simply wrong in 2026. "Prices updated July 2026" is a real freshness and trust signal, and it is automatable from the existing pipeline.
- **Date-stamp bumping with no substantive change** — `MYTH`, bordering on spam. Changing dates without changing content does not help and can create a trust problem.

**Effort:** Low per article if the pipeline regenerates numbers; Ongoing.

**Realistic traffic, zero-authority site:** 0 in year one (nothing ranks yet to refresh). Later becomes a 10–30% uplift on ranking pages. Do not start here.

**Flag:** Genuine refresh `WORKS`; date-bumping `MYTH`.

**Sources:** Google Search Central date guidance, plus a long-running pattern of Google Search Relations statements 2019–2025 that `dateModified` alone does not affect ranking. `[UNVERIFIED — no single canonical dated doc]`

---

## A7. Keyword cannibalization fixes (consolidation / merging)

**What it is:** When several of your pages target one query, Google may rotate between them and rank none well; the fix is to merge or clearly differentiate them.

**Applied here:** A 216-article archive built largely by a pipeline is a high-risk case — there are very likely several near-identical "cheapest protein" or "budget meal prep" articles. Detection: export Search Console query→page data and look for one query mapping to 3+ URLs, or run a title/embedding-similarity pass over `src/data/articles/*.md`. Fix: merge into one strong page, redirect the rest.

**Effort:** Medium.

**Realistic traffic, zero-authority site:** 0–50 visits/month. With near-zero impressions there is little Search Console signal to diagnose from yet.

**Flag:** `SITUATIONAL` — condition: needs enough Search Console impression data to diagnose. Today only the content-similarity half is actionable.

**Sources:** Industry term, not Google terminology. `[UNVERIFIED as a named Google concept]`

---

## A8. Index bloat pruning / content pruning

**What it is:** Deleting, noindexing or consolidating low-quality pages so the site's average quality rises.

**Applied here:** Genuinely relevant, and uncomfortable. If a meaningful share of the 216 articles are thin or pipeline-generated near-duplicates, they are actively suppressing the rest — post-HCU, Google evaluates quality at the site level, so weak pages are not merely neutral. An honest audit ("would I show this to a food editor?") followed by consolidating the bottom 20–30% into stronger pages is plausibly the single highest-value classic action available here.

**Effort:** High (requires honest judgment across 216 pages).

**Realistic traffic, zero-authority site:** 0 immediately; potentially the unlock for everything else. Many documented 2024–2025 HCU recoveries involved large-scale removal of low-value content, though Google has never confirmed pruning as a recovery mechanism.

**Flag:** `SITUATIONAL` — condition: only helps if a real quality problem exists. Pruning good pages is pure loss. Audit before cutting.

**Merge note:** "content pruning", "index bloat", "thin-content cleanup" — one tactic.

**Sources:** Google Search Central Blog, "What creators should know about Google's helpful content update" (2022-08-18) — states removing unhelpful content can improve rankings of other content; reaffirmed Sept 2023.

---

## A9. Crawl budget optimization

**What it is:** Managing how much of your site Googlebot crawls and how often.

**Applied here:** **Not a real constraint at this scale.** Google's own documentation scopes crawl budget concerns to sites over ~1M pages, or 10k+ pages with rapidly changing content. A 216-page static site on Cloudflare's edge has no crawl budget problem. Time spent here is time stolen from A3/A5/A8.

**Effort:** N/A.

**Realistic traffic, zero-authority site:** 0 visits/month.

**Flag:** `MYTH` **for a site of this size.** (The tactic is real for genuinely large sites; the applicability here is not.)

**Sources:** Google Search Central, "Large site owner's guide to managing your crawl budget" — explicit scoping to 1M+ page sites (docs, current 2026).

---

## A10. Core Web Vitals / page experience

**What it is:** LCP, INP and CLS thresholds as a small ranking input and a real UX factor.

**Applied here:** Astro + Tailwind + Cloudflare Pages almost certainly already passes. Worth one measurement to confirm — specifically LCP on hero images and CLS from any late-loading newsletter form — then stop. This is a solved problem for this stack.

**Effort:** Low (verify only).

**Realistic traffic, zero-authority site:** 0 visits/month. Google has consistently described page experience as a tiebreaker between otherwise-equal results, and this site has no results to break ties between.

**Flag:** `SITUATIONAL` — condition: only matters if currently failing. Verify once, then ignore.

**Sources:** Google Search Central, "Understanding page experience in Google Search results" (docs; the separate Page Experience report was retired from Search Console in 2023).

---

## A11. E-E-A-T signals (author identity, credentials, sourcing, About/Contact)

**What it is:** Experience, Expertise, Authoritativeness, Trust — the quality-rater framework Google uses to evaluate and train its systems.

**Applied here:** The hardest category for this site: food and nutrition advice is YMYL-adjacent, and the site is a pseudonymous single operator with no clinical credentials. That is a structural ceiling. What can honestly be done:
- Anchor the expertise claim to the **data**, not the person. "We priced N grocery categories across M stores; here is the methodology" is defensible without an RD credential.
- Publish a real methodology page: price sources, collection dates, stores, USDA nutrient database version.
- Cite USDA FoodData Central per nutrient, with links.
- Genuine About page and a working Contact route.
- **Do not** invent credentials or a fake registered-dietitian reviewer. That is an enforced spam pattern, and it is also exactly the pseudonym discomfort already recorded in this project's history.

**Effort:** Medium.

**Realistic traffic, zero-authority site:** 0 direct visits/month. It is a gate, not a lever — but for a nutrition site it may be *the* gate.

**Flag:** `WORKS` (as a gate). Separately, "raise your page's E-E-A-T score" is a `MYTH` — there is no E-E-A-T score, and Google has said so explicitly.

**Sources:** Google, "Search Quality Rater Guidelines" (updated Jan 2025); Google Search Central Blog on the addition of the second E (Dec 2022).

---

## A12. Original data / statistics as a ranking and link asset

**What it is:** Publishing proprietary numbers nobody else has — simultaneously a ranking play and the most reliable passive link-acquisition mechanism that exists.

**Applied here:** **This is the site's actual competitive advantage and it is under-exploited.** 22 CSVs of nutrition-per-dollar data is a rare asset. Nobody else can write "the cheapest source of protein in America in July 2026 is X at $Y per 100g." That content is unwinnable by competitors, quotable, exactly what personal-finance and food journalists reach for during an inflation news cycle, and exactly what AI answer engines cite because it is a specific attributable number.

**Effort:** Medium — the data exists; the packaging (sortable table, charts, downloadable CSV, explicit methodology) is the work.

**Realistic traffic, zero-authority site:** 0–100 visits/month direct in the first months, but the highest-variance item in this report: a single pickup by a mainstream personal-finance writer changes the site's entire authority trajectory. Expected value is dominated by the tail.

**Flag:** `WORKS`.

**Sources:** Not a Google feature — a link-acquisition pattern well attested across the industry. `[UNVERIFIED as to effect size in this niche]`

---

# PART B — Google SERP Features, Targeted Individually

Each of these is a distinct slot on the results page with its own eligibility rules. They matter because a zero-authority site can occasionally win a *feature* on a query it could never win position 1 on.

**Caveat over this whole section:** as of early 2026 AI Overviews appear on a large share of queries and depress clicks on everything below them. Ahrefs (Feb 2026) measured a 58% CTR reduction for top-ranking pages when an AI Overview is present, up from 34.5% in April 2025. A study reported by Search Engine Land (2026) put Google zero-click searches at ~68%. Winning a SERP feature in 2026 is worth materially less than winning the same feature in 2021.

---

## B1. Featured snippet (position zero)

**What it is:** An extracted answer box above the organic results, pulled from a page that already ranks in the top ~10.

**Applied here:** Highly targetable *format*, poorly targetable *position*. Snippet-friendly patterns for this site: a direct one-sentence answer immediately under an H2 phrased as the question ("How much protein is in a can of black beans?" → "One 15-oz can of black beans contains about 21g of protein, or roughly 30g of protein per dollar at $0.70/can."), plus a clean comparison table. Tables and short definition paragraphs are the two formats most often lifted.

**Effort:** Low (formatting discipline applied to new and refreshed articles).

**Realistic traffic, zero-authority site:** 0 visits/month until the site ranks top-10 for something. Featured snippets are drawn almost exclusively from pages already in the top 10 — it is a re-ranking of existing winners, not an entry point.

**Flag:** `SITUATIONAL` — condition: requires an existing top-10 ranking. Also worth knowing that snippet-winning can *reduce* clicks (the user gets the answer and leaves), so it is not unambiguously positive.

**Secondary value that is now the main value:** SE Ranking's 2024 analysis of 100k queries found that sources cited in AI Overviews had overwhelmingly previously held a featured snippet or top-3 organic position. Snippet formatting is now primarily an *AI-citation* play (see Part E). `[secondary source]`

**Sources:** Ahrefs study reported Feb 2026 (58% CTR reduction with AIO present); Search Engine Land, "Google zero-click searches reach 68% in early 2026" (2026). Both accessed 2026-07-26.

---

## B2. People Also Ask (PAA)

**What it is:** The expandable related-questions accordion; each expansion cites a source page.

**Applied here:** Two separate uses, and only one is a traffic tactic.
- **As a research tool** — free, reliable, and immediately usable. Scraping PAA questions for "cheapest protein", "food budget", "cost per calorie" gives a validated long-tail question list to structure articles around. This is the honest primary value.
- **As a traffic source** — a PAA citation does send clicks, but click-through from PAA is low and it requires an existing top-10-ish ranking for the sub-question, same gate as B1.

**Effort:** Low.

**Realistic traffic, zero-authority site:** 0–40 visits/month. As a research input, its value is indirect but real.

**Flag:** `SITUATIONAL` for traffic (needs existing rankings); `WORKS` unambiguously as free query research.

**Sources:** Present and functioning as of 2026 per multiple 2026 SEO analyses. `[secondary sources only — no Google documentation of PAA eligibility exists]`

---

## B3. Image pack / Google Images results embedded in web SERP

**What it is:** A horizontal strip or grid of images inside the normal results page, each linking to the hosting page.

**Applied here:** Genuinely promising and under-used here. Queries like "protein per dollar chart", "grocery price comparison chart", "cheapest protein sources" are strongly image-intent — a well-made data chart with a descriptive filename and alt text can enter the image pack far earlier than the article can rank in web results, because image ranking depends less on domain authority. The site already produces pin images at `public/images/pins/`; those are social-format, not data-chart format. Purpose-built charts are the play.

**Effort:** Medium (chart generation from the existing CSVs is scriptable; one-time template work).

**Realistic traffic, zero-authority site:** 20–300 visits/month within 6 months if charts are made deliberately. Caveat: image-pack clicks convert poorly and bounce hard.

**Flag:** `WORKS`.

**Sources:** See B4 for image-search sourcing.

---

## B4. Google Images as a standalone traffic source

**What it is:** The Images vertical, plus Lens, as an entry point in its own right (distinct from B3's in-SERP image strip).

**Applied here:** Same asset, different surface: charts, labeled photos of specific budget ingredients, and price-comparison graphics. Requirements are prosaic and fully controllable — descriptive filenames, real alt text, images embedded in a relevant text page, an image sitemap, no lazy-load that hides the `src` from crawlers, and captions.

**Effort:** Low–Medium.

**Realistic traffic, zero-authority site:** 20–200 visits/month, low engagement quality. Non-trivial but rarely a business-changing channel for a text/data site.

**Flag:** `WORKS`.

**Note on quoted figures:** 2026 SEO blogs widely repeat "Google Images drives 22% of all web searches" and "1.1 billion image queries daily". These trace to old and poorly sourced estimates and should not be planned against. `[UNVERIFIED — treat these specific numbers as unreliable]`

**Sources:** Google Search Central, "Google Images best practices" (docs, current); market figures from 2026 SEO blog aggregators, unverified.

---

## B5. Video carousel / video results in web search

**What it is:** A row of video thumbnails inside the web SERP, in practice almost entirely YouTube.

**Applied here:** For this site the video carousel is not really a website-traffic channel — it is a YouTube channel play (see C5). Self-hosted video with VideoObject schema can technically appear, but Google reduced non-YouTube video result eligibility (notably the 2023 change requiring the video be the main content of the page) and self-hosted video on a Cloudflare Pages static site is an infrastructure burden with poor payoff.

**Effort:** High for self-hosted; Medium via YouTube.

**Realistic traffic, zero-authority site:** 0–20 visits/month to the *website* from video carousels.

**Flag:** `SITUATIONAL` — condition: only worth it if video is being produced anyway. This project does have a Remotion + ElevenLabs kinetic-video pipeline, which changes the math: the marginal cost of a video is already paid.

**Sources:** Google Search Central Blog, "Changes to video indexing" (2023) — video must be the main content of the page to be eligible for video results.

---

## B6. Top Stories carousel

**What it is:** The news carousel at the top of results for newsworthy queries.

**Applied here:** Effectively closed. Top Stories eligibility requires being recognized as a news publisher producing timely news content; Google states publishers are automatically considered, but in practice the carousel is dominated by established news brands and this site publishes evergreen reference content, not news. A "grocery prices rose X% this month" news beat could theoretically qualify but would mean becoming a different publication.

**Effort:** High (would require a real news cadence).

**Realistic traffic, zero-authority site:** 0 visits/month.

**Flag:** `SITUATIONAL`, effectively `DEAD` for this site — condition: would require pivoting to genuine timely news publishing with an established brand.

**Sources:** Google Publisher Center Help, "News content across Google" (current 2026) — no application needed; ranking by relevance, prominence, authoritativeness, freshness.

---

## B7. Sitelinks

**What it is:** The indented sub-links shown under a result, usually for branded/navigational queries.

**Applied here:** Fully algorithmic. Google removed the sitelinks demotion tool from Search Console years ago; there is no lever. Sitelinks appear when a site has brand-query volume, which this site does not have. Clean site structure and good internal linking are the only inputs, and you are doing those anyway (A2, A5).

**Effort:** N/A.

**Realistic traffic, zero-authority site:** 0 visits/month. Sitelinks appear on branded queries — traffic that would have arrived anyway.

**Flag:** `MYTH` as a traffic tactic. (The feature is real; "optimizing for sitelinks" is not a thing you can do.)

**Sources:** Google Search Central, "Sitelinks" documentation — states sitelinks are automated and there is no way to mark up a site to request them.

---

## B8. Knowledge panel / brand entity panel

**What it is:** The right-hand information card for a recognized entity (person, organization, brand).

**Applied here:** Requires the Knowledge Graph to recognize "Daily Life Hacks" as a notable entity, which requires third-party coverage — Wikipedia/Wikidata presence, press mentions, or a well-established brand. None exist. The commonly-sold tactics (Organization schema with `sameAs`, a Wikidata item you create yourself) do not manufacture notability; self-created Wikidata entries are routinely deleted and do not produce panels.

**Effort:** High, with a low success probability.

**Realistic traffic, zero-authority site:** 0 visits/month.

**Flag:** `MYTH` as an achievable near-term tactic for an unknown brand. Organization schema itself is worth adding for other reasons (see D1) — just not for this reason.

**Sources:** Google Search Central, "Knowledge panels" help — panels are generated automatically from entities Google understands; no submission mechanism.

---

## B9. Recipe rich results

**What it is:** The recipe carousel and rich snippet — image, star rating, cook time, calories — driven by `Recipe` structured data.

**Applied here:** **One of the most concretely valuable items in this entire report,** because recipe is one of the schema types that survived Google's 2023–2026 deprecation sweep and still produces a genuine visual rich result. Any article on the site containing an actual recipe should carry complete, honest `Recipe` markup: `name`, `image`, `recipeIngredient`, `recipeInstructions`, `cookTime`, `prepTime`, `recipeYield`, `nutrition` (`NutritionInformation` — this site has better nutrition data than most food blogs), and `aggregateRating` **only if real user ratings exist**.

**Critical constraint:** `aggregateRating` must reflect genuine user-submitted ratings. Fabricated ratings are a documented manual-action trigger. A static Astro site with no review backend cannot honestly produce them, so ship recipe markup *without* ratings rather than inventing them.

**Effort:** Medium (schema component in Astro + per-article frontmatter).

**Realistic traffic, zero-authority site:** 0–150 visits/month year one. Recipe SERPs are brutally competitive and dominated by high-authority food sites, but rich results raise CTR meaningfully once anything ranks, and the nutrition-data completeness is a differentiator.

**Flag:** `WORKS`.

**Sources:** Google Search Central, "Recipe (Recipe, HowToSection, HowToStep) structured data" (docs, current 2026). Confirmed still supported as of 2026 per structured-data change roundups; contrast with FAQ (killed May 2026) and HowTo (killed 2023) below.

---

## B10. Local pack / map pack

**What it is:** The three-result map block for queries with local intent.

**Applied here:** Not applicable. There is no physical business, no service area, and grocery-price queries with local intent ("Aldi near me") resolve to the retailer, not to a content site. Creating a fake local presence to qualify is a policy violation.

**Effort:** N/A.

**Realistic traffic, zero-authority site:** 0 visits/month.

**Flag:** `DEAD` for this site (the feature works; it is structurally unavailable to a location-less publisher).

**Sources:** Google Business Profile Help — eligibility requires a physical location or in-person service area.

---

## B11. FAQ rich results

**What it is:** Expandable Q&A pairs shown under a result, driven by `FAQPage` schema.

**Applied here:** **Do not build for this.** Google restricted FAQ rich results to authoritative government and health sites in August 2023, then dropped the FAQ search appearance entirely: FAQ rich results stopped appearing on 2026-05-07, with the Search Console report, Rich Results Test support removed in June 2026 and Search Console API support scheduled for removal in August 2026. `FAQPage` remains a valid schema.org type and Google says existing markup can stay, but it produces no search appearance.

**Effort:** N/A — actively avoid.

**Realistic traffic, zero-authority site:** 0 visits/month.

**Flag:** `DEAD` (as of May 2026). Any SEO advice recommending FAQ schema for rich results is now stale. Note: FAQ *content* still has value as AI-answer-engine feed material (Part E) — the schema does not.

**Sources:** Search Engine Journal, "Google Drops FAQ Rich Results From Search" (2026); Google Search Central Blog, "Changes to HowTo and FAQ rich results" (2023-08-08) for the original restriction. Accessed 2026-07-26.

---

## B12. HowTo rich results

**What it is:** Step-by-step rich result driven by `HowTo` schema.

**Applied here:** Nothing to do. Deprecated on mobile in 2023 and fully removed on desktop by September 2023; no HowTo rich result exists on any surface as of 2026.

**Flag:** `DEAD`.

**Sources:** Google Search Central Blog, "Changes to HowTo and FAQ rich results" (2023-08-08).

---

## B13. Other structured-data appearances retired 2025–2026

**What it is:** A cluster of narrower rich results Google removed for low usage.

**Applied here:** Informational — do not spend effort on any of these. Retired in June 2025: Book Actions, Course Info, Claim Review, Estimated Salary, Learning Video, Special Announcement, Vehicle Listing. None were relevant to this site, but their removal establishes the pattern: **Google is aggressively shrinking the rich-result surface, so any schema investment should go only to types with confirmed current appearances** (Recipe, Article, Breadcrumb, Product, Review, Video, Organization — see D1).

**Flag:** `DEAD` (all listed types).

**Sources:** Structured-data change roundups covering Google's June 2025 retirement announcement. `[secondary source — verify against Google Search Central "Search appearance" docs before acting]`

---

# PART C — Google Properties as Traffic Sources in Their Own Right

These are separate products with separate algorithms, separate eligibility, and in several cases *no dependence on your web-search ranking at all*. For a zero-authority site that is the crucial property: Discover and YouTube can send traffic to a site that ranks for nothing.

---

## C1. Google Discover

**What it is:** The personalized content feed in the Google app and on the Chrome mobile new-tab page (and, since 2025, on desktop), which pushes articles to users based on inferred interest rather than a query.

**Applied here:** **The single most important non-obvious opportunity in this report.** Discover does not require rankings, backlinks, or domain authority in the way web search does — it requires (a) being indexed, (b) large high-quality images (Google specifies ≥1200px wide with the `max-image-preview:large` robots directive), (c) compelling non-clickbait headlines, and (d) content that matches an interest Google has modeled. Budget food and grocery prices are a *mass-interest US topic* with strong emotional salience during inflation — exactly the kind of thing Discover surfaces.

Concrete requirements to meet:
- `<meta name="robots" content="max-image-preview:large">` sitewide. Cheap, one-line, and a hard prerequisite. Worth checking `public/_headers` and the Astro layout for this now.
- Hero images ≥1200px wide, compelling, not generic stock.
- Headlines that create curiosity without overpromising (Discover explicitly penalizes clickbait).
- Some timeliness. Pure evergreen reference gets less Discover pickup than "grocery prices in July 2026" framing.

**Effort:** Low to become eligible; Ongoing to actually earn impressions.

**Realistic traffic, zero-authority site:** This is the highest-variance channel available. Honest distribution: most likely outcome is 0 for months, then either nothing at all, or a spike of 2,000–50,000 visits in a few days when one article gets picked up, then back to near-zero. Steady-state after 12 months if it ever catches: 0–3,000/month, extremely volatile. **Do not build a business on it, but do make yourself eligible, because the cost of eligibility is one meta tag and good hero images.**

**Risk to note:** Discover traffic is unstable by design and Google runs Discover-specific core updates (a February 2026 Discover core update caused large publisher swings). Anyone whose traffic is majority-Discover is one update away from zero.

**Flag:** `WORKS` — with the caveat that it is a lottery ticket with a cheap ticket price, not a plan.

**Sources:** Google Search Central, "Google Discover and your website" (docs, current 2026) — states there is no way to opt in, content is automatically eligible if indexed, and specifies large-image and clickbait guidance. Desktop rollout and Feb 2026 Discover core update per 2026 SEO trade coverage `[secondary sources; publisher-share percentages quoted in those posts are unverified and some appear to be AI-generated blog content — treat the specific percentages as unreliable, the directional trend as real]`.

---

## C2. Google News (News tab + Publisher Center)

**What it is:** The dedicated news vertical and app.

**Applied here:** Same conclusion as B6 (Top Stories) and largely the same mechanism. Google now automatically considers all web content for Google News and Publisher Center registration is optional and does not affect eligibility. So there is no application to submit and nothing to unlock. Evergreen budget-food reference content is not news content and will not surface.

**Effort:** Low (nothing to do) or High (become a news publisher).

**Realistic traffic, zero-authority site:** 0 visits/month.

**Flag:** `SITUATIONAL` — condition: only if the site starts publishing genuine timely news (e.g. monthly USDA/BLS grocery-price reporting). That is a real possible pivot for a price-data site, but it is a new product, not an optimization.

**Note:** "Get approved in Google News" services and guides are selling something that no longer exists as a gate. Google moved to automatic consideration and auto-generated publication pages.

**Sources:** Google Publisher Center Help, "News content across Google" and "Publisher Center overview" (current 2026); Google Publisher Center Help, "Google News transitions to automatically-generated publication pages".

---

## C3. Google Web Stories

**What it is:** AMP-based full-screen tappable story format, surfaced in Discover, Search and a dedicated carousel.

**Applied here:** A zombie format. Not officially deprecated — Google still documents it and it still functions — but Google removed Web Stories from Google Images in February 2024, adoption stalled, and the format's discovery surfaces have narrowed to mostly Discover. Building an AMP Web Stories pipeline on top of an Astro site is real engineering work for a format Google has visibly stopped investing in.

**Effort:** Medium–High (AMP validity requirements, separate templating).

**Realistic traffic, zero-authority site:** 0–100 visits/month, declining. A handful of food/recipe bloggers still report Discover pickups from Stories.

**Flag:** `SITUATIONAL` at best — condition: only if you are already producing vertical visual content (which this project is, via the kinetic-video pipeline) *and* Web Stories is confirmed to still be worth it at implementation time. My honest read: skip it. The same vertical assets are better spent on YouTube Shorts and Pinterest.

**Sources:** Google Search Central, "Enable Web Stories on Google" (docs, still live 2026); Feb 2024 removal from Google Images per Google announcement and trade coverage. No deprecation announcement found as of 2026-07-26.

---

## C4. Google Business Profile

**What it is:** The free business listing powering the local pack and the business knowledge panel.

**Applied here:** Not available. Requires a physical location or defined in-person service area; a content website does not qualify. Fabricating an address to obtain a listing is a policy violation and a suspension trigger.

**Flag:** `DEAD` for this site.

**Sources:** Google Business Profile Help, eligibility guidelines (current).

---

## C5. YouTube search (as a search engine, not a social platform)

**What it is:** YouTube is the second-largest search engine by query volume; its results also feed Google's video carousel (B5).

**Applied here:** Directly relevant, and unusually well-positioned because the repo already contains a Remotion + ElevenLabs kinetic-video pipeline and a documented `kinetic-video` skill. The marginal cost of producing video is already paid. Query types that work: "cheapest protein sources", "$50 grocery haul", "Aldi vs Walmart price comparison", "how much protein per dollar". These are high-volume YouTube searches with an audience that is not well served by data-driven answers.

Important honesty: YouTube views are not website visits. Click-through from a YouTube description to an external site is typically 0.5–2% of views. A video with 10,000 views sends roughly 50–200 clicks, and YouTube actively suppresses external links.

**Effort:** High Ongoing (video is the most expensive content format), though partially automated here.

**Realistic traffic to the website:** 0–150 visits/month in year one. Realistic *YouTube* audience: separate metric, potentially much larger, and arguably a better standalone asset than the website.

**Flag:** `WORKS` — as a channel. `SITUATIONAL` as a *website traffic* source — condition: only meaningful if videos accumulate real view volume, and even then the referral rate is low.

**Sources:** Platform mechanics; referral-rate range is industry consensus. `[UNVERIFIED as to exact CTR figures]`

---

## C6. Google Dataset Search

**What it is:** A vertical search engine over datasets, populated entirely by `schema.org/Dataset` markup found on the open web.

**Applied here:** **An unusually good fit that almost nobody in the food-content space uses.** The site has 22 CSVs of nutrition-per-dollar data. Publishing those as properly marked-up datasets — each with a `Dataset` entity carrying `name`, `description`, `license`, `creator`, `temporalCoverage`, `spatialCoverage`, and a `DataDownload` `distribution` pointing at the CSV — makes them indexable in Dataset Search. There is no authority gate: Dataset Search indexes metadata, and the corpus of "US grocery price per nutrient" datasets is nearly empty.

The audience is researchers, journalists, students and data bloggers — precisely the population that *cites and links*. So the value is less the direct traffic and more that it puts the dataset in front of the small number of people capable of giving the site its first real backlinks.

**One live caution from this repo's own history:** a previous commit added a CC BY license page and a Frictionless datapackage for all 22 CSVs, and it was then reverted (`207442c revert(license): remove CC BY license page and all CC BY claims`). Whatever the reason for that reversal, it needs resolving before re-attempting this, because `Dataset` markup effectively requires stating a license. Do not re-add license claims without checking why they were pulled.

**Effort:** Medium (schema plus a dataset landing page per CSV; the datapackage work partly exists already in reverted form).

**Realistic traffic, zero-authority site:** 5–80 visits/month direct — genuinely small. But the *link* expected value is among the highest per hour of work of anything in this report.

**Flag:** `WORKS`, with the license question as a blocking prerequisite.

**Sources:** Google Search Central, "Dataset structured data" (docs, current); Google Dataset Search confirmed active as of mid-2026; Google Research Blog, "Discovering millions of datasets on the web".

---

## C7. Google Shopping free listings / Merchant Center

**What it is:** Free product listings in the Shopping tab, fed by a Merchant Center product feed.

**Applied here:** Not applicable. Requires actual products for sale with prices, availability and a checkout. This site sells nothing. Grocery *prices* are data about third-party products, not an inventory you can list — submitting them would be a feed policy violation.

**Flag:** `DEAD` for this site.

**Note:** Would become `SITUATIONAL` if the site ever sells a digital product (e.g. a meal-planning PDF), though Merchant Center support for digital-only goods is limited and this would not be a meaningful traffic channel.

**Sources:** Google Merchant Center Help, product data requirements (current).

---

## C8. Google Search Console URL Inspection / "Request Indexing"

**What it is:** Manually asking Google to crawl a specific URL.

**Applied here:** Worth doing for a handful of new important pages (a pillar, a dataset page). It affects *when* a page is crawled, never whether it ranks. The bulk-indexing services sold around this ("instant indexing", "indexing API for all URLs") are either abusing the Google Indexing API — which is officially limited to `JobPosting` and `BroadcastEvent` livestream pages only — or are selling nothing.

**Effort:** Low.

**Realistic traffic, zero-authority site:** 0 visits/month. It is a latency tool.

**Flag:** `WORKS` for latency; **paid "instant indexing" services are `MYTH`**, and using the Indexing API for general content is against Google's stated terms.

**Sources:** Google Search Central, "Indexing API quickstart" — explicitly scoped to JobPosting and BroadcastEvent.

---

# PART D — Non-Google Search Engines

**Market context (US, 2026):** Google ~84%, Bing ~10.5%, Yahoo ~2.9%, DuckDuckGo ~1.8%. Globally Google ~89%. Bing's share is at its highest ever, boosted by Copilot integration. `[Source: Statista / market-share aggregators, 2026 — these figures come from clickstream panels and vary several points between providers. Directionally reliable, not precise.]`

**The structural fact that makes this whole section cheap:** most non-Google engines do not run their own index. DuckDuckGo, Yahoo, Ecosia (outside Europe), AOL and several others source primarily from Bing. Startpage sources from Google. So **one action — verifying Bing Webmaster Tools and submitting to IndexNow — covers a large fraction of Part D at once.** Treating them as separate projects is the mistake.

---

## D1. Bing (and by extension Yahoo, DuckDuckGo, AOL, Ecosia-outside-EU)

**What it is:** Microsoft's index, which also serves the organic results of several other engines.

**Applied here:** Highest-value non-Google action in this report per hour spent, for one reason: **Bing is dramatically easier to rank in for a low-authority site than Google.** Bing weights exact keyword matching and on-page relevance more heavily and site-level authority less heavily than post-HCU Google. New sites that are invisible on Google routinely pick up Bing rankings within weeks. Bing also has a proportionally older, more US-desktop audience — reasonably well matched to a budget-grocery topic.

Concrete actions: register in Bing Webmaster Tools (free, can import from Search Console in one click), submit the sitemap, enable IndexNow (D2), and check the Bing-specific reports for crawl issues Google doesn't flag.

**Effort:** Low (a few hours, one time).

**Realistic traffic, zero-authority site:** 50–500 visits/month within 6 months, *including* the DuckDuckGo/Yahoo/AOL/Ecosia downstream. This is one of very few honest four-figure-per-year numbers available to a zero-authority site with near-zero effort.

**Flag:** `WORKS`. Most underrated item in this report relative to effort.

**Sources:** Bing Webmaster Tools documentation (current); market-share data above.

---

## D2. IndexNow

**What it is:** An open push protocol — you POST changed URLs and participating engines fetch them immediately, instead of waiting to be crawled.

**Applied here:** Supported by Bing, Yandex, Naver, Seznam and Yep. **Google tested it in 2021–2022 and did not adopt it; as of 2026 Google has announced no plans to join.** So IndexNow is a Bing-family tool, which is fine given D1. Implementation on Cloudflare Pages is genuinely trivial: a static key file at the site root plus a POST from the existing deploy/publish pipeline. Cloudflare also offers a one-toggle IndexNow integration in the dashboard for sites on its network, which this site is.

**Effort:** Low (under an hour; possibly one dashboard toggle).

**Realistic traffic, zero-authority site:** 0 additional visits/month by itself — it changes indexing *latency*, not ranking. Value is that new articles and refreshed price data appear in Bing within hours rather than weeks, which compounds with D1 and matters for time-sensitive price content.

**Flag:** `WORKS` for Bing/Yandex/Naver/Seznam. `DEAD` with respect to Google — any guide claiming IndexNow speeds up Google indexing is wrong.

**Sources:** IndexNow.org protocol documentation; multiple 2026 analyses confirming Google non-adoption `[secondary sources, consistent with each other and with Google's public statements]`; Cloudflare IndexNow integration docs.

---

## D3. DuckDuckGo

**What it is:** Privacy-focused engine, ~1.8% US share, organic results sourced principally from Bing with its own ranking layer and instant answers.

**Applied here:** No separate optimization exists or is needed. Ranking in Bing (D1) is the entire tactic. There is no DuckDuckGo webmaster console and no submission mechanism.

**Effort:** Zero (covered by D1).

**Realistic traffic, zero-authority site:** 10–80 visits/month, already counted inside D1's estimate.

**Flag:** `WORKS` as a downstream beneficiary; `MYTH` as a separate optimization target.

**Sources:** DuckDuckGo help pages describing Bing as a primary results source.

---

## D4. Yahoo Search

**What it is:** ~2.9% US share; results served by Bing under a long-standing agreement.

**Applied here:** Same as D3 — no independent action. Yahoo's share skews older and US-heavy, which is a demographic fit for budget-grocery content, but you reach it through Bing.

**Flag:** `WORKS` as a downstream beneficiary; `MYTH` as a separate target.

---

## D5. Brave Search

**What it is:** Privacy engine bundled with the Brave browser, running its own independent index (one of the few genuine independents), with a Goggles re-ranking feature.

**Applied here:** No webmaster console, no submission tool, no optimization surface. Brave discovers pages by crawling. Small absolute audience (roughly 80M Brave browser MAU globally, a fraction of whom use Brave Search as default).

**Effort:** Zero (nothing to do).

**Realistic traffic, zero-authority site:** 0–20 visits/month.

**Flag:** `SITUATIONAL` — condition: it works if you get crawled, and there is no lever to pull. File under "happens or doesn't".

**Sources:** Brave Search public documentation on its independent index.

---

## D6. Ecosia and Qwant (and the Staan / European Search Index)

**What it is:** Two European privacy/eco engines that historically resold Bing and Google results, now jointly operating their own European index. Their JV (European Search Perspective) launched **Staan** in August 2025, progressively serving French and German queries from a European index rather than Bing.

**Applied here:** Almost irrelevant — the audience is European and this site targets US readers with US grocery prices and US dollar amounts. A French user has no use for "cheapest protein at Aldi US in dollars". Noted for completeness and because the Bing-dependency assumption is now partially outdated.

**Effort:** Zero.

**Realistic traffic, zero-authority site:** 0–5 visits/month.

**Flag:** `SITUATIONAL` — condition: only relevant if the site ever targets European audiences with local price data, which would be a different product.

**Sources:** TechCrunch, "Qwant and Ecosia debut Staan, a European search index" (2025-08-06); Ecosia blog, "Our European search index goes live".

---

## D7. Yandex

**What it is:** Russia's dominant engine, meaningful share in CIS markets, own index, own webmaster console, and supports IndexNow.

**Applied here:** Effectively no US relevance. US grocery prices in USD have no audience there. Yandex Webmaster registration costs an hour and Yandex is already covered by the IndexNow ping, so the marginal effort is zero — but so is the return.

**Realistic traffic, zero-authority site:** 0–10 visits/month, largely bot-adjacent.

**Flag:** `DEAD` for this site's audience (the engine works; the audience match does not).

---

## D8. Baidu

**What it is:** China's dominant engine.

**Applied here:** Not accessible in any practical sense: Baidu strongly favours sites hosted in mainland China with an ICP licence, indexes foreign sites poorly, and the content is in English about US grocery prices. There is no path here.

**Realistic traffic, zero-authority site:** 0 visits/month.

**Flag:** `DEAD` for this site.

---

## D9. Naver

**What it is:** South Korea's dominant portal/search engine, heavily weighted toward its own blog/café/knowledge-in content over the open web. Supports IndexNow.

**Applied here:** Naver's results are dominated by Naver-native content; external English sites barely surface. No audience match.

**Realistic traffic, zero-authority site:** 0–5 visits/month.

**Flag:** `DEAD` for this site.

---

## D10. Seznam.cz

**What it is:** Czech engine with a genuine independent index and meaningful domestic share (roughly 10–15% in Czechia). Supports IndexNow.

**Applied here:** No audience match. Included for completeness; already covered free by the IndexNow ping.

**Realistic traffic, zero-authority site:** 0–3 visits/month.

**Flag:** `DEAD` for this site.

---

## D11. Startpage

**What it is:** A privacy proxy that serves Google's results anonymously.

**Applied here:** Zero independent optimization surface — if you rank in Google you appear in Startpage, full stop. No console, no submission.

**Realistic traffic, zero-authority site:** 0–5 visits/month.

**Flag:** `MYTH` as a separate target (it is Google, proxied).

---

## D12. Mojeek

**What it is:** A small UK-based engine with a genuinely independent crawler and index, no tracking. Sub-0.1% share.

**Applied here:** It has a URL submission form and it does crawl small independent sites willingly, which is more than most. But its user base is tiny.

**Effort:** Minutes (one submission form).

**Realistic traffic, zero-authority site:** 0–5 visits/month.

**Flag:** `SITUATIONAL` — condition: worth 5 minutes as a completeness item, never worth more. Its indirect value is that Mojeek's index feeds a few meta-search engines and research tools.

**Sources:** Mojeek webmaster/submission pages (current).

---

## D13. Marginalia Search

**What it is:** A non-commercial independent search engine that deliberately *down-ranks* commercial SEO-optimized content and surfaces small, text-heavy, non-commercial sites.

**Applied here:** Interesting philosophically, negligible practically. Marginalia's whole design goal is to find sites that are *not* doing SEO — and it deliberately deprioritizes pages with heavy JavaScript, ad tech and affiliate patterns. If this site ever runs affiliate monetization (pending task #11), it moves further out of Marginalia's favour, not closer.

**Effort:** Minutes (it has a submission form).

**Realistic traffic, zero-authority site:** 0–2 visits/month. Literally single-digit.

**Flag:** `SITUATIONAL` bordering on curiosity — condition: it costs 5 minutes; expect essentially nothing. Its real-world value is occasionally being discovered by the HN/indieweb crowd, who do link out.

**Sources:** search.marginalia.nu — public description of its ranking philosophy.

---

## D14. Wiby, Teclis, Right Dao, Yep, and the long tail of micro-engines

**What it is:** A cluster of hobbyist and niche independent engines. Yep (by Ahrefs) is the most notable and supports IndexNow.

**Applied here:** Grouped deliberately rather than padded into separate entries, because listing them individually would be exactly the near-duplicate padding to avoid. Collectively they have a rounding-error audience.

**Effort:** Minutes total.

**Realistic traffic, zero-authority site:** 0–5 visits/month combined.

**Flag:** `SITUATIONAL` — condition: submit once if you're being completionist; do not track.

---

# PART E — Vertical and In-App Search (where people actually look for food)

This section matters disproportionately for a food site. A large share of food discovery never touches a web search engine at all. These are *search* surfaces, not social feeds — the distinction is that the user types a query with intent, which is why they belong in this file rather than the social-platform sweep.

---

## E1. Pinterest search

**What it is:** Pinterest is functionally a visual search engine; users search "cheap dinner ideas" and pins rank on keyword relevance in title, description and board context, with a long content half-life measured in months.

**Applied here:** Structurally the best-matched vertical search surface for this site: the Pinterest audience is heavily US, heavily female, heavily food-and-budget oriented, and Pinterest sends *outbound clicks to websites* in a way TikTok and Instagram deliberately do not. The site already has a pin pipeline, ~179/180 articles with pins, and a queued poster.

**But — and this is the decisive local fact — this project's own history records a Pinterest suppression diagnosis dated 2026-07-26 (today): zero impressions, attributed to cloaked-redirect spam on the same account plus a domain-claim linking trap that would poison a fresh account too.** That is an unresolved blocker, and it means the standard advice ("post more pins") is actively wrong right now. Diagnosing and clearing the account issue is the prerequisite; posting volume is worthless until then.

**Effort:** Medium (the pipeline exists; the account remediation is the unknown).

**Realistic traffic, zero-authority site:** 0/month while suppressed. If the account issue is genuinely cleared: 100–2,000 visits/month within 6 months is a realistic band for a food site with 180 pinnable articles and consistent posting. Pinterest is one of the very few channels where a zero-authority *website* can get four-figure monthly traffic, because Pinterest ranking does not care about your domain authority.

**Flag:** `SITUATIONAL` — condition: the account suppression must be resolved first. Once resolved, `WORKS`, and it is arguably the highest-ceiling channel in this entire report for this specific site.

**Sources:** Project-internal: `pinterest_suppression_2026-07-26` memory record; Pinterest business documentation on search ranking.

---

## E2. YouTube search

Covered as **C5** — counted once there, not double-counted here. Noting it in this section because YouTube belongs conceptually to both "Google properties" and "vertical search where people look for food". The one thing to add: per Ahrefs' 2026 brand-visibility correlation study across ~75,000 brands, YouTube presence showed the strongest single correlation with AI-answer-engine visibility of any signal measured. That reframes YouTube from "video channel" to "input to AI citation" — see F7.

---

## E3. TikTok search

**What it is:** In-app search on TikTok, which a large minority of US consumers now use as a discovery tool, disproportionately for food.

**Applied here:** Real reach, near-zero website traffic. TikTok's product design is explicitly hostile to outbound links: no clickable links in captions for most accounts, one bio link, and the algorithm suppresses content that pushes users off-platform. Food and recipes are among TikTok's top search categories, so the *audience* is there — the *referral* is not.

Also worth calibrating against the hype: while ~49% of US consumers report having used TikTok as a search engine, only ~4% say they are more likely to rely on it over Google, down from 8% in 2024. The "TikTok is replacing Google" narrative is overstated.

**Effort:** High Ongoing (short-form video demands volume and native tone).

**Realistic traffic to the website:** 0–50 visits/month, essentially all via a bio link.

**Flag:** `SITUATIONAL` — condition: only worthwhile as a brand/audience play, and only because the kinetic-video pipeline already exists. As a *website traffic* channel it is close to `DEAD`.

**Sources:** Adobe consumer survey data reported 2026 `[secondary source]`; TikTok external-link policies.

---

## E4. Instagram search

**What it is:** In-app keyword and hashtag search, plus Explore.

**Applied here:** Weakest referral mechanics of any platform here — one bio link, no in-caption links, and Instagram search is weighted toward accounts and Reels rather than informational answers. Budget-food content performs on Instagram as *entertainment*, not as reference.

**Effort:** High Ongoing.

**Realistic traffic to the website:** 0–30 visits/month.

**Flag:** `SITUATIONAL` at best — condition: brand-building only, no realistic traffic. Do not prioritize.

---

## E5. Reddit search / ranking inside Reddit threads

**What it is:** Reddit's internal search plus, more importantly, the fact that Reddit threads themselves rank extremely well in Google and are among the most-cited domains in AI answers.

**Applied here:** Highly relevant and highly hazardous. Budget-food subreddits (r/EatCheapAndHealthy, r/Frugal, r/MealPrepSunday, r/budgetfood) are exactly this site's audience, and a genuinely useful data comment can rank in Google *and* get quoted by AI engines for years. But this project has a recorded ECAH ban (2026-07-13, mid-viral post) and a resulting playbook: no same-day crossposts, slow reply cadence, no own-domain links early, freeze after bans.

The honest framing: Reddit is a *content-placement* channel where the value is the answer being visible on Reddit, not the click to your site. Treat direct linking as a slow-earned privilege, not a tactic.

**Effort:** Ongoing, high judgment, low volume.

**Realistic traffic, zero-authority site:** 0–200 visits/month, extremely spiky, with real account-loss risk.

**Flag:** `SITUATIONAL` — condition: strict adherence to the existing ban-recovery playbook. Violating subreddit self-promotion rules is the fastest way to lose the channel permanently.

**Sources:** Project-internal: `feedback_reddit_ban_lessons` memory record (2026-07-13).

---

## E6. Amazon search

**What it is:** Product search inside Amazon — the dominant starting point for US product queries.

**Applied here:** Not a traffic source *to* a content site; Amazon sends traffic nowhere but Amazon. Relevant only in the opposite direction, as a monetization surface (affiliate) tied to pending task #11. Listed here to close the loop and mark it explicitly: there is no method by which Amazon search sends visits to daily-life-hacks.com.

**Realistic traffic, zero-authority site:** 0 visits/month.

**Flag:** `DEAD` as a traffic source (it is a monetization channel, not a discovery channel).

---

## E7. Recipe aggregators and recipe-app search (Yummly, Allrecipes, Food52, Tasty, Punchfork, Copy Me That, Paprika)

**What it is:** Recipe indexes and save-apps that crawl or accept submissions of recipes and link back to the source site.

**Applied here:** Historically a real channel: submitting to recipe indexes drove referral traffic and links for food bloggers through the 2010s. Its current state is much weaker — **Yummly, once the biggest of these, was shut down by Whirlpool** (announced 2025), and the surviving aggregators are either closed platforms or self-hosted content. Punchfork, Copy Me That and Paprika import via `Recipe` schema, which reinforces B9: correct recipe markup is what makes your content portable into these tools automatically.

**Effort:** Low (mostly a byproduct of having correct `Recipe` schema).

**Realistic traffic, zero-authority site:** 0–40 visits/month.

**Flag:** `SITUATIONAL` — condition: only relevant for articles that contain actual recipes, and only as a free side-effect of B9. The classic "submit to 30 recipe directories" tactic is `DEAD` — most of those directories are gone or nofollowed.

**Sources:** Yummly shutdown announced by Whirlpool, 2025 `[UNVERIFIED — confirm before citing publicly]`; schema-driven import documented by Copy Me That and Paprika.

---

## E8. Google Lens / visual search

**What it is:** Camera and image-based querying, which returns web results based on an image rather than text.

**Applied here:** Marginal but non-zero. Lens is used heavily for food identification and for shopping. A person pointing Lens at a grocery shelf is a plausible entry point to "what does this cost per gram of protein" — but you cannot target it directly. The only lever is the same one as B3/B4: distinctive, well-labeled images embedded in relevant pages.

**Effort:** Zero incremental (covered by B4).

**Realistic traffic, zero-authority site:** 0–30 visits/month.

**Flag:** `SITUATIONAL` — condition: no direct optimization exists; it is a downstream benefit of image SEO. Any guide promising "Lens optimization" as a distinct discipline is selling `MYTH`.

---

# PART F — AI Answer Engines (AEO / GEO)

**Read this framing before the individual entries.** AI answer engines are the most-hyped and most-oversold area in SEO right now, and the honest picture has two halves:

- **Bad news:** total referral volume from AI assistants is small. For a typical content site, ChatGPT + Perplexity + Copilot + Gemini combined send on the order of 0.5–3% of the traffic Google sends. Being cited usually means the user gets the answer and never clicks.
- **Good news specific to this site:** AI engines cite *specific, attributable numbers*. "The cheapest source of protein per dollar is X at $Y/100g, per Daily Life Hacks' July 2026 grocery price dataset" is exactly the kind of sentence an LLM produces. A nutrition-per-dollar dataset is unusually citable, and the competition for these citations is thin. Conversion of AI referrals is also consistently measured as several times higher than organic search — small volume, better visitors.

**The most important empirical finding to plan around:** Ahrefs found that ~76% of AI Overview citations come from pages ranking in the top 10 for the query. There is a widely-circulated 2026 claim that this dropped to ~38%; I could not verify that against the primary source and the two numbers may be measuring different things. Either way the direction is the same: **AEO is not a shortcut around ranking. It is mostly a byproduct of ranking, plus formatting.** Treat any consultant selling "AEO instead of SEO" as selling a `MYTH`.

---

## F1. Google AI Overviews (AIO)

**What it is:** The generated answer block at the top of Google results, with inline source links.

**Applied here:** Cannot be opted into or directly targeted. What correlates with being cited: ranking in the top 10 for the query; content structured so a single passage cleanly answers a single question; specific numbers with a stated source and date; clear headings phrased as questions. All of which is B1 formatting discipline, which you should do anyway.

The realistic net effect for this site is **negative overall**: AIO suppresses clicks to everything below it (58% CTR reduction for top-ranking pages per Ahrefs, Feb 2026; ~68% of Google searches now end without a click). A site with no rankings loses nothing today, but the ceiling on future organic growth is lower than it was in 2021, and plans should be built on that assumption.

**Effort:** Low (formatting, folded into A1/B1).

**Realistic traffic, zero-authority site:** 0–50 visits/month.

**Flag:** `SITUATIONAL` — condition: requires an existing top-10 ranking. Not an independent channel.

**Sources:** Ahrefs, "76% of AI Overview citations pull from the top 10" (ahrefs.com/blog); Ahrefs CTR study reported Feb 2026; Search Engine Land, "Google zero-click searches reach 68% in early 2026".

---

## F2. Google AI Mode

**What it is:** Google's full conversational search mode, a separate tab/experience from AIO.

**Applied here:** Same optimization surface as F1 — there is no separate lever. Worth calibrating the hype: SparkToro measured only ~0.34% of searches transitioning into AI Mode in the period studied, while Google stated at I/O 2026 that AI Mode passed 1 billion monthly users with query volume more than doubling quarterly. Those claims are not necessarily contradictory (reach vs. share of search), but the practical read is that AI Mode is not yet a meaningful referral source for a small site.

**Realistic traffic, zero-authority site:** 0–20 visits/month.

**Flag:** `SITUATIONAL` — condition: no distinct action available; monitor, do not build for.

**Sources:** SparkToro analysis 2026; Google I/O 2026 statements, both via trade coverage `[secondary]`.

---

## F3. ChatGPT search / browsing citations

**What it is:** ChatGPT's web-search mode, which retrieves live pages and cites them with clickable links.

**Applied here:** The largest AI referral source by a wide margin (2026 reports put ChatGPT at the great majority of measurable AI referral traffic). Mechanically it retrieves via its own index plus live fetching, so the requirements are: allow `GPTBot` and `OAI-SearchBot` in `robots.txt`, serve content in server-rendered HTML (Astro static output already satisfies this — a real advantage over JS-heavy competitors), and write passages that stand alone as answers with numbers and dates attached.

**One decision to make deliberately:** blocking `GPTBot` protects content from training but also removes you from citation. For a site whose goal is traffic and authority, allowing it is the right call — but that is a judgment, not a fact, and it should be checked against what `public/_headers` and `robots.txt` currently do.

**Effort:** Low.

**Realistic traffic, zero-authority site:** 10–200 visits/month within 6–12 months, with unusually good engagement quality.

**Flag:** `WORKS`.

**Sources:** OpenAI bot documentation (`GPTBot`, `OAI-SearchBot`, `ChatGPT-User`); 2026 AI referral share reports `[secondary]`.

---

## F4. Perplexity

**What it is:** A citation-first answer engine that shows numbered sources prominently and drives comparatively high click-through per answer.

**Applied here:** Best click-through economics of any AI engine because its interface foregrounds sources. It favours recent, data-dense, well-structured pages, which is a good match. Requires `PerplexityBot` to be allowed.

**Effort:** Low (same work as F3).

**Realistic traffic, zero-authority site:** 5–100 visits/month.

**Flag:** `WORKS`.

**Sources:** Perplexity crawler documentation; 2026 conversion-rate comparisons `[secondary — the widely quoted "AI traffic converts 4–5x better" figures come from e-commerce-weighted samples and should not be assumed to transfer to an ad/affiliate content site]`.

---

## F5. Microsoft Copilot / Bing Chat

**What it is:** Microsoft's assistant, grounded in the Bing index and surfaced across Windows, Edge and Bing.

**Applied here:** **The most actionable AI engine for this site, and the reason is structural: Copilot grounds on Bing's index, and Bing is the index a zero-authority site can actually get into (D1).** Every hour spent on Bing Webmaster Tools and IndexNow is simultaneously AEO work for Copilot. This is the one place where "AEO" and a concrete, cheap, verifiable action line up.

**Effort:** Zero incremental beyond D1/D2.

**Realistic traffic, zero-authority site:** 5–80 visits/month.

**Flag:** `WORKS`.

**Sources:** Microsoft documentation on Copilot grounding in Bing; Bing Webmaster Tools.

---

## F6. Claude, Gemini, Grok, Meta AI and other assistants

**What it is:** The remaining major assistants, each with web-retrieval modes and their own crawlers (`ClaudeBot`/`Claude-SearchBot`, `Google-Extended`, `meta-externalagent`, xAI's crawler).

**Applied here:** Grouped deliberately — the optimization is identical to F3/F4 (allow the crawlers, serve static HTML, write self-contained factual passages), so listing them separately would be padding. Their combined referral volume is currently small. Gemini is the notable one to watch given Android/Chrome distribution, but it also links out least.

**Effort:** Zero incremental.

**Realistic traffic, zero-authority site:** 0–40 visits/month combined.

**Flag:** `SITUATIONAL` — condition: free rider on F3/F4 work; no separate effort justified.

---

## F7. Off-site brand mentions as the actual AEO lever

**What it is:** The finding that AI-answer visibility correlates with *unlinked brand mentions across the web* — particularly YouTube, Reddit, and forums — more strongly than with backlinks or domain authority.

**Applied here:** This is the one genuinely distinct AEO tactic, as opposed to relabeled SEO. Per Ahrefs' 2026 correlation study of ~75,000 brands, YouTube mentions showed the strongest single correlation with AI visibility (~0.74), and YouTube is now the most-cited domain in AI Overviews. Reddit is similarly over-represented.

For this site that means: being *talked about* on YouTube and Reddit — even without a link — plausibly does more for AI citation than any on-site change. Which lands awkwardly, because both of those channels are constrained here (Reddit ban history; YouTube requires sustained video output). It also means the highest-leverage AEO action is making the dataset quotable enough that other people cite the number and the name.

**Important caveat:** correlation, not causation, on a study measuring brands (mostly commercial) rather than small publishers. Do not over-fit.

**Effort:** High Ongoing.

**Realistic traffic, zero-authority site:** Indirect; not separately measurable.

**Flag:** `SITUATIONAL` — condition: correlational evidence only; treat as a strong hypothesis, not established mechanism.

**Sources:** Ahrefs 2026 brand-visibility correlation study (~75k brands); Semrush 2026 AI Visibility Index (126M US AI prompts). Both accessed via trade coverage 2026-07-26 `[secondary; primary studies should be read before acting]`.

---

## F8. llms.txt

**What it is:** A proposed `/llms.txt` file giving LLMs a curated markdown map of your site.

**Applied here:** **Do not build this.** The 2026 evidence is unusually clear for a question this contested: a study monitoring over 500 million AI bot visits across 90 days found only ~408 direct fetches of `/llms.txt` — statistically zero. GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot and Google-Extended overwhelmingly skip it and crawl HTML directly. No major AI provider has announced support; Google has explicitly said AI Overviews and AI Mode rely on traditional signals, not llms.txt. SE Ranking found ~10% adoption across 300k domains, of which ~40% are empty plugin stubs.

**Effort:** Low — but the correct effort is zero.

**Realistic traffic, zero-authority site:** 0 visits/month.

**Flag:** `MYTH` — currently the clearest example of a heavily-marketed tactic with measured near-zero uptake. Revisit only if a major provider announces support.

**Sources:** SE Ranking adoption study (300k domains, 2026); 500M-bot-visit crawler-log analysis (2026) `[secondary sources, but multiple independent analyses agree]`. Accessed 2026-07-26.

---

## F9. Getting into LLM training data / "rank in the model itself"

**What it is:** The idea of optimizing so the model *knows* your brand without retrieval.

**Applied here:** Not a controllable channel. Training corpora are fixed at cutoff, selection is opaque, there is no submission mechanism, and even success produces no link and no referral. Anyone selling "get your brand into ChatGPT's training data" is selling something they cannot deliver.

**Flag:** `MYTH` as a purchasable/targetable tactic. (The underlying phenomenon is real — widely-discussed brands do get memorized — but it is a consequence of fame, not a lever.)

---

# PART G — Structured Data and Feeds as Discovery Mechanisms

---

## G1. Schema types that still produce rich results in 2026

**What it is:** The shrinking set of structured-data types Google still renders as an enhanced search appearance.

**Applied here:** After the 2023–2026 cull, the types worth implementing on this site are:
- **`Recipe`** — the big one; see B9.
- **`Article`** / `BlogPosting` — no dramatic visual result, but feeds Discover/Top Stories eligibility and date understanding.
- **`BreadcrumbList`** — replaces the URL line with a readable path; small, real CTR benefit; trivial in Astro.
- **`Dataset`** — see C6; the differentiated play.
- **`Organization`** with `logo` and `sameAs` — entity consolidation; low value alone, but it is the correct place to declare the publisher.
- **`ImageObject`** with `creator`/`license` — supports image-result licensing badges.
- **`VideoObject`** — only if video is embedded and is the page's main content.

Types that are now **`DEAD`** and should not be built: `FAQPage` (killed May 2026), `HowTo` (killed 2023), plus Book Actions, Course Info, ClaimReview, Estimated Salary, Learning Video, Special Announcement, Vehicle Listing (retired June 2025).

**Effort:** Medium (one shared Astro schema component, driven from frontmatter).

**Realistic traffic, zero-authority site:** 0–120 visits/month; mostly a CTR multiplier on whatever else ranks, plus the Dataset Search path.

**Flag:** `WORKS` for the surviving list; `DEAD` for the retired list.

**Sources:** Google Search Central "Search appearance" / structured data documentation (current 2026); Search Engine Journal on FAQ removal (2026); Google Search Central Blog on HowTo/FAQ changes (2023-08-08).

---

## G2. XML sitemaps (standard, image, video, news)

**What it is:** Machine-readable URL lists submitted to search engines.

**Applied here:**
- **Standard sitemap** — mandatory hygiene, `@astrojs/sitemap` handles it. `WORKS` (as insurance).
- **Image sitemap** — genuinely worth adding here, because image discovery is a real channel for this site (B3/B4) and images on a static Astro site may otherwise be discovered slowly. `WORKS`.
- **Video sitemap** — only if self-hosting video, which is not recommended (B5). `SITUATIONAL`.
- **News sitemap** — requires Google News inclusion and only covers the last 48 hours of articles. Not applicable (C2). `DEAD` for this site.

**Effort:** Low.

**Realistic traffic, zero-authority site:** 0 direct visits/month; affects discovery latency and completeness, not ranking. Sitemaps do not make Google index pages it has judged not worth indexing — a very common misconception.

**Flag:** `WORKS` as insurance; **"submit a sitemap to get indexed/ranked" is a `MYTH`.**

**Sources:** Google Search Central, "Build and submit a sitemap" and image/video sitemap extensions (docs, current 2026).

---

## G3. RSS / Atom / JSON Feed

**What it is:** Machine-readable content feeds.

**Applied here:** Not a search channel, but a genuine discovery mechanism with three specific downstream uses that justify the ~1 hour it takes in Astro:
1. **Feed readers** — Feedly, Inoreader, NetNewsWire. Small but high-quality, high-retention audience.
2. **Syndication inputs** — MSN Partner Hub (G6), Flipboard, and various aggregators ingest RSS specifically. Having a valid full-content feed is a prerequisite for several other channels.
3. **Automation** — your own cross-posting pipelines.

Include full content or generous excerpts; feed readers ignore truncated stubs.

**Effort:** Low.

**Realistic traffic, zero-authority site:** 0–50 visits/month directly; its value is as a prerequisite for G6 and syndication.

**Flag:** `WORKS`, with modest direct expectations. The 2005-era claim that "RSS is a major traffic channel" is `DEAD`; the "RSS is completely dead" claim is also wrong — it survives as plumbing.

**Sources:** Astro RSS integration docs; MSN Partner Hub setup docs requiring an RSS/Atom feed.

---

## G4. WebSub (formerly PubSubHubbub)

**What it is:** A publish-subscribe protocol for instantly notifying subscribers when a feed updates.

**Applied here:** Historically its main value was fast Google indexing via Google's public hub — **that hub was shut down in 2017** and the tactic died with it. Remaining subscribers are a handful of feed services and IndieWeb tools. IndexNow (D2) is the modern equivalent for the engines that support push, and it is simpler.

**Effort:** Low.

**Realistic traffic, zero-authority site:** 0 visits/month.

**Flag:** `DEAD` for its historical purpose (Google indexing). Technically alive as a protocol, practically irrelevant here. Use IndexNow instead.

**Sources:** Google's PubSubHubbub hub shutdown, 2017; W3C WebSub Recommendation (2018).

---

## G5. IndexNow

Covered as **D2** — counted once there. Listed here only because it belongs categorically to "feeds and push protocols" as well as "non-Google engines".

---

## G6. MSN / Microsoft Start syndication (Partner Hub)

**What it is:** Microsoft's publisher program that ingests a publisher's RSS feed and distributes articles across MSN.com, the Edge new-tab feed, the Windows widgets panel and the Start app — an enormous default-placement surface.

**Applied here:** Potentially one of the largest single-surface opportunities listed anywhere in this report, because Edge's new tab and the Windows taskbar widget are default-on for a huge Windows install base, and budget-food content performs well in that feed's demographic. **But it is invitation-only:** MSN Partner Hub requires a unique invite code emailed by Microsoft, and all partners are vetted on application and periodically thereafter.

Realistic path: have a valid full-content RSS feed (G3) and a credible-looking publication, then apply/request an invite and expect rejection at current scale. Revisit once the site has an established publishing record.

**Effort:** Low to apply; the gate is the obstacle.

**Realistic traffic, zero-authority site:** 0/month while ungated. If admitted — which is unlikely at this site's current stage — 1,000–20,000/month is the observed band for accepted small publishers, with the same volatility profile as Discover.

**Flag:** `SITUATIONAL` — condition: requires a Microsoft invitation, which a site with no traffic history is unlikely to obtain. Worth one application attempt, not worth planning around.

**Sources:** Microsoft Support, "Get started with MSN Partner Hub" and "How to set up your MSN Partner Hub account" (current 2026) — confirm invite-only status and RSS/Atom requirement.

---

## G7. `max-image-preview:large` and robots meta directives as a discovery lever

**What it is:** The robots meta directive controlling how large an image preview Google may show.

**Applied here:** Called out separately from generic technical SEO because it is a *hard prerequisite for Google Discover* (C1) and a meaningful CTR factor in web results, it takes one line, and it is exactly the kind of thing that silently isn't set. Should be verified in the Astro base layout and/or `public/_headers`.

**Effort:** Minutes.

**Realistic traffic, zero-authority site:** 0 by itself; unlocks C1 entirely.

**Flag:** `WORKS`. Best minutes-to-potential ratio in the report.

**Sources:** Google Search Central, "Robots meta tag, data-nosnippet, and X-Robots-Tag specifications" (docs, current).

---

# PART H — Browser, OS and New-Tab Recommendation Surfaces

A category that has *shrunk dramatically* in the last two years. Several of the classic entries here are now dead, which is itself the useful finding.

---

## H1. Chrome mobile new-tab feed

**What it is:** The article feed on Chrome's Android/iOS new-tab page.

**Applied here:** This is Google Discover under a different wrapper — the same index, same eligibility, same optimization. Counted once, at **C1**. Listed here to prevent double-counting, because SEO guides routinely present "Chrome feed" and "Google Discover" as two channels. They are one.

**Flag:** Same as C1 (`WORKS`).

---

## H2. Microsoft Edge new-tab feed / Windows widgets

**What it is:** The content feed on Edge's new tab and the Windows 11 widgets board.

**Applied here:** Fed by Microsoft Start, so the entry point is **G6** (Partner Hub, invite-only). Counted once at G6. There is no way to appear here by crawling alone.

**Flag:** Same as G6 (`SITUATIONAL`, gated).

---

## H3. Firefox new-tab recommendations (formerly Pocket)

**What it is:** Recommended stories on Firefox's new-tab page.

**Applied here:** **Pocket itself is gone** — Mozilla halted new downloads on 2025-05-22, moved to export-only on 2025-07-08, and permanently deleted user data on 2025-10-08. Mozilla stated the curated recommendations would persist in the Firefox new-tab experience, but there is no publisher submission mechanism, no self-serve program, and the old "get saved to Pocket → get recommended" pathway no longer exists. Firefox's share is also ~2–3% and falling.

**Effort:** N/A — nothing to do.

**Realistic traffic, zero-authority site:** 0–10 visits/month.

**Flag:** `DEAD` as a targetable channel (Pocket shutdown completed October 2025). Any guide recommending "get featured on Pocket" is stale.

**Sources:** Mozilla Blog, "Investing in what moves the internet forward" (2025-05-22); Mozilla support, Pocket shutdown timeline; Firefox Help, "Recommended stories on the Firefox New Tab page".

---

## H4. Samsung phone feeds (Samsung Free / Samsung Daily / Samsung News)

**What it is:** The left-of-home-screen content panel on Galaxy devices.

**Applied here:** **Samsung Free was discontinued on 2025-12-16** and replaced by Samsung News. There is no open publisher program for small independent sites; the feed is licensed from news partners. On many Galaxy devices the panel is Google Discover anyway, which routes back to C1.

**Realistic traffic, zero-authority site:** 0 visits/month.

**Flag:** `DEAD` as a targetable channel.

**Sources:** Samsung support, "Samsung Free Discontinuation Notice" (2025); SamMobile coverage of the December 16, 2025 shutdown.

---

## H5. Opera news feed / Opera browser discovery

**What it is:** Opera's built-in news feed and speed-dial content.

**Applied here:** Opera's global share is ~2%, heavily concentrated outside the US, and its feed is populated from licensed news partners without an open small-publisher program. No path in.

**Realistic traffic, zero-authority site:** 0–5 visits/month.

**Flag:** `DEAD` for this site (no accessible submission surface).

---

## H6. Arc browser

**What it is:** Formerly a differentiated Mac browser with curated surfaces.

**Applied here:** **Arc is discontinued.** The Browser Company halted active development on 2025-05-27 in favour of Dia, an AI-first browser publicly launched on macOS 2025-10-09; Atlassian acquired the company in a $610M deal that closed 2025-10-21. Arc receives security fixes only.

**Flag:** `DEAD`. Included because it was on the brief's list and the answer is definitive.

**Sources:** Engadget and 9to5Mac coverage (2025-05-27); Wikipedia, "Arc (web browser)"; Atlassian acquisition close 2025-10-21.

---

## H7. Dia / AI-browser surfaces (the successor question)

**What it is:** The emerging class of AI-first browsers (Dia, Comet, ChatGPT Atlas, Copilot Mode in Edge) that answer queries in-browser.

**Applied here:** No publisher program, no submission, no optimization surface. They retrieve via existing indexes and AI crawlers, so the work is already covered by F3–F6. Their net effect on publishers is likely *negative* (more answers, fewer clicks). Monitor; do not build for.

**Realistic traffic, zero-authority site:** 0–10 visits/month.

**Flag:** `SITUATIONAL` — condition: free rider on Part F; revisit if any of them ship a publisher program.

---

# PART I — The Graveyard: Dead, Dubious and Mythical Search Methods

The brief asked for these explicitly, and they are worth documenting for a real reason: **a large fraction of the SEO advice currently on the web still recommends them.** Anyone researching "how to get traffic" in 2026 will be told to do most of what follows. Each is listed so it can be recognized and skipped.

Two of them (I13, I14) carry active risk of penalty, not merely wasted time.

---

## I1. Meta keywords tag

Google has not used the `keywords` meta tag since at least 2009 and said so publicly. Bing treats it as a spam signal at worst. **`DEAD`** — and it was never a traffic method, it was a ranking input that was abandoned. *Source: Google Search Central Blog, "Google does not use the keywords meta tag in web ranking" (2009-09-21).*

## I2. Keyword density targets ("aim for 2–3%")

There is no density threshold, no optimal percentage, and no evidence any modern engine computes one. It persists because early SEO tools reported the metric. Writing to a density target actively degrades text. **`MYTH`.**

## I3. LSI keywords

"Latent Semantic Indexing keywords" is a term borrowed from a 1980s information-retrieval technique that Google does not use and has explicitly said it does not use. The underlying advice ("cover related concepts") is fine; the label and the tools sold around it are pseudo-science. **`MYTH`.** *Source: repeated public statements from Google Search Relations, 2019–2023.*

## I4. Article directories (EzineArticles, ArticleBase, GoArticles et al.)

Mass-submitting articles with author-bio backlinks. Destroyed by the Panda update (Feb 2011); most of these sites are gone, deindexed or nofollowed. **`DEAD`.**

## I5. Web directory submission (DMOZ, Yahoo Directory, "submit to 500 directories")

DMOZ closed on 2017-03-17; the Yahoo Directory closed in 2014. Surviving general directories carry no weight and the automated submission services are link-scheme violations. **`DEAD`.** The narrow exception is genuinely curated, human-edited niche directories with real audiences — but those are a link tactic, not a search-engine tactic, and belong in the backlinks file.

## I6. Search engine submission services ("submit your site to 500 engines")

There are not 500 search engines with traffic; there are roughly four indexes that matter (Google, Bing, Yandex, Baidu) plus a handful of independents. Submission was never how Google discovered pages, and the paid services are pure fraud. **`MYTH`.**

## I7. Ping services (Pingomatic and successors)

Notifying blog-ping aggregators on publish. The aggregators they ping are largely defunct, and Google discontinued its blog-ping service in 2017. IndexNow (D2) is the legitimate modern equivalent. **`DEAD`.**

## I8. Blog comment links and forum signature links

Dropping links in comment sections and forum signatures. Universally `nofollow`/`ugc` since 2005, aggressively filtered, and treated as a link scheme when done at scale. Also a fast route to being banned in exactly the communities that matter for this niche — see the recorded ECAH ban. **`DEAD`,** and locally hazardous.

## I9. Google Authorship (`rel=author`) and the author photo in results

Google shut Authorship down in August 2014 and removed author photos from results. Still recommended in old guides. Note the distinction: **structured author markup on `Article`/`Person` is still worth having for entity clarity — it just produces no visible result.** **`DEAD`** as a search appearance.

## I10. AMP (Accelerated Mobile Pages)

Once required for the Top Stories carousel. Google removed the AMP requirement for Top Stories in 2021 and it has no ranking benefit. On a static Astro site delivered from Cloudflare's edge, AMP would make pages *slower to build and no faster to load*. **`DEAD`** (except as the underlying format of Web Stories, C3, which is itself a zombie).

## I11. Social signals as a direct ranking factor

The claim that likes/shares/follower counts directly raise Google rankings. Google has denied it repeatedly and consistently. Social platforms do drive traffic and *indirectly* generate links and brand mentions (which per F7 may matter for AI citation) — but the direct-ranking-factor claim is **`MYTH`.**

## I12. Bounce rate / time-on-site / "dwell time" as direct ranking factors

Google has repeatedly stated it does not use Google Analytics data or bounce rate in ranking. User-interaction data is used in aggregate for system evaluation (and the 2024 documentation leak showed click-related features exist), but "lower your bounce rate to rank higher" is not an executable tactic. **`MYTH`** as commonly stated.

## I13. Private Blog Networks (PBNs) and paid links

Buying links or building a network of sites to link to yourself. This *does* still work mechanically in some niches, which is why it persists — and it is an explicit violation of Google's link spam policies, enforced both algorithmically (SpamBrain) and by manual action. For a single-operator site with one domain and no fallback, a manual action is an extinction event. **`SITUATIONAL` in the sense that it functions; treated here as prohibited.** Do not do this.

## I14. Programmatic mass-publishing of AI-generated pages ("scaled content abuse")

Generating thousands of templated pages from a dataset. Google's March 2024 spam policy update named **scaled content abuse** explicitly and it is enforced. This one deserves a direct warning for this specific site: **a nutrition-per-dollar dataset is exactly the kind of asset that tempts you to auto-generate "cheapest source of X" pages at scale, and the existing pipeline makes it technically easy.** The distinction Google draws is whether pages provide genuine value independently, not whether AI was used. A handful of genuinely useful data pages: fine. Six hundred templated permutations: a policy violation.

Given that this site already has 216 pipeline-assisted articles, this is worth an honest internal check rather than a theoretical note. **`DEAD` / actively penalized.** *Source: Google Search Central Blog, "What web creators should know about our March 2024 core update and new spam policies" (2024-03-05).*

## I15. Exact-match domains, keyword-stuffed domains, and subdomain/subdirectory keyword tricks

The EMD update (Sept 2012) removed most of the benefit of exact-match domains. Keywords in the domain are a negligible signal. **`MYTH`** as a current tactic.

## I16. Doorway pages and location-permutation pages ("cheapest protein in [city]" × 500)

Explicitly against Google's spam policies since long before 2016, and for this site there is no genuine differentiation between cities anyway. **`DEAD`.**

## I17. Keyword stuffing, hidden text, white-on-white text, alt-text stuffing

The original black-hat toolkit. Detected trivially, penalized. **`DEAD`.**

## I18. Article spinning / synonym rewriting

Producing "unique" content by mechanical synonym substitution. Killed by Panda (2011) and now trivially detected. **`DEAD`.**

## I19. Sitemap `<priority>` and `<changefreq>` tags

Google has stated it ignores both. Bing has said essentially the same. Setting them is harmless and useless. **`MYTH`.**

## I20. "Domain Authority" / "Domain Rating" as a Google metric

DA (Moz) and DR (Ahrefs) are third-party estimates, not Google signals. Google has confirmed it has no single "domain authority" score. They are useful as *relative* diagnostics and useless as targets. **`MYTH`** as a Google metric. (The underlying reality — that site-level trust exists and matters — is real, which is why the myth is durable.)

## I21. Expired-domain purchase and 301 redirection

Buying an aged domain with links and redirecting it to yours. Named directly in Google's March 2024 spam policies as **expired domain abuse**. **`DEAD` / penalized.**

## I22. Schema markup as a direct ranking boost

Structured data earns *appearances* (B9, G1), not ranking. Google has stated repeatedly that structured data is not a ranking factor. Adding schema to a page that does not rank changes nothing. **`MYTH`** as a ranking lever; `WORKS` as an appearance and machine-readability lever.

---

# PART J — Synthesis

## J1. Tally

**96 distinct methods documented** across 100 entries (4 entries are explicit cross-references to avoid double-counting: E2→C5, G5→D2, H1→C1, H2→G6).

By flag:

| Flag | Count | Notes |
|---|---|---|
| `WORKS` | 21 | Currently functioning and worth doing, though many are prerequisites rather than growth levers |
| `SITUATIONAL` | 27 | Each has its blocking condition named inline |
| `DEAD` | 31 | Includes 10 that are dead *specifically for this site* (wrong audience or structurally unavailable) rather than dead in general |
| `MYTH` | 17 | Never worked, or never worked the way it is described |

The headline finding is uncomfortable: **more than half the documented methods are dead or mythical.** The search-traffic surface available to a small independent publisher in 2026 is materially smaller than it was even three years ago — FAQ rich results died in May 2026, HowTo in 2023, seven more schema types in June 2025, Pocket in October 2025, Samsung Free in December 2025, Arc in 2025, and AI Overviews now suppress clicks on roughly two-thirds of searches.

## J2. The structural read on this site

Three facts dominate everything above:

1. **Google web search is not winnable in the near term.** Zero backlinks, no brand signal, a YMYL-adjacent niche, and a large pipeline-generated archive is the exact profile the post-HCU system suppresses. Every Part A lever is worth doing, and none of them will produce traffic this year on their own.
2. **The dataset is the only real asset.** 22 CSVs of nutrition-per-dollar data is genuinely scarce. Every high-expected-value method in this report routes through it — Dataset Search, image/chart results, AI citations, and the one plausible mechanism for earning a first backlink.
3. **The channels that ignore domain authority are where the traffic actually is.** Bing, Pinterest, Discover and Dataset Search all rank content on signals other than site authority. That is the whole strategic point of this document.

## J3. Top 5 for this site

**1. Bing Webmaster Tools + IndexNow** (D1, D2, F5)
A few hours of work, no gatekeeper, and Bing ranks low-authority sites that Google will not touch — while simultaneously covering DuckDuckGo, Yahoo, AOL and Copilot's grounding index. Estimated 50–500 visits/month within six months. The best effort-to-traffic ratio available.

**2. Fix the Pinterest account suppression, then run the existing pin pipeline** (E1)
Highest ceiling of anything here (100–2,000/month) for an audience that is an exact demographic match, using infrastructure that already exists — but it is worth zero until today's diagnosed suppression is actually resolved. Diagnose first; posting volume before then is wasted.

**3. Google Discover eligibility** (C1 + G7)
A one-line `max-image-preview:large` directive plus ≥1200px hero images makes the site eligible for a channel that requires no rankings and no backlinks. Most likely outcome is nothing; the tail outcome is thousands of visits in a weekend. Cheapest lottery ticket in the report — buy it, don't plan on it.

**4. Publish the 22 CSVs as marked-up datasets** (C6, plus A12 and G1)
Direct traffic is small (5–80/month), but this is the highest-value *link and citation* play available: it puts scarce data in front of journalists, researchers and AI engines, which is the only realistic route out of zero authority. Blocked on resolving why commit `f443e10`'s CC BY licensing was reverted in `207442c` — settle that first, because `Dataset` markup effectively requires a stated license.

**5. Internal linking across the existing 216 articles + 3 pillar pages** (A5 + A4)
The only lever that works entirely offline, with no external gatekeeper, on an asset that already exists. It is also the necessary precondition for anything else to convert: the pillars are the only pages capable of earning a link, and internal links are the only PageRank the site currently has to distribute. Repo tasks #4 and #5 are one project and should be run as one.

**Honourable mention / the thing I would do before any of the five:** an honest quality audit of the 216 articles (A8). If a meaningful share are thin, they are suppressing everything else at the site level, and every item above under-performs until that is fixed. It produces no traffic itself, which is exactly why it keeps getting skipped.

## J4. What to deliberately not do

Ranked by how much time they would waste: `llms.txt` (F8), Web Stories (C3), AMP (I10), crawl-budget work (A9), FAQ schema (B11), knowledge-panel chasing (B8), Yandex/Baidu/Naver/Seznam optimization (D7–D10), and any paid indexing or link service (C8, I13).

And one hard line: **do not scale-generate pages from the dataset** (I14). The pipeline makes it easy, the dataset makes it tempting, and it is a named, enforced spam policy.

---

*Compiled 2026-07-26. Research only — no site changes, commits, or posts were made.*

*Verification status: Google-documented behaviours are cited to Search Central and are reliable. Market-share figures, AI-citation studies and 2026 trade-press claims are marked `[secondary]` or `[UNVERIFIED]` inline; a number of 2026 SEO-blog sources encountered during research appear to be themselves AI-generated and were used only where multiple independent sources agreed. Traffic estimates are engineering judgment for this site's specific starting position, not measured data.*

