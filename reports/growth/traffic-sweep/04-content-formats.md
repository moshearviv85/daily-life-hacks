# Traffic Sweep 04 — Content Formats, Products & Viral Mechanics

**Site:** daily-life-hacks.com — budget food, original nutrition-per-dollar datasets, recipes, US audience
**Assets on hand:** ~216 articles · 22 public CSVs · 7 free calculators · 31 original charts · Remotion video pipeline
**Constraints:** near-zero traffic, zero domain authority, no ad budget, one operator (non-coder, works via Claude Code)
**Scope:** what you MAKE and how it SPREADS. (Channels/distribution/SEO-technical live in sibling reports.)
**Date:** 2026-07-26 · Research only — no site edits, no commits, no posting.

## Legitimacy flags

| Flag | Meaning |
|---|---|
| **WORKS** | Evidence-backed; repeatedly documented to produce traffic/links |
| **SITUATIONAL** | Works only under a named condition — condition is stated |
| **DEAD** | Used to work, no longer does (platform change, algorithm change, saturation) |
| **MYTH** | Widely repeated, no good evidence, or actively counterproductive |

Effort scale: **XS** (<2h) · **S** (2–8h) · **M** (1–3 days) · **L** (1–2 weeks) · **XL** (ongoing program)
Traffic potential is stated for a **zero-authority site**, not for a site that already ranks.

---

## Index

- **A. Formats that attract links and shares** — §1–12 (data studies, annual index, surveys, "we tested," mega-lists, pillars, glossaries, comparisons, stats roundups, databases, teardowns, maps)
- **B. Free tools and products as traffic magnets** — §13–27 (calculators, embeds, generators, quizzes, printables, spreadsheet/Notion/Figma templates, Chrome extension, custom GPT, mobile app, cheat sheets, dashboard, dataset distribution, API)
- **C. Newsjacking and timing** — §28–34 (seasonal calendar, holidays, trend-riding, reactive news, price-shock hijacking, awareness months, January)
- **D. Psychological drivers of sharing** — §35–44 (arousal, practical value, social currency, triggers, surprising numbers, contrarianism, myth-busting, identity, curiosity gap, before/after)
- **E. Format mechanics** — §45–51 (headlines, hooks, thumbnails, skimmability, FAQ blocks, tables, original imagery)
- **F. Repurposing systems** — §52–58 (atomisation, the site's data→pin→short chain, article→video, transcripts, evergreen recycling, refresh/re-dating, translation)
- **G. Series, habit and franchise mechanics** — §59–63 (weekly feature, numbered series, annual editions, challenges, named methodology)
- **H. Weird, gimmicky, and things that worked anyway** — §64–74 (viral personalised calculator, tier lists, "what your X says," r/dataisbeautiful, silly generators, April Fools, Wikipedia, HARO successors, industry report, reverse-engineering hits, tools for pro audiences)
- **Summary matrix (all 74)** and **What the pattern says** — at the end.

---

## Methods

## A. Formats that attract links and shares

### 1. Original research / proprietary data study
**What:** Collect primary data nobody else has; publish the findings as the story.
**Applied here:** Already the site's core asset — nutrition-per-dollar priced from real US retail. *"We priced 400 supermarket foods and ranked every one by grams of protein per dollar"* is a citable primary source, not a rewrite.
**Effort:** L per study (collection dominates; writing is cheap).
**Traffic potential (zero authority):** The study page gets near-zero organic traffic for 6–12 months. Its value is **link fuel** — people cite datasets they can't reproduce. Realistic: 3–15 referring domains per genuinely novel study *if actively pitched*; ~0 if published and left alone. Ahrefs' large-scale crawl found ~90.63% of pages get no Google traffic and only ~2.2% of content earns links from multiple sites — data studies are over-represented in that minority.
**Flag: WORKS** — but only paired with outreach. Publishing a study and walking away is the most common failure mode of this format.
**Sources:** [Ahrefs, "90.63% of Content Gets No Traffic From Google" (2020)](https://ahrefs.com/blog/search-traffic-study/); [Berger & Milkman, *Journal of Marketing Research*, Apr 2012](https://journals.sagepub.com/doi/10.1509/jmr.10.0353).

### 2. The recurring annual index ("The X Index")
**What:** Turn one study into a **named, dated, annual franchise** — the Big Mac Index model. Editions compound.
**Applied here:** *"The Protein-Per-Dollar Index 2026,"* refreshed each January. Year 2 yields "prices rose 8% — here's what got cheaper," a brand-new news story from the same pipeline. Year 3 yields trend charts nobody else can produce.
**Effort:** L for edition 1; M per later edition (pipeline exists).
**Traffic potential:** Low in year 1. The payoff is structural — by edition 3 you own a branded query with zero competition, and each edition is a legitimate fresh press pitch. The Economist's Big Mac Index (running since 1986) is the canonical proof that a consistent index outlives every one-off study.
**Flag: WORKS** — highest-leverage single move available to this site, but it is a multi-year bet.
**Source:** [The Economist, Big Mac Index](https://www.economist.com/big-mac-index) (est. 1986).

### 3. Survey-based original research
**What:** Poll a population; publish the percentages. Endlessly quotable ("62% of Americans say…").
**Applied here:** *"We asked 1,000 Americans what they cut first when groceries get expensive."* Survey stats get cited more readily than price data because they compress to one sentence.
**Effort:** M–L. Cost is the blocker — a US panel of n=500–1,000 via Prolific/Pollfish/CloudResearch runs roughly $300–$1,500 depending on question count.
**Traffic potential:** Strong links-per-dollar *if* budget and a pitch list exist. Zero otherwise.
**Flag: SITUATIONAL** — condition: a paid panel budget ≥$300. Free substitutes (email-list polls, Reddit polls) yield self-selected samples that a competent journalist rejects and an incompetent one cites — a reputational liability for a site whose entire pitch is data integrity. Do not run a web poll and call it "a survey of Americans."

### 4. "We tested X" / hands-on empirical test
**What:** Buy the things, test them, report what happened.
**Applied here:** *"We bought every store-brand black bean can across 6 chains and compared price, protein, and sodium per serving."* Cheap (groceries), photographable, unfakeable, and it generates original imagery for pins and video.
**Effort:** M per test.
**Traffic potential:** Moderate and durable. First-hand testing survives against AI-generated competition because it contains facts that cannot be synthesized from existing pages — the exact edge that both Google's experience signals and AI-answer citation reward. Year one: tens of visits/month per piece, but unusually high email conversion and pin performance.
**Flag: WORKS.**

### 5. Curated mega-list ("the biggest list of X on the internet")
**What:** Obsessively complete resource list.
**Applied here:** *"Every high-fiber food under $1 per day — all 340, sorted."* The CSVs already support this honestly.
**Effort:** S–M (data exists).
**Traffic potential:** Mega-lists were a 2012–2018 link-bait staple and are now heavily devalued by helpful-content updates and AI-generated volume. But a mega-list backed by **your own measured data** is a different object — it's a database wearing a list interface.
**Flag: SITUATIONAL** — condition: generated from proprietary data. Compiled-from-other-websites mega-lists are **DEAD**.

### 6. Ultimate guide / pillar page
**What:** One long comprehensive page on a head term, with cluster articles linking in.
**Applied here:** *"Eating well on $50 a week: the complete guide,"* with the 216 articles funneling into it. (Already backlog task #5.)
**Effort:** L per pillar.
**Traffic potential:** A zero-authority site will **not** rank a pillar on a head term for years. Its real function is internal-link architecture — consolidating topical authority and giving crawlers a hub. Treat it as a structure and conversion asset for 12+ months, not a traffic asset.
**Flag: SITUATIONAL** — condition: the cluster already exists (it does). Building the pillar before the cluster is backwards.
**Sub-claim — "longer content ranks better": MYTH.** Length correlates with rankings because comprehensive pages attract links; word count is not itself a ranking factor. Padding to hit 3,000 words is pure cost.

### 7. Glossary / definitions hub
**What:** Every term in the niche, defined plainly.
**Applied here:** "Complete protein," "PDCAAS," "%DV," "unit price," "shrinkflation," "cost per gram."
**Effort:** M.
**Traffic potential:** Low. Definition queries are among the most cannibalized by AI Overviews — the answer renders without a click. Residual value is internal linking and entity clarity for LLM citation, not sessions.
**Flag: SITUATIONAL** — condition: you value AI citation and internal-link structure over sessions. As a pure traffic play in 2026 it is effectively **DEAD**.

### 8. Comparison pages (X vs Y)
**What:** Head-to-head pages targeting "a vs b" queries.
**Applied here:** Already begun — repo commit `8e0873a` ships 9 comparison articles. *Lentils vs chicken breast: cost per gram of protein.* The query has near-commercial intent, thin competition, and your data settles it with a number nobody else has.
**Effort:** S each, highly templatable from CSVs.
**Traffic potential:** **The best realistic ranking opportunity on this entire list for a zero-authority site.** "X vs Y" long-tails have weak, low-authority competition and unambiguous intent. Expect first wins here before anywhere else. Scalable to 50–150 pages from existing data.
**Flag: WORKS.**
**Caution:** Do not mass-generate thousands of permutations. Thin scaled comparison pages are a recognized spam pattern and the 2024–2025 spam/core updates hit doorway-style scaled content hard. Ship only pairs a human would actually type.

### 9. Statistics roundup page
**What:** "127 grocery inflation statistics for 2026" — a page that exists to be cited by writers on deadline.
**Effort:** S–M.
**Traffic potential:** Highest-ROI link bait of 2015–2022; now saturated and heavily AI-Overview-cannibalized. Generic roundups earn almost nothing. A roundup where **a meaningful share of the statistics are first-party and link to your own datasets** still works, because a writer citing "X% of households…" needs a source URL and prefers a primary one.
**Flag: SITUATIONAL** — condition: original stats included. Pure-compilation stats pages: **DEAD**.

### 10. Public database / searchable directory
**What:** Not an article — a queryable dataset with filter, sort and search, plus one detail page per entity.
**Applied here:** The most defensible asset you could build: a **searchable food-value database** filterable by protein/dollar, fiber/dollar, price, category, store. The 22 CSVs are already the backend; `/embed/[slug]` shows the plumbing exists.
**Effort:** L once, XS ongoing.
**Traffic potential:** Databases capture a large long tail through detail pages and are the format most often linked as "here's a tool for that." This is legitimate programmatic SEO — every page carries unique *measured* data, not spun text. Slow start, but the ceiling is far above any article.
**Flag: WORKS** — conditional on each detail page carrying genuinely unique data (yours would).

### 11. Teardown / investigation / audit
**What:** Take a public claim and check it against evidence. Adversarial, specific, named.
**Applied here:** *"We checked 40 'high-protein' supermarket products against their own labels."* *"Shrinkflation audit: 25 products, same shelf, 2024 vs 2026."* Shrinkflation is a proven media magnet.
**Effort:** M–L.
**Traffic potential:** Highest *press pickup* potential here, because it is a story rather than a resource — and also the highest variance. Most teardowns are ignored; occasional ones go national.
**Flag: WORKS** as link/press bait; **SITUATIONAL** as steady traffic.
**Risk:** Naming brands invites complaint. Restrict to verifiable, photographed, reproducible facts, labelled with store and date observed.

### 12. Interactive map / geographic data viz
**What:** Data cut by state or metro, rendered as a map. Maps get screenshotted and shared at rates plain charts never reach.
**Applied here:** *"The cheapest source of protein in every US state."* Grocery prices vary regionally, and BLS publishes regional price data you could join to your own.
**Effort:** L (regional collection is the hard part).
**Traffic potential:** "By state" is one of the most reliable social/press formats that exists — every state's local media wants a reason to cover their state. 50 states = 50 pickup chances. Strong on Reddit and Pinterest too.
**Flag: WORKS** — condition: you genuinely have regional data. Interpolating state granularity from national averages is the common cheat and it is dishonest.

---

## B. Free tools and products as traffic magnets

### 13. Free calculator as an SEO asset
**What:** A single-purpose interactive tool ranking for "[thing] calculator."
**Why it works:** Calculator queries carry *doing* intent, not *reading* intent. They're hard to satisfy with an article, so a working tool outranks text; and they are among the few query classes an AI Overview cannot fully absorb — the model can explain the formula but can't render your interface with your data behind it.
**Applied here:** Seven already exist (`grocery-budget`, `grocery-unit-price`, `grocery-trip-savings`, `recipe-cost`, `recipe-finder`, `shopping-list-builder`, `fiber-per-dollar`). The gap is that the obvious high-volume queries — **"unit price calculator," "cost per serving calculator," "grocery budget calculator"** — are competitive and your pages are new.
**Effort:** S–M per new tool (Claude Code makes the build near-free); the real cost is the SEO wait.
**Traffic potential:** Realistically 12–24 months to meaningful volume on competitive calculator terms from zero authority. But calculators are the best **link-earning** page type you own — people link to tools without being asked, which is not true of articles.
**Flag: WORKS** — with an honest timeline. Building an 8th calculator before promoting the existing 7 would be a mistake.

### 14. Embeddable widget / iframe with attribution link
**What:** Let other sites embed your calculator or chart; the embed carries a link back.
**Applied here:** `/embed/[slug]` already exists in the codebase, so the infrastructure is built.
**Effort:** S (built) + ongoing outreach.
**Traffic potential:** Two very different things travel under this name:
- **Referral traffic from genuine embeds** — real, small, and clean. A teacher, dietitian or local-news post embedding your chart sends real humans.
- **Widget links as a link-building tactic** — this is explicitly in Google's crosshairs. Google's link-spam policy names *"widget links"* and keyword-rich links auto-inserted across many sites as manipulative, and the October 2025 spam update extended enforcement.
**Flag: SITUATIONAL.** Condition: attribution link is plain, unoptimized (site name, not keyword anchor), the widget is genuinely useful, and you never mass-distribute for the links. Widget-links-at-scale as an SEO tactic: **DEAD/penalized.**
**Sources:** [Google Search spam policies — link spam](https://developers.google.com/search/docs/essentials/spam-policies); [Blue Tree Digital, Google backlink policy 2026](https://bluetree.digital/google-backlink-policy/).

### 15. Generators (useful or silly)
**What:** Input → generated output. Meal plan generators, name generators, "what can I cook with what's in my fridge."
**Applied here:** `recipe-finder` and `shopping-list-builder` are already generators. The strongest untapped one: **"$X a week meal plan generator"** — enter a budget and household size, get a costed week with a shopping list, priced from your own data. Nobody else can cost it accurately.
**Effort:** M.
**Traffic potential:** High ceiling and highly shareable — generators produce a personalized artifact, and personalized artifacts get screenshotted. Also the single best email-capture surface you can build ("email me this plan").
**Flag: WORKS.** Silly generators are separately covered under §64.

### 16. Quizzes and "what your X says about you"
**What:** Multi-question interactive that returns a typed result.
**Applied here:** *"What's your grocery spending personality?"* or, better and more defensible, *"How much are you overpaying for protein?"* — take 6 inputs, return a personal dollar figure benchmarked against your dataset.
**Effort:** M.
**Traffic potential:** Quizzes are a **social/email** format, not a search format — almost no search volume, high share rate on Facebook and Pinterest, high email conversion at the results gate. BuzzFeed built an empire on this; the format is far past its 2014 peak on organic social but still converts warm traffic well.
**Flag: SITUATIONAL** — condition: you already have traffic to feed it. A quiz on a zero-traffic site converts zero people. Do this **after** a traffic source exists, not before.
**Anti-pattern:** Gating the result behind an email before showing anything is the classic version and it now suppresses completion badly. Show the result, then offer the detailed breakdown by email.

### 17. Printables and PDF downloads
**What:** Printable checklists, meal planners, price-comparison sheets, pantry inventories.
**Applied here:** *"Protein-per-dollar cheat sheet — print and stick on the fridge"* is nearly free to produce from existing charts.
**Effort:** XS–S each.
**Traffic potential:** Printables are one of the **highest-performing Pinterest categories that still exists** — "free printable" is a durable, high-intent Pinterest query, and the format survives the platform's shift away from plain article pins. Also the cheapest lead magnet you can ship.
**Flag: WORKS** — specifically as a Pinterest and email-capture play, not as a Google search play.
**Note:** The site's memory records a lead magnet already live with Kit automation verified — printables extend that same machine rather than starting a new one.

### 18. Spreadsheet templates (Google Sheets / Excel)
**What:** A working spreadsheet users copy — grocery budget tracker, meal-cost calculator, pantry inventory.
**Applied here:** A **"grocery budget tracker with real 2026 prices pre-loaded"** Sheet is a differentiated product: every other budget template ships empty; yours ships with a priced food database inside.
**Effort:** S–M.
**Traffic potential:** Modest direct search traffic, but templates are a strong Reddit/forum share (r/personalfinance, r/EatCheapAndHealthy, r/MealPrepSunday) because they're a gift rather than a link. "Copy to your Drive" links also spread person-to-person invisibly.
**Flag: WORKS** — for referral and email, not for search.

### 19. Notion templates
**What:** Publish in the Notion template gallery / marketplace.
**Applied here:** A meal-planning + grocery-budget Notion system.
**Effort:** M.
**Traffic potential:** Real but audience-mismatched. Notion's user base skews toward tech, productivity and student audiences; your audience is US budget-grocery shoppers, who overwhelmingly do not use Notion. Template gallery placement drives installs, not site sessions.
**Flag: SITUATIONAL** — condition: your ICP uses Notion. For this site, probably a poor fit. **Skip unless data says otherwise.**

### 20. Figma Community files
**What:** Publish design resources to Figma Community for backlinks and profile traffic.
**Traffic potential:** Near-zero relevance. Figma Community is a designer channel; a budget-food data site has nothing designers want, and manufacturing something just to be there is textbook link chasing.
**Flag: MYTH** for this site (it genuinely works for design/SaaS sites — it is simply not transferable here).

### 21. Chrome extension + Chrome Web Store as a discovery channel
**What:** Ship a small browser extension; the Web Store's own search becomes a discovery surface independent of Google web search.
**Applied here:** A plausible one exists — **a price-per-nutrient overlay for online grocery shopping** (Walmart/Instacart/Kroger), showing protein-per-dollar next to each item using your dataset.
**Effort:** L–XL. Manifest V3 is now mandatory (MV2 fully dead in Chrome as of mid-2026), grocery-site DOM scraping breaks constantly, and store review adds friction. For a solo non-coder operator this is a serious maintenance liability.
**Traffic potential:** The Web Store is a genuinely separate discovery pool with far less competition than Google — that part is real. But extension → website traffic is weak; users install and never visit. Better framed as a **retention/brand** product than a traffic product.
**Flag: SITUATIONAL** — condition: you can sustain ongoing maintenance against third-party site changes. Otherwise it becomes a broken product with your name on it.
**Source:** [Chrome MV2 deprecation timeline](https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline).

### 22. Custom GPT in the OpenAI GPT Store
**What:** Publish a GPT ("Budget Protein Coach") that uses your data and links back.
**Effort:** XS–S. Genuinely cheap.
**Traffic potential:** **Low, and widely oversold.** GPT Store discovery is weak, most published GPTs get negligible use, and click-through from a GPT conversation to a website is minimal. For calibration: AI referral traffic overall is growing fast (ChatGPT ~87–92% of AI referrals, up several hundred percent YoY) but still totals roughly **~1% of web traffic**, and for publishers it remains under 1% of referral pageviews. A single custom GPT is a rounding error inside that 1%.
**Flag: SITUATIONAL** — condition: treat it as a 1-hour experiment and brand-presence flag, not a channel. Anyone selling "GPT Store is the new App Store gold rush" is selling **MYTH**.
**Sources:** [Digiday, state of AI referral traffic 2025](https://digiday.com/media/in-graphic-detail-the-state-of-ai-referral-traffic-in-2025/); [Previsible, AI traffic report Jul 2026](https://previsible.com/seo-strategy/ai-traffic-report-july-2026/).

### 23. Mobile app
**What:** Native iOS/Android app.
**Effort:** XL.
**Traffic potential:** As a *website* traffic source: essentially none. App stores are their own economy; apps do not feed web sessions. App Store Optimization is a full second discipline.
**Flag: MYTH** as a traffic method for a content site with one operator. Correct only if the app itself becomes the product and the site becomes marketing for it — a different business.

### 24. Checklists and cheat sheets (on-page, not gated)
**What:** Dense, screenshot-friendly one-screen reference blocks inside articles.
**Applied here:** "The 12 cheapest complete-protein pairings, one screen." Costs nothing; you have the data.
**Effort:** XS.
**Traffic potential:** No direct traffic, but a strong *multiplier*: screenshot-friendly blocks are what get pasted into Reddit comments, group chats and Pinterest. This is the cheapest thing on this entire list per unit of benefit.
**Flag: WORKS** as an amplifier of other methods.

### 25. Live dashboard
**What:** A page that updates — current prices, current best value, tracked over time.
**Applied here:** `/dashboard` already exists in the repo. A **"cheapest protein right now"** live board with a visible last-updated timestamp is a reason for people to return, and a reason for a journalist to bookmark you as a source.
**Effort:** M–L to build, XS–S ongoing if the pipeline feeds it.
**Traffic potential:** Low search traffic; high *repeat-visit and citation* value. Dashboards become press infrastructure — the thing reporters check when grocery prices are in the news (see §33).
**Flag: SITUATIONAL** — condition: it actually stays current. A stale dashboard with an old timestamp is worse than no dashboard; it visibly advertises abandonment.

### 26. Dataset distribution (Kaggle, data.world, Hugging Face, Zenodo/DOI)
**What:** Publish the CSVs where data people look for data, with attribution back to the site.
**Applied here:** 22 clean, documented CSVs are already public. Publishing them to Kaggle Datasets and data.world costs an afternoon.
**Effort:** S.
**Traffic potential:** Small but unusually high-quality: data scientists, students and journalists who build on a dataset **cite it**, and those citations come from .edu, notebook and news domains that are otherwise unreachable for a food blog. A Zenodo deposit gets a DOI, which makes academic citation possible at all.
**Flag: WORKS** — modest volume, exceptional link quality per hour spent. One of the most under-exploited assets this specific site has.
**Note:** The repo shows a Frictionless datapackage + CC BY licensing was built and then reverted (commits `f443e10`, `207442c`). Whatever the reason for that reversal, **some** explicit license is a precondition for this method — nobody builds on data with unclear terms.

### 27. Public API / open data endpoint
**What:** Expose the dataset as a documented JSON API.
**Applied here:** Cloudflare Pages Functions + D1 are already in the stack, so the marginal cost is low.
**Effort:** M.
**Traffic potential:** Very low direct traffic. Value is developer goodwill, a Product Hunt/Hacker News angle, and inbound links from projects that consume it.
**Flag: SITUATIONAL** — condition: you want developer-audience links specifically. Otherwise a distraction from things that reach shoppers.

---

## C. Newsjacking and timing

### 28. Seasonal content calendar (publish 60–90 days early)
**What:** Map recurring demand spikes and publish well before them so pages are indexed and aged when the spike lands.
**Applied here:** January (diet/budget reset), back-to-school lunches (Aug), Thanksgiving cost-per-plate (Oct–Nov), summer grilling on a budget (May), tax-refund season.
**Effort:** S to plan, M ongoing.
**Traffic potential:** This is the mechanism that converts a zero-authority site's *only* real advantage — patience — into rankings. A new page published two weeks before Thanksgiving loses to a page published in September that has had time to be crawled, linked and gather engagement. Pinterest amplifies this further: Pinterest's own guidance is to publish seasonal content ~45 days ahead because saves accumulate before the search peak.
**Flag: WORKS** — and it is nearly free. The most under-used discipline for small sites.

### 29. Holiday, event and "national day" content
**What:** Content pegged to a fixed calendar date.
**Applied here:** Thanksgiving dinner cost per person (you can compute it credibly from your own data — the American Farm Bureau's annual Thanksgiving dinner cost survey gets national press every single November; a budget-optimized counterpart is a real angle), Super Bowl snack cost, Easter ham vs alternatives.
**Effort:** S–M each.
**Traffic potential:** Genuinely spiky and genuinely reachable, because holiday long-tails ("cheapest thanksgiving dinner for 8") have less entrenched competition than evergreen head terms. **National Cheese Day**-type micro-holidays are a different matter: near-zero search demand, and the "post about national X day" advice is recycled social-media filler.
**Flag: WORKS** for major holidays; **MYTH** for obscure national-food-days as a traffic tactic.

### 30. Trend-riding (Google Trends, Exploding Topics, TikTok trends)
**What:** Spot a rising query before it saturates; publish while competition is thin.
**How to actually do it:** Google Trends "Trending Now" refreshes roughly every 10 minutes; queries flagged **Breakout** (>5,000% growth) are the signal worth acting on because competition hasn't formed yet. Exploding Topics and Glimpse do the same job with a longer lead time.
**Applied here:** Food trends move fast and reach your niche constantly — "cottage cheese everything," "fibermaxxing," "protein coffee," the recurring "girl dinner"-style formats. Your differentiator on any of them is the same and it is strong: **what does this trend actually cost per gram of protein/fiber?** Nobody else answers that.
**Effort:** S per piece; XL as a habit.
**Traffic potential:** Good for a zero-authority site *specifically* because thin competition is the whole point — you are not fighting entrenched authority when the topic is 3 weeks old. The catch is that trend traffic is a spike, not an annuity.
**Flag: WORKS** — condition: speed. A trend piece published two weeks late is worthless.
**Source:** [Google Trends — Trending Now](https://trends.google.com/trending).

### 31. Reactive newsjacking on breaking news
**What:** Publish within hours of a news event that touches your niche.
**Applied here:** USDA Food Price Outlook releases, BLS CPI food-at-home prints (monthly), tariff announcements affecting food, recalls, SNAP/benefit policy changes.
**Effort:** S per event, but requires monitoring.
**Traffic potential:** Two-sided. In classic **web search**, newsjacking has decayed badly — Google's Top Stories heavily favors established news publishers, and a food blog will not outrank Reuters on a CPI print. In **Google Discover**, freshness is weighted far more heavily than in Search and content published within hours can outperform older, more authoritative pieces — but Discover eligibility itself is the gate, and a zero-traffic site typically has none.
**Flag: SITUATIONAL** — condition: you have Discover eligibility (consistent publishing, news-ish content, mobile-fast pages) OR you're newsjacking on **social/Reddit** rather than search. Newsjacking a CPI release for Google web rankings: **DEAD** for a site this size.
**Source:** [Search Engine Land, What is Google Discover](https://searchengineland.com/guide/what-is-google-discover).

### 32. Price-shock moment hijacking (the strongest timing play here)
**What:** When a food price becomes a national story, be the site holding the numbers.
**Applied here — with current, checkable facts:** USDA ERS projects **food-at-home prices up ~2.4–2.5% in 2026**, with **beef and veal up ~5.5%** and **sugar and sweets up ~6.7%**, while **eggs are forecast to fall ~27–31%**. That is two live stories you can own right now: *"beef is the 2026 price shock — here is what to eat instead, costed"* and *"eggs are cheap again — eggs vs everything, protein per dollar"* (you already have `eggs-vs-everything-protein-value-2026.csv`).
**Effort:** S per moment; the data already exists.
**Traffic potential:** The best press-and-Reddit angle available to this site, because a price shock creates demand for exactly the analysis you already produce. Egg prices in 2022–2025 generated enormous consumer-search volume; the 2026 reversal is a fresh, under-covered angle.
**Flag: WORKS** — condition: react within days, not weeks, and lead with the number.
**Sources:** [USDA ERS Food Price Outlook](https://www.ers.usda.gov/data-products/food-price-outlook/summary-findings); [Grocery Dive, 2026 grocery price forecast](https://www.grocerydive.com/news/food-at-home-prices-increase-2026-usda/813359/); [RFD-TV, USDA projects 3.1% rise in 2026](https://www.rfdtv.com/usda-food-price-outlook-forecasts-3-point-1-percent-rise-in-2026-beef-eggs-grocery-trends).

### 33. Awareness months and observances
**What:** National Nutrition Month (March), Heart Month (Feb), Hunger Action Month (Sept).
**Applied here:** Hunger Action Month is the one with real substance for this site — food insecurity and cheap nutrition are the same subject, and it opens doors to nonprofit and food-bank outreach that a commercial pitch never would.
**Effort:** S–M.
**Traffic potential:** Low search demand directly. The value is **relationship and link access**, not sessions — organizations publish resource roundups during their awareness month and are unusually receptive then.
**Flag: SITUATIONAL** — condition: you use it as an outreach window, not as a keyword play.

### 34. New Year / January diet season
**What:** The largest predictable demand spike in the entire food-content year.
**Applied here:** January combines *both* of the site's themes — people simultaneously resolve to eat better and to spend less, and "cheap healthy eating" sits exactly at that intersection. Also the strongest lead-magnet month.
**Effort:** M, concentrated in Oct–Nov for a January payoff.
**Traffic potential:** The single highest-volume window you get. Competition is fierce on head terms, but the *combined* intent (healthy **and** cheap) is much less contested than either alone, and it's your natural position.
**Flag: WORKS** — condition: shipped by early November. Publishing January content in January is publishing it too late.

---

## D. Psychological drivers of sharing

### 35. High-arousal emotion (the core virality finding)
**What:** Berger & Milkman analysed ~7,000 New York Times articles over three months and found virality is driven by **physiological arousal**: content evoking high-arousal emotions — **awe, anger, anxiety** — is more viral, while **low-arousal emotions (sadness) suppress sharing**. Positive content is more viral than negative overall, but valence alone doesn't explain it. Crucially, these effects hold *even after controlling for* how surprising, interesting or practically useful the content is.
**Applied here:** "Groceries are expensive" is low-arousal and shares poorly. "**You are paying 11× more per gram of protein than you need to**" is anger/anxiety plus surprise, and it is true of your data. Awe angle: the sheer scale of a 400-food ranking.
**Effort:** XS — it's a framing decision, not extra work.
**Traffic potential:** A multiplier on every other method here, not a method itself. It costs nothing and it is the single best-evidenced thing in this document.
**Flag: WORKS** — the most replicated result in the sharing literature.
**Source:** [Berger & Milkman, "What Makes Online Content Viral?", *JMR* 49(2), Apr 2012](https://journals.sagepub.com/doi/10.1509/jmr.10.0353).

### 36. Practical value / "useful" sharing (STEPPS)
**What:** Berger's STEPPS framework — **S**ocial currency, **T**riggers, **E**motion, **P**ublic, **P**ractical value, **S**tories. Practical value is the plainest: people share things that help others.
**Applied here:** This is the site's native strength and its natural sharing engine. "Here's the actual cheapest way to hit 100g of protein a day" gets forwarded in family group chats because forwarding it is a favour.
**Effort:** XS (framing).
**Traffic potential:** Steady, unspectacular, compounding. Practical-value sharing is dark-social (DMs, WhatsApp, email) and mostly invisible in analytics, which means it is chronically under-credited and therefore chronically under-invested in.
**Flag: WORKS.**
**Source:** [Knowledge at Wharton, "Contagious: Jonah Berger on Why Things Catch On"](https://knowledge.wharton.upenn.edu/article/contagious-jonah-berger-on-why-things-catch-on/).

### 37. Social currency — make the sharer look smart
**What:** People share what makes *them* look good. The share is about the sharer, not about you.
**Applied here:** Give readers a fact that wins an argument. "Cottage cheese beats Greek yogurt on protein per dollar by 40%" is ammunition. Nobody shares your article; they share the fact and the article comes along.
**Effort:** XS — one extractable, quotable, screenshot-able number per piece.
**Traffic potential:** High leverage, near-zero cost. Directly compatible with the cheat-sheet format (§24).
**Flag: WORKS.**

### 38. Triggers — attach content to a recurring cue
**What:** Things get shared when the environment reminds people of them. Berger's example: Friday reminds people of "Friday" the song.
**Applied here:** Grocery shopping is a **weekly ritual** — one of the strongest natural triggers available in any consumer niche. Content framed around "before you shop this week" attaches to a cue that fires 52 times a year per person. This is also the underlying argument for a weekly recurring feature (§57).
**Effort:** XS–S.
**Traffic potential:** Underrated. Trigger-attachment is what converts one-time readers into a habit, which for a zero-traffic site matters more than any single spike.
**Flag: WORKS.**

### 39. Surprising numbers as the hook
**What:** Lead with a specific, counterintuitive figure.
**Applied here:** Your memory file records "flour #1 at 78g/$" from the audited data study — that is exactly the shape of a hook: cheap, surprising, checkable, specific. Bad version: "flour is a great value." Good version: "**$1 of flour buys 78g of protein. $1 of chicken breast buys 21g.**"
**Effort:** XS.
**Traffic potential:** Highest per-second-of-effort item in this report.
**Flag: WORKS** — with a hard condition documented in this project's own history: **verify every number against the source CSV at delivery time.** The project's `feedback_verify_numbers_in_copy` lesson exists because a wrong ratio shipped in a Reddit launch title on 2026-07-13. On a site whose entire differentiation is data integrity, one wrong headline number costs more than the traffic it buys.

### 40. Contrarian takes and manufactured controversy
**What:** Argue against consensus to provoke response.
**Applied here:** *"Organic produce is a bad deal for people on a budget, and here's the math."* *"Protein powder is the worst protein value in the store."* Defensible with data, and genuinely disagreeable.
**Effort:** S.
**Traffic potential:** High variance. Anger is a high-arousal sharing emotion (§35), so contrarianism does travel — especially on Reddit. But **manufactured** contrarianism (taking a position you can't defend, purely for reaction) is now well-recognised by audiences and reliably converts into a credibility loss.
**Flag: SITUATIONAL** — condition: the contrarian position must be one your own data actually supports. Contrarianism without data behind it is **MYTH** as a strategy and a liability for this site specifically.
**Extra risk here:** This project's history includes a Reddit ban (ECAH, 2026-07-13) mid-viral-post. Deliberately provocative content on Reddit is exactly what triggers moderator action. Do not combine §40 with Reddit distribution casually.

### 41. Myth-busting
**What:** Take a widely-believed claim and disprove it.
**Applied here:** "Eating healthy is expensive" is the biggest myth in your niche, it is directly falsifiable with your own dataset, and disproving it is the site's whole thesis. Others: "canned beans are as cheap as dry" (you have `canned-vs-dry-beans-cost-2026.csv` — settle it), "you need meat for complete protein" (you have `cheapest-complete-protein-pairs-2026.csv`).
**Effort:** S–M.
**Traffic potential:** Strong. Myth-busting combines surprise + practical value + a little anger, hits the "actually…" reflex that drives comment engagement, and myth queries have real search volume ("is X really…").
**Flag: WORKS** — and it's the format best matched to the assets already sitting in `public/data/`.

### 42. Identity-affirming content
**What:** Content that lets a reader signal who they are.
**Applied here:** "Frugal person who's good with money," "person who feeds a family well on little," "person who isn't fooled by food marketing." Sharing your ranking says *I am the kind of person who optimises this.*
**Effort:** XS (voice and framing).
**Traffic potential:** Moderate; primarily a social/community multiplier. It's the reason budget-cooking subreddits and Facebook groups exist at all.
**Flag: WORKS** — as a framing layer.
**Caution:** The failure mode is condescension. Content that implies "poor people shop badly" reads as class contempt and gets you removed from exactly the communities you need.

### 43. The curiosity gap
**What:** Withhold the payoff to force the click. The Upworthy formula.
**Evidence:** A meta-analysis of **8,977 headline experiments** found headline concreteness has a non-monotonic effect: too vague *and* too concrete both reduce clickthrough — there's an optimum in the middle. Separately, audiences increasingly recognise the tactic, and under the Persuasion Knowledge Model that recognition generates mistrust and defiance that impedes virality. Facebook algorithmically suppressed curiosity-gap headlines, which ended the format's peak era.
**Applied here:** "This one food will change your grocery bill" is the dead version. "**The $1 food with more protein than chicken**" keeps the gap but pays out concretely — that's the surviving version.
**Flag: SITUATIONAL.** Pure curiosity gap (payoff fully withheld): **DEAD** — platform-suppressed and audience-inoculated. Partial gap with a concrete anchor: **WORKS**.
**Sources:** [Scientific Reports, "When curiosity gaps backfire" (Dec 2024)](https://www.nature.com/articles/s41598-024-81575-9); [Did clickbait crack the code on virality? (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8799425/).

### 44. Before / after
**What:** Visual or numeric transformation.
**Applied here:** "$180 grocery cart vs $94 cart, same nutrition" — photograph both, show the receipt, show the nutrition math. Concrete, visual, and it's your thesis in one image.
**Effort:** M (requires actually doing it).
**Traffic potential:** Strongest visual format for Pinterest and short-form video in this niche, because the payoff is legible in under a second with no text.
**Flag: WORKS.**

---

## E. Format mechanics (how the thing is built)

### 45. Headline formulas
**What:** Repeatable title patterns — number + noun + benefit; "X vs Y"; "We tested N…"; "The cheapest…"; "What $1 buys."
**Applied here:** Your best-performing pattern is almost certainly **number-first, dollar-anchored**: "$1 of oats vs $1 of chicken." The dollar sign is a visual stop and the comparison is instantly legible.
**Effort:** XS.
**Traffic potential:** Formulas don't create demand; they change CTR on demand that already exists — which for a zero-authority site means they matter mostly on Pinterest and Reddit, where the title *is* the product, and very little in Google where you have no impressions to convert yet.
**Flag: WORKS** — with the caveat that the meta-analysis in §43 shows the optimum is context-dependent: match the concreteness of the competing titles in the feed, don't maximise or minimise it blindly.

### 46. The hook / first three seconds (video)
**Evidence:** TikTok for Business reports **71% of users decide within the first three seconds** whether to keep watching; creatives delivering the core message in those three seconds have been reported to gain ~60% more total retention. Completion rates fall sharply with length — roughly 92% for <15s, 84% for 16–30s, 68% for 31–60s (platform-reported figures; treat exact percentages as vendor-marketing-grade, directionally reliable).
**Applied here:** Your Remotion kinetic-video pipeline should open on the **number**, not on branding, not on a title card, not on "hey guys." Frame 1: "$1 of flour = 78g protein." Everything else follows.
**Effort:** XS once the template is set.
**Traffic potential:** The single highest-leverage variable in short-form video. Also the most common thing solo creators get wrong by spending the opening on identity instead of payload.
**Flag: WORKS.**
**Sources:** [TikTok hook retention data compiled, 2025](https://plangphalla.com/the-first-3-seconds-that-decide-hook-science-for-reels-shorts-in-2025/) — *vendor/secondary sources; primary TikTok for Business figures not independently verified.* **Marked unverified.**

### 47. Thumbnail and pin design
**What:** The image is the click decision on Pinterest, YouTube and Discover.
**Applied here:** For a data site the winning pin is **the chart itself with a huge readable number**, not a stock photo of vegetables. Vertical 2:3, text legible at thumbnail size, one idea per pin.
**Effort:** XS–S per asset (pipeline exists).
**Traffic potential:** On Pinterest, design quality is the dominant controllable variable. Note the site's own history: the memory file records a **Pinterest suppression diagnosis (2026-07-26)** — zero impressions traced to cloaked-redirect spam on the same account plus a domain-claim linking trap. **No amount of pin design fixes an account-level suppression.** Resolve the account issue before investing further in pin creative.
**Flag: SITUATIONAL** — condition: the Pinterest account is not suppressed.

### 48. Skimmable structure, jump links and table of contents
**What:** Headings, short paragraphs, an anchor-linked TOC.
**Applied here:** Long data articles are unreadable without it, and jump links occasionally surface as sitelinks in SERPs.
**Effort:** XS (template-level, once).
**Traffic potential:** Not a traffic source. It's an engagement-and-retention hygiene factor. The "Google gives you sitelinks for a TOC" version is overstated — sitelinks are algorithmic and mostly reserved for pages that already rank.
**Flag: WORKS** as hygiene; **MYTH** as a ranking tactic.

### 49. FAQ blocks and structured data
**What:** Q&A sections with FAQPage schema.
**Reality check:** Google **removed FAQ rich results for most sites in August 2023**, restricting them to well-known government and health sites. The SERP-real-estate reason for FAQ blocks is gone.
**Applied here:** Keep FAQ sections where readers genuinely have questions — they're now useful mainly as **quotable, extractable answer blocks for AI answer engines**, which is a real but unmeasurable benefit.
**Flag: DEAD** as a rich-result play; **SITUATIONAL** as an AI-citation play.

### 50. Comparison tables
**What:** Side-by-side tables with the winner marked.
**Applied here:** Your native output format. A table with sortable columns and a clear "best value" flag is the highest-utility on-page element you can ship, and tables are disproportionately quoted by AI answer engines because they're trivially parseable.
**Effort:** XS from CSVs.
**Flag: WORKS.**

### 51. Original imagery vs stock
**What:** Photographs you took, charts you made, vs licensed stock.
**Applied here:** 31 original charts is a genuine moat — nobody else has them, they're unfakeable, and they carry your URL when screenshotted. Original *photography* (the actual receipt, the actual cart, the actual can of beans) is worth more still, because it proves the work happened.
**Effort:** S ongoing.
**Traffic potential:** Not a direct traffic source, but original imagery is what makes a page linkable, screenshot-able and Pinterest-viable, and it is one of the few remaining hard signals of first-hand experience.
**Flag: WORKS.**
**Tip:** Watermark charts with the bare domain. A screenshot that travels without attribution is a wasted asset; a screenshot with a legible domain is free advertising and occasionally converts into a link when someone goes looking for the source.

---

## F. Repurposing systems

### 52. One asset, many formats (atomisation)
**What:** Build one substantial thing, then cut it into a dozen distribution-shaped pieces.
**Applied here:** One dataset → article → 31 charts → 4 pins per chart → kinetic short → carousel → newsletter → Reddit comment → cheat sheet PDF. The infrastructure for most of this already exists in the repo.
**Effort:** M to design the system once; XS per output afterwards.
**Traffic potential:** This is the only realistic way one operator competes on volume. It doesn't create demand — it harvests more of the demand each asset can reach.
**Flag: WORKS.**

### 53. Data → chart → pin → short (the site's specific pipeline)
**What:** The atomisation chain instantiated for this exact site.
**Applied here:** CSV → chart PNG → 4 pin variants (`public/images/pins/{slug}_v{1-4}.jpg` already the convention) → Remotion kinetic short → YouTube Short/Reel/TikTok. Already mostly built per the project's pipeline docs.
**Effort:** Already invested; marginal cost per dataset is low.
**Traffic potential:** The highest-ROI existing machinery on the site. The bottleneck is not production, it is that **Pinterest is currently suppressed** and short-form distribution is unproven. Fix distribution before adding production capacity.
**Flag: SITUATIONAL** — condition: at least one distribution endpoint is actually working.

### 54. Article → video
**What:** Turn a written piece into a short.
**Applied here:** The `kinetic-video` skill exists for exactly this. Data articles convert unusually well because the payload is numbers, and kinetic typography renders numbers better than talking-head video does — no camera, no face, no studio.
**Effort:** S per video with the pipeline.
**Traffic potential:** Honest assessment: short-form video for a data/budget-food account is a **slow, low-conversion** channel — views rarely convert to site sessions (platforms suppress outbound links), and the topic is not natively entertaining. Treat it as brand/reach, not traffic. The 15-second completion-rate data (§46) implies your videos should be much shorter than feels natural.
**Flag: SITUATIONAL** — condition: you accept it as a top-of-funnel brand channel and measure it as such, not as a traffic channel.

### 55. Transcript → article
**What:** Turn spoken content (podcast, video, interview) into written pages.
**Applied here:** Weak fit — you don't produce spoken content, and generating it purely to transcribe it is a net cost. The inverse (article→video) is the right direction for this site.
**Flag: SITUATIONAL** — condition: you start a podcast or interview series. Otherwise **not applicable**.

### 56. Evergreen recycling (re-posting the same asset over time)
**What:** Re-share the same pin/post/thread on a schedule.
**Applied here:** Pinterest is the classic venue for this, and the project already runs a scheduled auto-poster at 1–2 pins/day.
**Traffic potential:** Real on Pinterest, where content has a long half-life and re-pinning of *fresh variants* is normal. Near-worthless on Twitter/Facebook where feeds are recency-locked.
**Flag: SITUATIONAL** — condition: platform has a long content half-life. **Important:** Pinterest's own guidance has for years discouraged posting duplicate pins to the same URL; the safe version is *new creative pointing at the same URL*, not the identical image re-uploaded. Naïve identical re-posting is a known spam signal.

### 57. Content refresh and re-dating
**What:** Update an old page and update its date.
**The legitimate version:** Substantially improve the page — new data, new year's prices, new sections — and surface a **"last updated"** date distinct from the original publish date. Refreshing genuinely stale price data is unusually justified on this site, because 2024 grocery prices are *actually wrong* now.
**The illegitimate version:** Bulk-changing publish dates without changing content. Widely reported to cause ranking loss; Google knows when a URL was discovered and when the content actually changed.
**Effort:** S per article, and it should be systematic — 216 articles with dated price claims is a real liability.
**Traffic potential:** Refreshing is generally the highest-ROI SEO work available to a site with existing content, because the pages already have history. For a site with near-zero traffic the effect is muted, but the **accuracy** argument stands on its own.
**Flag: WORKS** (genuine refresh) / **MYTH and harmful** (date-only changes).
**Sources:** [Search Engine Journal, "How Risky Is It REALLY to Change Your Article Dates for SEO?"](https://www.searchenginejournal.com/change-article-dates-seo/381114/); [Search Engine Land on content dates](https://searchengineland.com/seo-update-content-dates-insert-year-here-393463). **Unverified:** a circulating claim of a "97.3% penalty rate from the Google Spam Team (2024)" appears only on low-quality SEO blogs with no primary source — **treat as fabricated.**

### 58. Translation into other languages
**What:** Republish content in Spanish, etc.
**Applied here:** US Spanish-language budget-food content is a genuinely under-served market with far less competition than English. But: your data is US-price-specific (which transfers fine to US Hispanic audiences), your brand voice is English-native, and machine-translated content at scale is squarely inside Google's scaled-content-abuse policy unless it's genuinely reviewed.
**Effort:** L (real localisation) / S (machine translation — not recommended).
**Traffic potential:** Real upside, high execution risk for a solo operator who doesn't speak the language.
**Flag: SITUATIONAL** — condition: human review of every translated page. Bulk machine translation for traffic: **DEAD/penalised** under the March 2024 scaled content abuse policy.

---

## G. Series, habit and franchise mechanics

### 59. Recurring weekly feature
**What:** Same format, same day, every week.
**Applied here:** *"This week's cheapest protein"* published every Monday before the weekly shop — which attaches directly to the strongest natural trigger in the niche (§38).
**Effort:** S/week if pipeline-fed, and it must be genuinely sustainable — a solo operator abandoning a weekly feature is visible and damaging.
**Traffic potential:** Not a search play. It's a **return-visit and email-retention** play, and it manufactures the consistent publishing cadence that Discover eligibility and topical authority both reward.
**Flag: WORKS** — condition: automate the data half or it dies by week 8.

### 60. Numbered series
**What:** "Cheap Protein #14." Sequence creates completionist pull and makes each entry cheap to conceive.
**Applied here:** Removes the blank-page problem, which is the real constraint for one operator.
**Effort:** XS marginal per entry.
**Traffic potential:** Low individually; the benefit is throughput and internal linking. Numbering itself has no SEO value and slightly hurts individual-page titles (the number displaces keywords).
**Flag: SITUATIONAL** — condition: number the *series brand*, keep the *page title* keyword-shaped.

### 61. Annual editions
**What:** The same study re-run each year, dated. (The production mechanic behind §2.)
**Applied here:** "2026 edition" pages accumulate links across years; a "2027 edition" can inherit the URL or use a fresh one plus a canonical hub.
**Flag: WORKS.**
**Practical note:** Prefer **one evergreen URL** (`/protein-per-dollar-index/`) that is updated annually, plus dated archive URLs for prior years. Minting a brand-new URL each year fragments accumulated links — a very common and expensive mistake.

### 62. Challenges people join
**What:** A time-boxed, participatory commitment. "The $50 Week Challenge."
**Applied here:** Strong thematic fit and a natural January launch (§34). Participation creates user-generated content, community, and email signups.
**Effort:** M–L (needs email sequence, community surface, and daily content).
**Traffic potential:** **Requires an existing audience to seed it.** A challenge launched to zero people is a public failure. This is the clearest example in this report of a method that is excellent *later* and actively harmful *now*.
**Flag: SITUATIONAL** — condition: an email list of at least a few hundred engaged subscribers.

### 63. Named methodology / branded concept
**What:** Give your approach a name so people can refer to it. "The Protein-Per-Dollar Method." "The 78-Gram Rule."
**Applied here:** The site already has `/methodology` — naming it turns a page into a citable concept. Branded terms are also the cleanest way to earn navigational searches, which are the only queries a zero-authority site can win immediately.
**Effort:** XS.
**Traffic potential:** Small but uniquely uncontested. Nobody competes with you for your own coined term.
**Flag: WORKS** — condition: the name must be simple enough to say out loud and remember.

---

## H. Weird, gimmicky, and things that demonstrably worked anyway

### 64. The personalised-result viral calculator
**What:** A calculator that returns *your* number, not *a* number. Personalisation is what makes a tool shareable rather than merely useful.
**Documented case:** Vox's tax-plan calculator with the Tax Policy Center (2016 US election) reportedly drew **~503,000 shares and 200+ linking sites**, because it took under a minute and produced a personal dollar figure. *(Secondary source — [Outgrow](https://outgrow.co/blog/top-viral-calculators); figures not independently verified. Marked unverified.)*
**Applied here:** *"How much are you overpaying for protein?"* — enter what you usually buy, get a personal annual overspend figure, benchmarked against your dataset. That number is inherently shareable because it's about the sharer (§37) and mildly infuriating (§35).
**Effort:** M.
**Traffic potential:** The highest-ceiling single build available to this site. Also high-variance — most such tools do nothing.
**Flag: WORKS** — condition: personal output, under 60 seconds, one screen.

### 65. Controversial rankings and tier lists
**What:** Rank things people have feelings about, and let them fight about it.
**Applied here:** *"Every supermarket protein, ranked by value — S tier to F tier."* Tier-list visual language is instantly legible to anyone under 40 and is native to Reddit and short-form video.
**Effort:** S.
**Traffic potential:** Good engagement, good comment volume, moderate traffic. Grounding an inflammatory format in real data is the differentiator: you get the fight *and* the credibility.
**Flag: WORKS** — same Reddit-ban caution as §40 applies.

### 66. "What your X says about you"
**What:** The BuzzFeed identity format.
**Applied here:** *"What your grocery receipt says about you."* Could be genuinely funny and genuinely data-informed.
**Traffic potential:** Format is far past its 2014–2016 peak; organic reach for identity quizzes on Facebook collapsed when the algorithm de-prioritised them, and the supply is enormous. On a data-credibility site it also risks reading as unserious.
**Flag: DEAD** as a standalone traffic strategy; **SITUATIONAL** as an occasional light-touch social post if the brand can carry it.

### 67. Data visualisations built for r/dataisbeautiful
**What:** Post original charts to a 22M-member subreddit that exists specifically to consume them.
**Applied here:** 31 original charts, from original data, is exactly what that subreddit wants — and OC posts are explicitly permitted and **required** to state data source and tool.
**Effort:** XS per post (assets exist).
**Traffic potential:** A front-page r/dataisbeautiful post can send five figures of traffic in a day. Most posts send almost nothing. It is a lottery with a very cheap ticket and you already own the tickets.
**Flag: WORKS** — hard conditions: (a) mark **[OC]**, state data source and tool, per subreddit rules; (b) **plain, non-sensationalised titles** are required — the format that works elsewhere is against the rules here; (c) the chart must stand alone without a click. Given this project's 2026-07-13 Reddit ban history, read each subreddit's self-promotion rules before posting and build comment karma first.
**Source:** [r/dataisbeautiful rules & OC requirements](https://en.wikipedia.org/wiki/R/dataisbeautiful).

### 68. Silly generators
**What:** A pointless-but-fun generator whose only job is to be shared.
**Applied here:** *"What can I make with $5 and whatever's in my fridge?"* is the fun-shaped version of a genuinely useful tool.
**Traffic potential:** Silly generators occasionally explode, usually don't, and rarely convert. The version worth building is the one that's **fun AND useful** — pure novelty generators have no second act and attract an audience that never returns.
**Flag: SITUATIONAL** — condition: it survives being useful after the joke wears off.

### 69. April Fools / fake product
**What:** A joke product or announcement.
**Traffic potential:** Works for brands with existing audiences and existing goodwill; falls completely flat with no audience, because a joke needs someone who already knows the setup. Also actively corrosive for a site whose value proposition is "our numbers are true."
**Flag: MYTH** for this site.

### 70. Getting cited on Wikipedia
**What:** Your dataset becomes a citation on a relevant Wikipedia article.
**Applied here:** Nutrition-cost and food-price articles do cite datasets. This is unusually plausible for you *because you produce primary data* — the one thing Wikipedia's sourcing norms favour and that ordinary food blogs cannot offer.
**Effort:** S–M, plus patience.
**Traffic potential:** The link is nofollow and sends little direct traffic. Its value is second-order: Wikipedia citations get copied into other sources, and LLMs weight Wikipedia heavily, so a citation there propagates into AI answers.
**Flag: SITUATIONAL** — condition: **never edit Wikipedia to add your own link.** Self-citation is against policy, gets reverted, and can get a domain blacklisted. The legitimate route is a Zenodo-deposited, DOI'd, licensed dataset (§26) that an independent editor chooses to cite.

### 71. Journalist-request platforms (HARO and successors)
**What:** Answer reporter queries; earn a quote and a link.
**Status as of 2026:** HARO/Connectively was **shut down by Cision on 9 December 2024**. Featured.com acquired the HARO brand and relaunched it as a **paid** platform in April 2025, with widespread complaints of AI-generated response flooding. The nearest free equivalent is **Source of Sources**, started by HARO's original founder Peter Shankman. Qwoted and SourceBottle remain active.
**Applied here:** Positioned as *"the person with the grocery price dataset,"* you are an unusually strong source for the many food-cost stories that run every month — this is one of the few places a zero-authority site can get a link from a large publication.
**Effort:** S ongoing (daily email triage), and response speed decides everything.
**Traffic potential:** Little direct traffic; occasionally excellent links. Response-to-placement rates are poor and getting worse as AI-generated pitches flood every platform — a genuinely differentiated angle (first-party data) is now the only thing that cuts through.
**Flag: SITUATIONAL** — condition: you answer within the hour with a *specific number from your own dataset*, not generic commentary. The classic "spray generic HARO answers" version is **DEAD**.
**Sources:** [Prowly, Connectively/HARO alternatives](https://prowly.com/magazine/connectively-haro-alternatives/); [Blck Alpaca, HARO alternatives 2026](https://blckalpaca.at/en/knowledge-base/seo-geo/off-page-seo-link-building/haro-alternatives-2026-featured-qwoted-and-source-of-sources).

### 72. The "state of the industry" report
**What:** An annual report positioning you as the sector's record-keeper.
**Applied here:** *"The State of Grocery Value 2026."* Distinct from §2 in that it aggregates *everything* — your data plus USDA/BLS context — into the one document a journalist can cite for background.
**Effort:** L.
**Traffic potential:** Low traffic, high citation. Reports are the standard artefact journalists cite when they need a number and a name.
**Flag: SITUATIONAL** — condition: you have enough proprietary data to justify calling it a report rather than a blog post. You do.

### 73. Reverse-engineering someone else's viral hit
**What:** Find a piece that went viral in an adjacent niche and rebuild it with your data.
**Applied here:** Grocery-cost posts go viral on Reddit constantly; most are anecdotal ("look at my receipt"). Your version answers the anecdote with the dataset.
**Effort:** S.
**Traffic potential:** Reliable, unglamorous, and consistently underrated — demand is already proven, so you're not gambling on whether people care.
**Flag: WORKS.**

### 74. Free tool built for a *different* audience's problem
**What:** Build a tool that serves an adjacent professional audience who will link to it from high-authority domains.
**Applied here:** A **cost-per-serving calculator for food pantries, school nutrition programs, and dietetics students**. Those audiences sit on `.org` and `.edu` domains — the exact link sources that are otherwise unreachable for a consumer food blog, and that carry disproportionate weight.
**Effort:** M.
**Traffic potential:** Low volume, exceptional link quality. One of the few realistic paths to a `.edu` link for a site like this.
**Flag: WORKS** — a genuinely under-used angle for consumer sites sitting on institutional-grade data.

---

## Summary matrix — all 74 methods

| # | Method | Effort | Flag | Zero-authority traffic potential |
|---|---|---|---|---|
| 1 | Original research / data study | L | WORKS | Low direct; high link fuel — only with outreach |
| 2 | Annual index ("The X Index") | L→M | WORKS | Compounding; 3-year bet, highest structural leverage |
| 3 | Survey research | M–L | SITUATIONAL (≥$300 panel) | Good link-per-dollar if funded |
| 4 | "We tested X" | M | WORKS | Moderate, durable, AI-resistant |
| 5 | Curated mega-list | S–M | SITUATIONAL (own data) / DEAD if compiled | Low unless data-backed |
| 6 | Ultimate guide / pillar | L | SITUATIONAL (cluster exists) | Structure asset, not traffic, for 12+ mo |
| 7 | Glossary hub | M | SITUATIONAL / near-DEAD | Low — AI Overview cannibalised |
| 8 | Comparison pages (X vs Y) | S each | WORKS | **Best realistic ranking path** |
| 9 | Statistics roundup | S–M | SITUATIONAL (first-party stats) | Low unless original |
| 10 | Public database / directory | L | WORKS | Slow start, highest ceiling |
| 11 | Teardown / audit | M–L | WORKS (press) | High variance, high press upside |
| 12 | Interactive map / by-state | L | WORKS (if real regional data) | 50 local-press shots |
| 13 | Free calculator (tool SEO) | S–M | WORKS | 12–24 mo to volume; best link magnet |
| 14 | Embeddable widget | S+outreach | SITUATIONAL / DEAD at scale | Small clean referral; link-spam risk |
| 15 | Generators | M | WORKS | High share + best email capture |
| 16 | Quizzes | M | SITUATIONAL (needs traffic first) | Social/email, not search |
| 17 | Printables / PDFs | XS–S | WORKS | Strong Pinterest + lead magnet |
| 18 | Spreadsheet templates | S–M | WORKS (referral) | Reddit/forum share, not search |
| 19 | Notion templates | M | SITUATIONAL — likely skip | Audience mismatch |
| 20 | Figma Community | M | MYTH here | ~0 |
| 21 | Chrome extension | L–XL | SITUATIONAL (maintenance) | Separate discovery pool, weak site traffic |
| 22 | Custom GPT | XS–S | SITUATIONAL — 1h experiment | Rounding error inside AI's ~1% of traffic |
| 23 | Mobile app | XL | MYTH as traffic method | ~0 |
| 24 | Checklists / cheat sheets | XS | WORKS (amplifier) | Best benefit-per-minute on list |
| 25 | Live dashboard | M–L | SITUATIONAL (stays current) | Repeat visits + press infrastructure |
| 26 | Dataset distribution (Kaggle/Zenodo) | S | WORKS | Small volume, exceptional link quality |
| 27 | Public API | M | SITUATIONAL (dev audience) | Very low |
| 28 | Seasonal calendar (60–90d early) | S–M | WORKS | Converts patience into rankings; nearly free |
| 29 | Holidays / events | S–M | WORKS (major) / MYTH (national-X-day) | Spiky and reachable |
| 30 | Trend-riding | S each | WORKS (needs speed) | Thin competition = winnable |
| 31 | Reactive newsjacking | S | SITUATIONAL / DEAD for search at this size | Discover-gated |
| 32 | Price-shock hijacking | S | WORKS | **Best press/Reddit angle available now** |
| 33 | Awareness months | S–M | SITUATIONAL (outreach window) | Links not sessions |
| 34 | January diet season | M (ship by Nov) | WORKS | Largest predictable window |
| 35 | High-arousal emotion | XS | WORKS | Multiplier on everything |
| 36 | Practical value (STEPPS) | XS | WORKS | Steady, dark-social, under-credited |
| 37 | Social currency | XS | WORKS | High leverage, zero cost |
| 38 | Triggers (weekly shop) | XS–S | WORKS | Habit formation |
| 39 | Surprising numbers | XS | WORKS (verify every number) | Highest ROI per second |
| 40 | Contrarian takes | S | SITUATIONAL (data-backed only) | High variance, ban risk |
| 41 | Myth-busting | S–M | WORKS | Best match to existing CSVs |
| 42 | Identity-affirming | XS | WORKS (avoid condescension) | Community multiplier |
| 43 | Curiosity gap | XS | DEAD pure / WORKS partial+concrete | CTR only |
| 44 | Before / after | M | WORKS | Best visual format for the niche |
| 45 | Headline formulas | XS | WORKS | Matters on Pinterest/Reddit, not yet on Google |
| 46 | First-3-seconds hook | XS | WORKS (figures unverified) | Top video variable |
| 47 | Thumbnail / pin design | XS–S | SITUATIONAL (account not suppressed) | Blocked until Pinterest issue resolved |
| 48 | Skimmable structure / TOC | XS | WORKS hygiene / MYTH as ranking tactic | Retention |
| 49 | FAQ blocks | XS | DEAD (rich results) / SITUATIONAL (AI) | No SERP real estate since Aug 2023 |
| 50 | Comparison tables | XS | WORKS | High AI-citation rate |
| 51 | Original imagery | S | WORKS | Makes pages linkable; watermark charts |
| 52 | Atomisation | M once | WORKS | Only way one operator scales |
| 53 | Data→chart→pin→short | built | SITUATIONAL (needs a live channel) | Blocked on distribution |
| 54 | Article → video | S | SITUATIONAL (brand, not traffic) | Low conversion to sessions |
| 55 | Transcript → article | — | N/A here | No spoken content |
| 56 | Evergreen recycling | XS | SITUATIONAL (new creative, same URL) | Pinterest only |
| 57 | Refresh & re-date | S each | WORKS genuine / MYTH+harmful date-only | High ROI on aged pages |
| 58 | Translation | L | SITUATIONAL (human review) / DEAD if MT-at-scale | Real upside, high risk |
| 59 | Weekly recurring feature | S/wk | WORKS (must automate) | Retention + cadence signal |
| 60 | Numbered series | XS | SITUATIONAL (brand the series, not the title) | Throughput |
| 61 | Annual editions | — | WORKS | Keep ONE evergreen URL |
| 62 | Challenges | M–L | SITUATIONAL (needs list) | Harmful now, strong later |
| 63 | Named methodology | XS | WORKS | Uncontested branded queries |
| 64 | Personalised viral calculator | M | WORKS | **Highest ceiling single build** |
| 65 | Controversial rankings / tier lists | S | WORKS | Engagement + credibility combo |
| 66 | "What your X says about you" | M | DEAD standalone | Past peak |
| 67 | r/dataisbeautiful posts | XS | WORKS (rules-bound) | Cheap lottery ticket you already own |
| 68 | Silly generators | M | SITUATIONAL (fun AND useful) | Rarely converts |
| 69 | April Fools / fake product | S | MYTH here | Corrodes data credibility |
| 70 | Wikipedia citation | S–M | SITUATIONAL (never self-cite) | Nofollow; propagates into LLMs |
| 71 | HARO successors (Featured/Qwoted/SoS) | S ongoing | SITUATIONAL (speed + own numbers) | Few links, occasionally large ones |
| 72 | State-of-industry report | L | SITUATIONAL (enough own data — you have it) | Low traffic, high citation |
| 73 | Reverse-engineer a viral hit | S | WORKS | Proven demand, no gamble |
| 74 | Tool for an adjacent pro audience | M | WORKS | Realistic path to .edu/.org links |

**Tally:** 74 methods — 33 WORKS · 30 SITUATIONAL · 6 DEAD (or dead-as-commonly-practised) · 5 MYTH (for this site).

---

## What the pattern says

Three things fall out of the sweep:

1. **This site's constraint is not production — it is distribution.** It already has more assets (216 articles, 22 datasets, 7 tools, 31 charts, a video pipeline, an embed route, a dashboard) than most sites with 100× the traffic. Nearly every "build another thing" method scores lower than "get an existing thing in front of people." Pinterest is currently suppressed at the account level and short-form is unproven; **fixing one working distribution endpoint outranks every build on this list.**

2. **The proprietary dataset is the only real moat, and it is under-exploited.** Methods 26 (dataset distribution), 70 (Wikipedia), 71 (journalist requests), 72 (annual report) and 74 (tool for professionals) all convert the same asset into links from domains a food blog cannot otherwise reach. Almost none of them are currently being run.

3. **Most of what's labelled DEAD or MYTH here died the same way** — it was a cheap proxy for a real signal (length, dates, widget links, stats roundups, FAQ markup), and the proxy got detected. The methods that still work are the ones where the work is unfakeable: you priced the food, you tested the cans, you built the tool.



