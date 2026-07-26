# SEO / Growth Breakthrough Research — daily-life-hacks.com

Date: 2026-07-26
Author: growth strategy research pass (research only — no site content was written or edited)
Scope: what it would actually take to get this site from ~5 Google impressions/day to tens of thousands of monthly visits.

---

## 0. What I assumed about the site, and what I verified

Verified from the repo (2026-07-26):

- 210 canonical articles, 234 built pages, 226 URLs in the production sitemap.
- Google Search Console: **132 indexed, 486 not indexed** (report last updated 2026-07-10). Last 28 days: **135 impressions, 1 click**. Prior 28 days: 96 impressions, 1 click. (`reports/growth/search-recovery-2026-07-23.md`)
- Bing: 155 impressions, 1 click in 28 days; the four best Bing pages have 38/31/9/8 impressions and **0 clicks each** at average positions 6.4–7.9. (`reports/growth/bing-query-opportunity-2026-07-26.md`)
- Technical hygiene is genuinely done: 0 on-page checklist issues, 0 thin articles under 800 words, 8,490 internal anchors, 0 rendered orphans, 16/16 canonical routing tests pass, Dataset schema fixed, Recipe report clean, 410s for dead URLs, one-hop 301s.
- `max-image-preview:large` and `og:image` are already emitted sitewide (`src/layouts/BaseLayout.astro`). Hero images are 1376×768 or larger — **already above Google Discover's 1200px / 300,000px minimum**.
- 7 interactive tools already exist under `/tools/` (fiber-per-dollar, grocery budget, grocery trip savings, unit price, recipe cost, recipe finder, shopping list builder).
- 6 public CSV datasets under `/data/`, 6 pages carrying Dataset schema.
- Pinterest: 1,466 impressions and **21 outbound clicks** in a trailing 30 days (W28 scorecard). The 90-day eligible-pin view is 9,620 impressions / 319 outbound clicks across 66 pins.
- A 25-prospect data-led backlink campaign is fully researched and drafted but **zero outreach has been sent** (`reports/growth/fiber-backlink-campaign-2026-07-15.md`).
- Reddit posting is blocked on OAuth credentials and a self-imposed karma gate; 10 drafts exist, none posted via the pipeline.

**Could not verify:**

- "41 AI citations/day from Bing Copilot." The repo's own dated evidence is *93 Copilot citations in 7 days for the budget-fiber pillar* on 2026-07-15 (~13/day for one page). Same order of magnitude, different measurement. Treat 41/day as unconfirmed until a dated Bing AI Performance export is stored.
- "Zero backlinks across 249 crawled URLs." I did not run a backlink tool. Nothing in the repo contradicts it, and the 0-outreach-sent status makes it entirely plausible. **This single fact drives most of the conclusions below, so verify it before acting.**
- The scorecard's "15,734 pageviews" is a known-defective metric (it sums all funnel event types, not page views). There is currently **no trustworthy sessions number for the site**. That is a problem for everything that follows.

---

## 1. The verdict

### Is 10,000–50,000 monthly visits achievable in 6–12 months?

**From Google organic search alone: no. Not close. Probability under 10%.**

**As total sessions across all channels: possible at the low end (10k–15k) by month 12, but only if the site stops behaving like an SEO project and starts behaving like a publisher with distribution. Not by month 6.**

Here is the arithmetic that settles it.

Ahrefs published median organic traffic benchmarks on **2026-06-23** ([source](https://ahrefs.com/blog/average-organic-traffic-benchmarks/)):

| Domain Rating | Median monthly organic clicks |
|---|---:|
| 0–10 | 9 |
| 10–20 | 60 |
| 20–30 | 133 |
| 30–40 | 308 |
| 40–50 | 831 |
| 60–70 | 3,630 |
| **70–80** | **10,988** |
| 80–90 | 50,292 |

And by site size: 500–1,000 indexed pages → median 5,754 clicks/month.

10,000 monthly organic clicks is, at the median, **DR 70–80 territory**. This site is at DR ~0 with (probably) zero referring domains. Ahrefs' own framing: "authority is the single biggest predictor of traffic," and growth is exponential, not linear. You do not cross five DR bands in six months with one operator.

The market is also moving against you. Similarweb clickstream data via SparkToro's June 2026 study puts **zero-click Google searches at 68%**, up from 60% in 2024 ([Search Engine Land, 2026](https://searchengineland.com/google-zero-click-searches-2026-study-479717)). Pew Research found users click a cited source in an AI Overview about **1%** of the time. The Digital Bloom's March 2026 Organic Traffic Crisis Report measured CTR with AI Overviews falling from **1.76% to 0.61% (-65%)** year over year, and even without AIO from 2.74% to 1.62% ([source](https://thedigitalbloom.com/learn/organic-traffic-crisis-report-2026-update/)). Median publisher traffic is down 10%. So the same ranking that produced X clicks in 2024 produces roughly a third of X now.

### The biggest single constraint

**Zero external corroboration — no referring domains and no brand demand — sitting on top of a documented quality demotion.**

Everything else is downstream of this:

1. **Crawl demand follows authority.** Google reduces crawl demand automatically when a site sends weak quality signals; pages with more links from authority pages get crawl priority. That is why 486 URLs are not indexed and why two flagship studies sat at *Discovered — currently not indexed* with "no detected referring page." The site is not being under-ranked; it is being **under-selected**.
2. **Recovery from a core-update demotion requires a signal Google can re-evaluate.** Google's guidance is that meaningful recovery usually isn't visible until a later update reassesses the site, and Glenn Gabe's tracking of 380+ severely-hit sites found only about **1 in 5 showed meaningful recovery**. With zero links and zero brand queries, Google has no new evidence to reassess *with*.
3. **The May 2026 core update rewarded exactly your intended position and punished exactly your history.** Winners were "primary destinations, original sources, and genuinely authoritative references"; losers were "derivative pages that mostly repackage what other sources already say" and sites that scaled AI content ([May 2026 core update analyses, June 2026](https://www.digitalapplied.com/blog/google-may-2026-core-update-complete-recovery-playbook)). The priced-food studies are genuinely primary-source work. Google just has no way to know that, because nobody has ever linked to them.

### The second constraint, and it is nearly as bad

**A pseudonymous byline is now a structural cap.** On **2026-02-01** Google added an Authors section to Search Central documentation for the first time. The February 2026 Discover core update is reported to evaluate page-level E-E-A-T *before* engagement, with anonymous content explicitly disadvantaged. Contently (2026-05-11) reports pages without named authors are materially less likely to be cited by ChatGPT / Perplexity / AI Overviews (the specific "~40% less likely" figure is vendor-published and I could not trace it to a primary study — **flag it as unverified**). The direction of travel is unambiguous even if the number is soft.

### Realistic targets

| Horizon | Google organic clicks/mo | Total sessions/mo | Conditions |
|---|---:|---:|---|
| Now | ~1 | unknown (no trustworthy metric) | — |
| +90 days | 100–400 | 800–2,500 | 10+ real referring domains landed; consolidation done; Pinterest/FB running daily |
| +6 months | 400–1,500 | 3,000–8,000 | Google re-crawls and re-selects after a core update; Discover starts intermittently firing |
| +12 months | 1,500–6,000 | **10,000–20,000** | One Discover breakout OR one PR hit that produces 30+ referring domains, plus a working owned channel |
| +12 months, bad case | ~200 | 2,000–4,000 | No links land, no author fix, publishing continues at volume |

50,000/month is a 24–36 month target, not a 12-month one, and it requires the site to become a name people search for.

---

## 2. The ten highest-leverage moves, ranked

Ranking criterion: expected sessions unlocked per unit of one-operator effort, weighted by how many other things it unblocks.

---

### 1. Send the fiber-per-dollar digital PR campaign that is already written

- **Expected impact:** Very high. This is the unblocking move for crawl demand, index selection, core-update reassessment, and Discover trust. Realistic outcome: 3–10 referring domains from 12 sends.
- **Time to effect:** Links in 2–8 weeks; crawl/index effect 4–12 weeks after that.
- **Effort:** Low — 25 prospects researched, contact routes verified, drafts staged. This is ~6 hours of sending and following up.
- **Evidence:** Digitaloft analyzed 500+ digital PR campaigns and 45,000+ earned links: average **42 unique referring domains per campaign**, average DR 61, 82% followed ([2026-07-05](https://digitaloft.co.uk/insights/digital-pr-link-building-statistics)). 48.6% of SEOs now rate digital PR the single most effective link tactic, more than 3× the next (guest posting, 16%). Counterweight from the same source: only 33% of pitch emails get opened and 73% of journalists reject pitches as irrelevant, so 42 RDs/campaign is an agency-scale number — for one operator with 12 sends, **3–10 links is the honest expectation**, not 42.
- **First action for this site:** Execute Wave 1 (FB-001…006, education/resource curators) and Wave 2 (FB-007…012, grocery/consumer editors) from `reports/growth/fiber-backlink-campaign-2026-07-15.md` this week. Re-open the five 403-blocked prospects (The Kitchn, Progressive Grocer, U. Minnesota Extension, The Penny Hoarder, Clark.com) in a real browser first. Do not send outreach quoting the Copilot citation count until a dated export exists — the campaign doc already says this.

---

### 2. Attach the datasets to the live grocery-inflation news cycle

- **Expected impact:** High, and this is the highest-ceiling single move. A national outlet citing "28× fiber-per-dollar gap between split peas and blueberries" is worth more than 100 articles.
- **Time to effect:** 2–10 weeks; one hit can land in days.
- **Effort:** Medium — one reactive pitch per month, 3–4 hours each.
- **Evidence:** Food-at-home CPI was **2.7% higher in June 2026 than June 2025**, and USDA ERS forecasts food-at-home prices rising 2.7% in 2026, above the 20-year 2.6% average ([USDA ERS Food Price Outlook](https://www.ers.usda.gov/data-products/food-price-outlook/summary-findings)). Grocery prices are being actively covered — Newsweek, NBC News' grocery price tracker, FMI briefings — and reporters are sourcing academic food economists. Digitaloft's data shows reactive PR / newsjacking used by 32% of marketers and "data-led content and expert commentary" by 95.3% of businesses ([2026-07-05](https://digitaloft.co.uk/insights/digital-pr-link-building-statistics)). Original research and statistics pages attract roughly 2.6× more links than how-to articles.
- **First action for this site:** On each CPI release day (BLS, monthly), publish a one-paragraph, dated update to the fiber-per-dollar and protein-per-dollar rankings using that month's shelf prices, and send a single 150-word note with the CSV to 3 reporters who covered the previous release. Angle: *"The CPI says groceries are up 2.7%. Here's what that did to the cheapest gram of fiber in America."* Nobody else publishes a repriced nutrient-per-dollar index monthly.

---

### 3. Resolve the author identity problem

- **Expected impact:** High, and it is a gate, not an optimization. It caps Discover, AI citation share, and core-update reassessment.
- **Time to effect:** 1 week to implement; 3–6 months for the trust signal to compound.
- **Effort:** Low technically, high emotionally — this is a decision about the pen name, and it is the owner's to make.
- **Evidence:** Google added an Authors section to Search Central on **2026-02-01**, documenting how it identifies authors and why authorship transparency matters for search quality. Google's Discover documentation (last updated **2026-03-09**) requires content to pass content policies and page-level quality before ranking is even considered ([source](https://developers.google.com/search/docs/appearance/google-discover)). Discover's February 2026 core update is reported to evaluate E-E-A-T at page level before engagement, with anonymous or AI-generated content significantly disadvantaged. Contently (**2026-05-11**) on author credentials and AI citation. Recovery case studies from the March 2026 update repeatedly feature *credentialed named humans with schema-marked credentials*.
- **First action for this site:** Pick one of three workable options, in order of strength:
  1. **Real named publisher.** The owner becomes the accountable named person — "Research and pricing by [real name], Daily Life Hacks" — with a real photo, a real LinkedIn, and a real methodology page. Strongest signal. Requires giving up anonymity.
  2. **Named reviewer over the pen name.** Retain David Miller as the writer voice but add a real, verifiable reviewer (an RD, a nutrition MS, a food-economics grad student) who signs off on the studies, with `reviewedBy` schema and a link to their external profile. A monthly fee buys you the credential the site cannot generate itself. This is the pragmatic option.
  3. **Disclosed editorial persona.** State plainly on the About page that David Miller is the site's editorial voice, name the real publishing entity behind it, and put the real person's name on the methodology and data pages only. Weakest, but honest, and honesty about a persona is much safer than a persona that reads as a fake human.

  Do **not** keep an undisclosed pen name presented as a real person while chasing Discover and AI citations. That is the exact profile the February 2026 filters are built to catch.

---

### 4. Consolidate: cut the article count, do not grow it

- **Expected impact:** High. This is the documented recovery pattern, and it is counter-intuitive enough that it will not happen unless it is scheduled.
- **Time to effect:** 2–6 months (needs a core update to reassess).
- **Effort:** Medium-high — 20–40 hours of merging and redirecting.
- **Evidence:** The recovery pattern that works is *reducing the number of low-quality pages, not just updating them*; The Digital Bloom's first recommendation is "consolidate overlapping informational pages" ([2026-03-07](https://thedigitalbloom.com/learn/organic-traffic-crisis-report-2026-update/)). The March 2026 core update moved to **page-level authority evaluation** — a strong domain no longer protects weak pages, and weak pages are evaluated independently. HubSpot's broad top-of-funnel library lost 70–80%; that is the shape of your 210-article inventory.
- **First action for this site:** Pull the 90-day GSC impressions-by-page export. Every article with **zero impressions in 90 days** goes into one of three buckets: (a) merge into the nearest pillar and 301, (b) rewrite around an original number you can defend, (c) 301 to the closest study or tool. Target getting from 210 articles to **120–140 high-conviction URLs**. Keep every article that carries original priced data, every tool, and every cluster hub.
- **Caveat I want on the record:** the site has already been through one purge. Do not cut twice on the same evidence. Only cut pages that are both zero-impression *and* restate consensus with no original number.

---

### 5. Make Google Discover a deliberate target

- **Expected impact:** Very high ceiling, low floor. Discover is the only realistic path to a 10×–100× step change inside 12 months for a site with no link equity, because it is not keyword-competition-bound.
- **Time to effect:** Unpredictable. Weeks to never.
- **Effort:** Low incremental — the technical prerequisites are already met.
- **Evidence:** Google Discover is **not restricted to news**; content is automatically eligible if indexed and policy-compliant, and no Publisher Center registration or special markup is required ([Google, updated 2026-03-09](https://developers.google.com/search/docs/appearance/google-discover)). NewzDash's analysis of 400+ publishers found Discover rose from 37.03% of Google traffic in 2023 to **67.51% in Q4 2025**, while web search fell from 51.10% to 27.42% ([Press Gazette](https://pressgazette.co.uk/comment-analysis/google-discover-traffic-news-websites-2025/)). SDK-level research on Discover's nine-stage pipeline (Metehan Yesilyurt, reported by Danny Goodwin, **2026-02-25**) documents: publisher-level blocks fire *before* ranking; freshness windows of 1–7 days are strongest and decay after 30; a server-side predicted-CTR model uses title, image quality, recency and historical engagement; images under 1200px disqualify prominent cards; and the `nopagereadaloud` and `notranslate` meta tags can exclude a page entirely ([source](https://searchengineland.com/google-discover-qualifies-ranks-filters-content-research-470190)).
- **First action for this site:**
  1. `nopagereadaloud` and `notranslate` — **checked 2026-07-26, neither appears anywhere in `src/` or `public/`. This gate is clear.** (Re-check after any layout change; either tag is a silent total exclusion from Discover.)
  2. Confirm every article emits `og:title` and `og:image` with the 1376×768 hero (already true) and that no hero is text-heavy — Google explicitly warns against text-heavy images for `og:image`.
  3. Introduce a **timely** publishing lane: 1–2 pieces per week tied to the current month's prices, a seasonal produce window, or a live grocery story. Discover's freshness curve means an evergreen library alone will never trigger it.
  4. Audit every title against Discover's clickbait filter. Google's own wording bans "sensationalism to manipulate morbid curiosity, titillation, or outrage." A literal, specific title ("Split peas deliver 71g of fiber per dollar. Blueberries deliver 2.5g.") beats a curiosity gap.
- **Honest counterweight:** Google itself calls Discover traffic "less predictable or dependable" than search and says to treat it as **supplemental**. Do not build a business plan on it. Build the eligibility, then let it happen or not.

---

### 6. Promote the seven tools you already built instead of building an eighth

- **Expected impact:** High for links and AI citations, medium for direct traffic.
- **Time to effect:** 1–6 months.
- **Effort:** Low — the assets exist.
- **Evidence:** Fractl's interactive-content link building analysis documents Money Saving Expert's mortgage calculator earning links from **479 referring domains** and a hiking-time calculator earning 100+ domains including The New York Times ([source](https://www.frac.tl/interactive-tools-link-building/)). The Digital Bloom's #4 recommendation for 2026 is to "build answer-resistant assets (calculators, tools, workflows)" because they cannot be summarized away by an AI Overview. Mechanism worth understanding: **AI engines almost never execute JavaScript widgets** — they read the crawlable text wrapped around the tool (definition, formula, sample outputs, methodology) and cite that, while the interactive part convinces humans ([MaxAEO, 2026](https://maxaeo.ai/blog/interactive-tools-ai-citations/)).
- **First action for this site:** For each of the 7 tools, add crawlable static text below the widget: the formula, 5–10 worked example outputs as an HTML table, the data source, and the date. Then pitch the grocery unit-price calculator and the grocery-trip-savings calculator to consumer-finance and university-extension pages as a free resource — same prospect list mechanics as move #1, different asset. The trip-savings calculator answering "is the farther cheap store actually cheaper?" is the single most pitchable thing on the site, because a Reddit thread with 1,211 points and 772 comments already proved demand for that exact question.

---

### 7. Build an owned channel: email, seriously and weekly

- **Expected impact:** Medium for traffic, very high for survival and for the brand-demand signal.
- **Time to effect:** 3–12 months.
- **Effort:** Medium, recurring — 2–3 hours/week.
- **Evidence:** Pinch of Yum's email share of traffic nearly doubled from 3.9% (March 2024) to **6.76% (March 2026)**, described as "one of the most important shifts in the report" because of list ownership and algorithmic independence ([Food Blogger Pro, 2026-04-30](https://www.foodbloggerpro.com/blog/pinch-of-yums-traffic-trends-2024-vs-2026/)). Over the same window their **direct traffic collapsed from 21.97% to 9.84%** — the largest single change in the dataset — which is the clearest signal available that audiences no longer return to sites unprompted. The metric that matters is capture rate (new subscribers ÷ visitors per channel), not raw subscribers ([beehiiv, State of Newsletters 2026](https://www.beehiiv.com/blog/beehiiv-the-state-of-newsletters-2026)). Food-blog sponsorship rates for a 5,000–20,000 engaged list run $200–$2,000 per send, so this is also the fastest path to revenue that does not need 50k pageviews.
- **First action for this site:** Ship a weekly "This Week's Cheapest Gram" email — one repriced item, one chart, one link to a tool. Republish it on-site 48 hours later so it also becomes a crawlable dated page. The lead magnet and Kit automation are already live per project memory; the missing piece is a *reason to stay subscribed*.

---

### 8. Facebook, at daily volume

- **Expected impact:** Medium-high. This is the largest documented channel *gain* in the food-blog data I could find for 2024→2026.
- **Time to effect:** 3–9 months.
- **Effort:** High, recurring — this is the most labor-intensive item on the list.
- **Evidence:** Pinch of Yum's Facebook share went from **0.57% to 6.42%** of traffic between March 2024 and March 2026 after they began prioritizing it in Q4 2025 and posting **three times a day**, gaining nearly 500K followers ([Food Blogger Pro, 2026-04-30](https://www.foodbloggerpro.com/blog/pinch-of-yums-traffic-trends-2024-vs-2026/)). Over the same window Instagram fell from 1.25% to 0.62% and Pinterest fell from 6.33% to 3.99%.
- **First action for this site:** Do not start this until moves 1–5 are running. When you do: one page, 2–3 posts/day, native image + a genuinely useful number in the caption, link in the first comment or the post depending on what reach allows. Test for 60 days against a hard kill criterion (e.g. <300 sessions/month by day 60 = stop).
- **Honest counterweight:** this is a single site's result, self-reported, and it coincided with a platform-level Facebook push toward original content. It may not replicate. It is also the item most likely to burn a solo operator out.

---

### 9. Pinterest — fix the volume problem or downgrade the channel

- **Expected impact:** Medium at best. Currently it is delivering ~21 outbound clicks per 30 days, which is noise.
- **Time to effect:** 1–3 months.
- **Effort:** Low (automation exists) but the ceiling is capped.
- **Evidence:** Pinterest fell from 6.33% to 3.99% of Pinch of Yum's traffic 2024→2026 and is now "a supporting channel rather than primary strategy" ([Food Blogger Pro, 2026-04-30](https://www.foodbloggerpro.com/blog/pinch-of-yums-traffic-trends-2024-vs-2026/)). Other 2026 practitioner sources still rank Pinterest as the #2 organic source for food after Google and the most resilient for compounding clicks, so the picture is genuinely mixed.
- **First action for this site:** Your 90-day eligible-pin data (66 pins, 9,620 impressions, 319 outbound clicks, **3.32% aggregate CTR**) is a healthy CTR against a starved impression base. The bottleneck is impressions, not creative. Raise `MAX_PINS_PER_RUN` / daily cap from 1–2/day to 5–8/day for 60 days and measure account impressions, not pin CTR. If account impressions don't at least 3× in 60 days, demote Pinterest to maintenance and put the hours into moves 1, 2, and 7.

---

### 10. Manufacture brand demand — a named, recurring index

- **Expected impact:** Medium in year one, high in year two. This is the compounding asset.
- **Time to effect:** 6–18 months.
- **Effort:** Low incremental if bolted onto move #2.
- **Evidence:** Sites with strong brand signals reportedly survived both the March and May 2026 core updates with minimal losses while generic content sites saw 20–35% organic drops. The Google Content Warehouse API leak documented NavBoost memorizing user interaction data over a rolling 13-month window, with branded search volume and "good clicks" signaling that a site is a destination. The Digital Bloom's 2026 case studies attribute People.com's +27% and Men's Journal's +415% to "brand pull and destination intent" ([2026-03-07](https://thedigitalbloom.com/learn/organic-traffic-crisis-report-2026-update/)). **Flag:** the leak-derived NavBoost claims are widely reported but not confirmed by Google; treat as strong circumstantial evidence, not fact.
- **First action for this site:** Name the thing. "The Fiber Dollar Index" (you already have a video composition called `FiberDollarV1`). Publish it monthly on a fixed date, with a permanent URL, a version history, and a downloadable CSV. Every pitch, every Reddit comment, every email references it by name. The goal is that in 12 months someone searches "fiber dollar index" — that query is worth more to Google's assessment of the site than 50 more articles.

---

### Honorable mentions that did not make the ten

- **Google Preferred Sources.** Free, rolled out globally by April 2026, extended to AI Overviews and AI Mode in May 2026, and Google says users who select a preferred source click through to it **twice as often** ([Search Engine Journal](https://www.searchenginejournal.com/googles-preferred-sources-feature-is-now-a-global-seo-signal/573591/)). But it requires an existing audience to opt in, and six months in publishers still can't tell whether it moves traffic ([Digiday](https://digiday.com/media/media-briefing-without-transparency-publishers-cant-tell-if-googles-preferred-sources-feature-benefits-them/)). Add an opt-in prompt to the newsletter footer; spend no more time on it.
- **Reddit.** Reddit ranks #2 for visibility in US Google results behind Wikipedia and drives ~842M organic clicks/month in the US. Agencies report referring-domain spikes 2–4 weeks after a thread goes viral. But Reddit links are nofollow, this site has already been banned from r/EatCheapAndHealthy mid-viral (2026-07-13), and posting is currently blocked on credentials and a karma gate. **Keep Reddit as demand research only** — which is exactly what `reddit-demand-research-2026-07-19.md` already does, correctly. Do not make it a distribution bet.
- **Short-form video.** Food content shows a 23.5% engagement rate on YouTube Shorts and Shorts leads short-form on engagement (5.91%), but I found no credible 2026 data showing short-form reliably driving *blog sessions* for food. You have a Remotion pipeline; use it for Pinterest and Facebook creative, not as a standalone channel bet.

---

## 3. What to stop doing

1. **Stop publishing new articles at volume.** 210 articles are producing ~5 impressions/day. Article #211 will produce zero and will add another URL to a crawl budget Google has already throttled. Publishing more is the single most expensive way to make the problem worse. Evidence: recovery pattern is page reduction, not addition; March 2026 page-level authority evaluation.

2. **Stop technical SEO work.** It is done. 0 checklist issues, 16/16 routing tests, clean Dataset schema, clean Recipe report, 8,490 internal links, correct 410s, one-hop 301s. The marginal return on the next hour of technical SEO is approximately zero. As one 2026 source puts it, for 99% of sites what looks like a crawl budget problem is a content-quality, link, or speed problem. Yours is a link and trust problem.

3. **Stop title/meta micro-experiments on pages the engines haven't recrawled.** Your own `bing-query-opportunity-2026-07-26.md` already establishes this rule correctly (wilted lettuce last crawled March 1, file modified July 18). Honor it. Changing copy faster than the crawler reads it makes every experiment unreadable.

4. **Stop treating AI citations as a traffic KPI.** CTR from AI answers is measured below 1% — "an order of magnitude lower than a typical SERP." Pew found ~1% click-through on AI Overview citations. Citations are a *relevance and retrievability* signal — useful for prioritizing which pages to invest in — not a traffic channel. AI referral traffic converts extremely well (ChatGPT 7.1% per Similarweb, and Ahrefs found 0.5% of visitors from AI search drove 12.1% of signups) but the absolute volume is ~1% of site traffic for most sites. **Point AI citations at your email list, not at ad impressions.**

5. **Stop optimizing for Bing.** Bing is 5.14% of global search referrals as of April 2026 (Statista), ~17.6% of US desktop. The site's actual Bing return is 155 impressions and 1 click per 28 days at positions 6–8. Bing Webmaster Tools remains useful as a **free, fast-feedback crawl diagnostic** — keep using it that way — but stop spending decision-making hours on Bing ranking positions.

6. **Stop writing broad top-of-funnel informational content.** This is the exact category the CTR collapse hit hardest: -65% CTR with AI Overviews, HubSpot -70–80%. If the answer to a query fits in an AI Overview, do not write it. Write things that require a table, a calculator, a downloadable file, or a price collected this month.

7. **Stop counting the scorecard's "15,734 pageviews."** It sums all funnel event types. You currently do not know your session count. Fix this in week 1 or every decision below is being made blind.

8. **Stop building tools.** Seven is enough. Promote them.

9. **Do not buy guest posts, directory links, or "DR 50+" packages.** 52% of SEOs require DR 50+ minimums precisely because the low end is worthless, and a site recovering from a quality demotion is the worst possible candidate for a link pattern Google associates with manipulation.

---

## 4. The 90-day operating plan

Principle: **weeks 1–4 are subtraction and outreach. Weeks 5–12 are distribution. No new article volume at any point.**

### Week 0 — instrumentation (do this before anything else)
- Fix the sessions metric: filter `/api/analytics` to `event_type = 'page_view'`, or wire a real analytics source. Label everything with window start/end.
- Verify the backlink claim with a real tool (Ahrefs free Webmaster Tools works on a verified domain). Record the number.
- Export 90-day GSC impressions-by-page and Bing AI Performance citations. Store both dated in `reports/growth/`.
- ~~Grep for `nopagereadaloud` / `notranslate`~~ — done 2026-07-26, both absent.

### Weeks 1–2 — outreach wave 1 + author decision
- Send FB-001…006. One personalized email each. Log timestamp and recipient.
- Make the author-identity decision (move #3). Implement whichever of the three options is chosen, including `reviewedBy` schema if option 2.
- Build the consolidation list: every zero-impression-in-90-days article, bucketed merge / rewrite / redirect.
- **Publish nothing new.**

### Weeks 3–4 — outreach wave 2 + first consolidation batch
- Send FB-007…012. Follow up on wave 1 exactly once, seven days after.
- Execute consolidation batch 1: 30–40 URLs merged or redirected. One deploy, one sitemap resubmission, IndexNow ping.
- Add crawlable formula + worked-example text under all 7 tools.
- **Publish nothing new.**

### Weeks 5–6 — the index launches
- Launch **The Fiber Dollar Index** as a named, permanent, monthly-versioned page with CSV, method, and version history.
- Ship the first weekly email. Republish on-site at +48h.
- Raise Pinterest daily cap to 5–8/day. Start the 60-day impression test with a written kill criterion.
- First timely Discover-lane piece: current-month repricing.

### Weeks 7–8 — consolidation batch 2 + reactive PR
- Consolidation batch 2: another 30–40 URLs. Target reached: ~120–140 canonical articles.
- First reactive CPI pitch on release day — 3 reporters, 150 words, CSV attached on request only.
- Weekly email continues. One timely piece/week.

### Weeks 9–10 — tool outreach
- Pitch the grocery-trip-savings and unit-price calculators as free resources to 12 extension/consumer-finance/library pages.
- Second reactive CPI pitch.
- Review Pinterest 60-day test against the kill criterion. Decide: scale or demote.

### Weeks 11–12 — read the instruments, decide the next 90
- Measure, against the week-0 baseline: referring domains, Google indexed count, GSC impressions and clicks, Bing citations, email subscribers, sessions by channel, Discover impressions (a new GSC report appearing at all is itself the signal).
- Go/no-go on Facebook (move #8). Only start it if moves 1–7 are running without you.
- Write the next 90-day plan from the numbers, not from this document.

### Weekly cadence, every week
| Day | Task | Time |
|---|---|---|
| Mon | Scorecard: RDs, indexed count, impressions, clicks, subs, sessions by channel | 30 min |
| Tue | Outreach block — 3 sends or 3 follow-ups | 90 min |
| Wed | Consolidation block — 8–10 URLs merged/redirected | 2 hr |
| Thu | Weekly email written and sent | 2 hr |
| Fri | One timely piece (repricing / seasonal / news-attached) | 3 hr |
| Sat | Pinterest queue + creative | 45 min |
| Sun | Read one primary source (GSC, Bing, CPI, USDA). Change nothing. | 30 min |

**Standing rule: no title, meta, or URL change to any page an engine has not recrawled since the last change.** This rule already exists in your own reports. It is the difference between an experiment and noise.

---

## 5. How to steer the content agents

Give the article-writing agents these instructions verbatim. They are derived from the evidence above, and several of them contradict what a general-purpose content agent will do by default.

**Volume and permission**

1. **You may not create a new article URL unless it satisfies one of exactly two conditions:** (a) it is a monthly or seasonal repricing of an existing dataset, or (b) it is the consolidation target absorbing two or more existing articles. Everything else is an edit to an existing page. Default to "no new URL."
2. **When Reddit or search demand shows a need the site already answers, the deliverable is distribution or a tool improvement — not another article.** This rule already exists in `reddit-demand-research-2026-07-19.md` and it is correct. Enforce it.

**The originality bar**

3. **Every article must contain at least one number that exists nowhere else on the internet** — a price collected this month, a ratio computed from the site's own CSV, a cost per gram. If the agent cannot produce such a number, the article does not get written. Rationale: the May 2026 core update rewarded "primary destinations and original sources" and demoted "derivative pages that repackage what other sources already say."
4. **State the collection date and the method inline.** "Prices collected 2026-07-24 at [store type], USDA FoodData Central IDs listed below." This is what makes the page a primary source rather than a summary.
5. **Every number in outward-facing copy must be re-verified against the source CSV at delivery time.** This is already a recorded lesson from the 2026-07-13 Reddit launch. It applies to article bodies, titles, excerpts, pin copy, and pitch emails.

**Format**

6. **If the answer fits in a paragraph, do not write the article.** Google will answer it in an AI Overview and you will get a 0.61% CTR. Write things that need a sortable table, a calculator, a downloadable file, or a monthly update.
7. **Every article links to at least one tool and at least one dataset CSV.** The tools are the answer-resistant assets; the articles are the crawlable text that gets cited on their behalf.
8. **Kill the roundup/listicle instinct.** "15 best high-fiber foods" restates consensus. "The 15 cheapest grams of fiber in July 2026, repriced" is a primary source. Same list, different object.

**Titles and images (Discover gate)**

9. **Titles must be literal and specific. No curiosity gaps, no "you won't believe," no withheld answers.** Google's Discover documentation explicitly bans sensationalism that manipulates "morbid curiosity, titillation, or outrage," and the 2026 filters flag headlines that over-promise relative to the body. Put the number in the title.
10. **Every article ships a 1376×768-or-larger hero that is a photograph or a data graphic, not a text card.** Google warns against text-heavy images for `og:image`. Text-heavy creative belongs on Pinterest, not in `og:image`.

**Authorship**

11. **Every article carries the named byline decided in move #3, plus a named reviewer where a health or nutrition claim appears.** No generic brand bylines, no author-less pages.
12. **Write in first person with dated, specific experience.** "I priced 53 items at three stores on July 24" beats "studies show." First-hand experience with specific details is the documented differentiator in every 2026 recovery case study I found.

**Hard bans (in addition to the existing `david-miller-voice` bans)**

13. No medical claims, no dosage guidance, no "cures/treats/prevents." YMYL niches saw the earliest and most severe volatility in the May 2026 update.
14. No fabricated ratings, no claimed videos that don't exist, no invented expert quotes. The site's existing policy — only emit `aggregateRating` after five genuine ratings — is exactly right and must not be relaxed.
15. No AI-drafted article ships without a human adding something the model could not know: a price, a store, a failure, a photograph. The 2026 pattern is that AI-as-drafting-tool sites held up and AI-as-expertise-replacement sites dropped.

---

## 6. Sources

All URLs checked 2026-07-26. Dates are the source's own publication or update date where stated.

**Benchmarks and market data**
- Ahrefs, *Average Organic Traffic Benchmarks From Real Websites*, 2026-06-23 — https://ahrefs.com/blog/average-organic-traffic-benchmarks/
- The Digital Bloom, *Organic Traffic Crisis Report, 2026 Update*, 2026-03-07 — https://thedigitalbloom.com/learn/organic-traffic-crisis-report-2026-update/
- Search Engine Land, *Google zero-click searches reach 68% in early 2026* (Similarweb clickstream / SparkToro, June 2026) — https://searchengineland.com/google-zero-click-searches-2026-study-479717
- Similarweb, *Gen AI Stats 2026* — https://www.similarweb.com/blog/marketing/geo/gen-ai-stats/
- Statista, *Global search engine referral share, April 2026* — https://www.statista.com/statistics/1381664/worldwide-all-devices-market-share-of-search-engines/

**Food-site specific**
- Food Blogger Pro, *Pinch of Yum's Traffic Trends (2024 vs. 2026)*, 2026-04-30 — https://www.foodbloggerpro.com/blog/pinch-of-yums-traffic-trends-2024-vs-2026/
- Member Kitchens, *Food blog SEO in 2026* — https://memberkitchens.com/updates/food-blog-seo-guide
- USDA ERS, *Food Price Outlook — Summary Findings* (June 2026 data) — https://www.ers.usda.gov/data-products/food-price-outlook/summary-findings

**Google Discover**
- Google Search Central, *Get on Discover*, updated 2026-03-09 — https://developers.google.com/search/docs/appearance/google-discover
- Search Engine Land (Danny Goodwin), *How Google Discover qualifies, ranks, and filters content: Research*, 2026-02-25 — https://searchengineland.com/google-discover-qualifies-ranks-filters-content-research-470190
- Press Gazette, *Google Discover now makes up two-thirds of search traffic* (NewzDash, 400+ publishers, Q4 2025) — https://pressgazette.co.uk/comment-analysis/google-discover-traffic-news-websites-2025/

**Core updates and recovery**
- Digital Applied, *Google May 2026 Core Update Done: Final-State Recovery Plan* — https://www.digitalapplied.com/blog/google-may-2026-core-update-complete-recovery-playbook
- Digital Applied, *Surviving the March 2026 Core Update* — https://www.digitalapplied.com/blog/surviving-march-2026-core-update-seo-recovery-strategies
- SEO.ai, *How to Recover from a Google Helpful Content Update — Case Study* (includes Glenn Gabe's 380-site tracking, ~1 in 5 recovery rate) — https://seo.ai/blog/how-to-recover-from-a-google-helpful-content-update
- OpenPR, *What Google's Core Updates Actually Did to AI Content Sites in 2025 and 2026* — https://www.openpr.com/news/4466084/what-google-s-core-updates-actually-did-to-ai-content-sites

**Links and digital PR**
- Digitaloft, *71 Digital PR & Link-Building Statistics for 2026*, 2026-07-05 (500+ campaigns, 45,000+ links) — https://digitaloft.co.uk/insights/digital-pr-link-building-statistics
- Fractl, *How To Earn Links With Interactive Content* — https://www.frac.tl/interactive-tools-link-building/
- PressWhizz, *Best HARO Alternatives in 2026* — https://presswhizz.com/blog/best-haro-alternatives/
- Reporter Outreach, *State of Link Building 2026: A Survey of 500 SEO Pros* — https://www.reporteroutreach.com/blog/state-of-link-building

**E-E-A-T and authorship**
- Contently, *E-E-A-T and AI Search: Why Author Credentials Matter*, 2026-05-11 — https://contently.com/2026/05/11/eeat-and-ai-search-author-credentials/
- Google Search Central, *Creating Helpful, Reliable, People-First Content* — https://developers.google.com/search/docs/fundamentals/creating-helpful-content

**Other surfaces**
- Search Engine Journal, *Google's Preferred Sources Feature Is Now A Global SEO Signal* — https://www.searchenginejournal.com/googles-preferred-sources-feature-is-now-a-global-seo-signal/573591/
- Digiday, *Without transparency, publishers can't tell if Google's Preferred Sources feature benefits them* — https://digiday.com/media/media-briefing-without-transparency-publishers-cant-tell-if-googles-preferred-sources-feature-benefits-them/
- Joined Indexed, *Do Reddit Links Help SEO? What US Marketers Need to Know in 2026* — https://www.joinindexed.com/blog/do-reddit-links-help-seo-what-us-marketers-need-to-know-in-2026
- MaxAEO, *Interactive Tools and AI Citations* — https://maxaeo.ai/blog/interactive-tools-ai-citations/
- beehiiv, *The State of Newsletters 2026* — https://www.beehiiv.com/blog/beehiiv-the-state-of-newsletters-2026

---

## 7. Claims I could not verify — read before acting

| Claim | Status |
|---|---|
| 41 AI citations/day from Bing Copilot | Unverified. Repo evidence is 93 citations / 7 days for one pillar (2026-07-15). Store a dated Bing AI Performance export. |
| Zero backlinks across 249 crawled URLs | Not independently checked. Verify with Ahrefs Webmaster Tools in week 0 — the whole strategy hinges on it. |
| "Pages without named authors are ~40% less likely to be cited" | Vendor-published (Contently, 2026-05-11). No primary study traced. Direction is well-supported; the number is not. |
| "Cluster publishing for 12+ months → 40% higher organic traffic" / "clusters hold rankings 2.5× longer" | Vendor blogs, no methodology published. Treat topical clustering as sound practice, not as a quantified lever. |
| NavBoost / 13-month click memory / branded-search weighting | From the Google Content Warehouse API leak. Widely reported, never confirmed by Google. Strong circumstantial evidence only. |
| "Sites with strong brand signals lost minimally in March/May 2026 while generic sites dropped 20–35%" | Agency analysis, not primary data. Directionally consistent across multiple independent sources; specific percentages unreliable. |
| Ahrefs DR→traffic medians as a forecast for this site | These are all-niche medians including dormant domains. They establish the **order of magnitude** of the authority gap. They are not a prediction for any individual site. |
| "Recovery typically 2–6 months" / "3–6 months" | Repeated across many 2026 sources, none with published methodology. Google's own position is that recovery often is not visible until a later core update reassesses the site — which is a longer and less predictable statement. |
| Facebook 0.57% → 6.42% | Single site (Pinch of Yum), self-reported, one data point. May not replicate. |

---

*Research only. No site content was written or edited, no article was modified, nothing was committed to git.*
