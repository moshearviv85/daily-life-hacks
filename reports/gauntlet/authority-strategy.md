# AUTHORITY STRATEGY — daily-life-hacks.com
**Date:** 2026-08-01 · **Decision document, not a discussion document.**

Every number in this file was either computed directly from `reports/growth/article-pruning-matrix-2026-07-29.csv` and `public/data/*.csv` during the writing of it, or is explicitly marked **UNVERIFIED**. Nothing is estimated and presented as measured.

---

---

## 0. STOP. READ THIS FIRST — GOOGLE SWITCHED THE SITE OFF ON 2026-05-18

**This section was added by the orchestrator after the synthesis was written. The synthesis below
does not account for it, because the finding was truncated out of the synthesis input. Everything
in sections 1-9 is downstream of this and is partly invalidated by it.**

Verified directly from the owner's own Search Console exports
(`~/Downloads/daily-life-hacks.com-Performance-on-Search-2026-05-19` and `-2026-06-14`, `Chart.csv`):

| Date | Impressions/day | Avg position |
|---|---:|---:|
| 2026-05-13 | 175 | 26.5 |
| 2026-05-14 | **289** | 27.6 |
| 2026-05-15 | 238 | 29.0 |
| 2026-05-16 | 163 | 29.6 |
| 2026-05-17 | 210 | 45.3 |
| **2026-05-18** | **27** | 52.7 |
| **2026-05-19** | **2** | 44.0 |
| 2026-05-20 onward | 0 to 8 per day, permanently | 76 to 97 |

The site was **growing**, from 40 impressions/day on 2026-04-29 to 289 on 2026-05-14. Then it lost
**99% of its Google impressions in 48 hours** and has never recovered. Average position collapsed
from ~27 to ~76-97 at the same moment.

**This is not "a young site with no authority." It is a site that was working and was switched off.**

### What preceded it

`grep "^date:" src/data/articles/*.md` shows **43 articles published on a single day, 2026-04-28**.
The impression climb from 2026-04-29 is Google discovering and trialling that batch. The collapse
lands ~3 weeks later. A second batch of **40 articles was published on 2026-07-28**.

A 43-article single-day drop, followed three weeks later by an instantaneous 99% site-wide
suppression that never recovers, is the textbook signature of Google's **scaled content abuse**
spam policy. Bing was unaffected over the same period, which rules out a technical or crawl fault
and points at a Google-specific policy action.

**UNVERIFIED and unverifiable by Claude:** whether a MANUAL ACTION is actually recorded. That page
is only visible when signed in to the owner's Google account.

### The only first action that matters

**Open Search Console > Security & Manual Actions.** It takes 60 seconds. Nobody has ever checked it
in this repo's entire history.

- **If a manual action is listed** (likely "Thin content with little or no added value" or "Scaled
  content abuse"): a reconsideration request is the entire recovery path. No amount of link
  building, keyword retargeting, dataset work, crowdsourcing, Facebook posting, citation adding or
  schema tuning will do anything until it is lifted. Sections 1-9 of this document should be
  suspended until then.
- **If no manual action is listed:** it is an algorithmic site-level demotion on the same policy.
  Recovery is still gated on convincing Google the corpus is not mass-produced, which most likely
  means materially shrinking the article count, not adding to it. That is the opposite of what the
  site has been doing.

### What this means for the five rounds of content work already completed

The citation, accuracy and extraction-surface work done on 2026-07-30 to 2026-08-01 was real quality
work and fixed genuine factual errors, including a food-safety error. It was not wasted in the sense
of being wrong. But it was aimed at page-level quality on a site that Google has suppressed at the
**site level**, so it could not have produced traffic no matter how well executed. Diagnosis
preceded treatment in the wrong order, and this section is the correction.

---

## 1. THE DIAGNOSIS

The site has two separate problems and they mask each other.

**Problem one: it already ranks, and the rankings are worthless.** 28 pages sit at average position 1–10. Together those 28 pages produced **514 impressions in three months** — about 18 impressions per top-10 page per quarter. Ranking is not the constraint there. The queries have no volume. 267 articles were written against phrases almost nobody types.

**Problem two: where real demand exists, the site is on page 2 and cannot get off it.** 10 pages at position 11–20 carry 990 impressions — twice the traffic of the 28 top-10 pages, from a third as many URLs. That is where the audience is, and that is exactly where zero backlinks stops you.

Add the rest: only 70 of 267 articles have registered a single impression. 197 have no recorded position at all.

So: **bad keyword selection at the bottom, zero authority at the top.** Fixing either alone yields nothing. Nothing about schema, speed, internal links, or citation counts touches either one.

*(147 words)*

---

## 2. IS THE OWNER'S HYPOTHESIS RIGHT?

### 2.1 "No site offers a real protein-per-dollar comparison"

**No. It is false, and it is not a close call.**

Three independent audits searched this and all three came back with the same answer. Named, live, ranking competitors:

| Type | Sites found |
|---|---|
| Ranked food databases | proteinatlas.ca (52 foods), bulkedapp.com (100 foods), optimisingnutrition.com (180 foods), efficiencyiseverything.com (100+, Excel export), nutrola.app (45–60 foods, DIAAS-adjusted, 3 retailers) |
| Dedicated calculators | myproteinvalue.com, bitekit.app, comparewhey.org, proteincompared.com |
| Fast-food chain databases | fries.wtf (32 chains, live price tracker, price index, public API), macromatefastfoodhacks.com (120+ restaurants), proteinbenchmark.com (API + embed widgets + Chipotle bowl builder) |
| Crowdsourced price layers | Open Prices / Open Food Facts (284,714 prices, 7,396 users, live API), Basket (800k downloads, ~100k active contributors, paid moderators) |
| Academic / federal | Drewnowski (Univ. of Washington), *Current Developments in Nutrition*, cost per 50 g protein; USDA ERS Purchase to Plate Suite |

The fast-food angle — the part the owner thought was most open — is the **most** contested. fries.wtf ships a live price-change tracker and a public API. Our equivalent is a 1,237-word article.

Worse: the price basis is not merely "a weakness to close." One retailer, national, one date puts us **below the category median**. Nutrola spot-checks Walmart, Kroger and Costco and adjusts for DIAAS. fries.wtf tracks price changes continuously. The competitive axis in this family is **freshness** — note how many competitor titles carry "2026 Prices" — and freshness is the one axis a one-shot snapshot structurally loses.

### 2.2 Do the audits disagree? On one point, yes.

**They disagree on whether there is anything left.** The competitive-gap audit and the authority audit say the real differentiator is provenance — CC BY 4.0 + per-row USDA FDC IDs + edible-fraction + documented price basis + datapackage + a `nutrition_source_status` column that publicly flags its own unresolved rows. I verified those columns exist: `protein-per-dollar-2026.csv` has 49 rows tagged 36 `exact` / 5 `proxy` / 8 `unresolved`; `fiber-per-dollar-2026.csv` has 53 rows tagged 38 / 4 / 11. None of the nine competitors fetched publish anything comparable.

The demand-sizing audit says that differentiator addresses a phrase nobody searches.

**Adjudication: both are right, and they are answering different questions.** Provenance is real and rare. It is a **citation asset**, not a traffic asset. Nobody searches "open licensed protein dataset," so it will never rank — but it is the only thing on this site a stranger has a reason to link to. Given that the site's binding constraint is zero backlinks, a citation asset is *precisely* what is needed. Just do not confuse it with a traffic plan.

### 2.3 The verdict that matters

**Do not build the site around protein-per-dollar.** The evidence against is not theoretical:

- The 15-page per-dollar / cheapest cluster produced **0 impressions and 0 clicks** out of the site's 2,415 and 5. Zero, not a small share.
- **Honest caveat:** those pages went live 2026-07-04 to 2026-07-16, two to four weeks before the snapshot. That is age-confounded and is *not* proof of failure. It is proof there is no positive evidence yet. Mitigating context: 91 of 161 articles older than 2026-06-01 also have zero impressions, so age alone does not rescue pages on this site.
- Meanwhile the fiber cluster — 56 articles — carries **991 of 2,415 impressions (41%)**. Fiber demand is real on this site. Fiber-*per-dollar* demand is not: autocomplete expansion returned 5 completions for "fiber per dollar," four of which drift to broadband internet, and Bing returns zero.

**One-line summary: keep the dataset, aim it at links, and stop treating it as the growth engine.**

---

## 3. THE PLAN

### ACTION ZERO — the highest-leverage first action, named explicitly

> **Decide the attribution question, then make `/data/` accountable.**
>
> This week. Before anything else. It gates every link-earning move in this document.

Here is the uncomfortable part nobody has said out loud yet. The site has **exactly one asset that can produce a backlink** (the dataset) and **exactly one thing blocking its use** (the pseudonym). "David Miller" is fine on articles. It is a hard blocker on a citation asset, because everyone who might cite you — Data Is Plural, a journalist, a researcher, an open-data catalog — runs the same check: *who is accountable for these numbers?* "Daily Life Hacks" is not an answer, and a fabricated person's name in a DOI creator field is closer to fabrication than to branding.

**The recommended variant, which I believe avoids the discomfort that shelved email outreach:**

- Dataset **publisher** = Daily Life Hacks (an organization publishing data is completely normal — that is how USDA and BLS do it).
- Dataset **maintainer / data steward** in `CITATION.cff`, `.zenodo.json` and on `/data/` = **Moshe Arviv, real name, real contact email.**
- Article byline stays "David Miller." Nothing changes on the content side.

This is a *different act* from cold outreach. You are not writing to a stranger pretending to be a nutritionist. You are signing a spreadsheet you actually built. Nobody reading a Zenodo record connects it to a blog byline. If the owner still refuses, say so explicitly now — because then Tactics 1, 2 and 3 below all drop out and the honest recommendation for the site changes materially (see §9).

**Also in Action Zero, on `/data/`:** named maintainer, working contact address a stranger can use to report an error in row 17, a stated correction policy, and the quarterly re-audit cadence stated publicly.

**Effort:** 2–3 hours. **Owner needed:** yes, for the decision and the email address. Claude does the page.
**Payoff:** none directly. It unblocks everything below.

---

### RANKED, SEQUENCED

**T1 — Resolve the 19 flagged rows, then freeze v1.0.**
*What:* Fix the 8 `unresolved` rows in the protein CSV and the 11 in the fiber CSV. Two are actively wrong, not merely ambiguous: **popcorn kernels sits at fiber rank #5 (57.7 g/$) on a 14.5 g/100 g value that matches air-popped popcorn, not unpopped kernels** — it is the single most link-baity number in the dataset and the single most likely to get you publicly corrected. TVP's protein value also disagrees with the current manufacturer page. Separately, `protein-day-cost-2026.csv` and `fastfood-protein-per-dollar-2026.csv` price the same three McDonald's items **$3.26 apart on the same day**. Reconcile before anything is minted.
*Why it produces links:* it does not. It prevents the DOI from permanently freezing an error into a citable record, and it prevents the first person who checks your work from finding a mistake in the top five.
*Effort:* 1 day. *Payoff:* immediate prerequisite. *Who:* Claude computes, owner verifies any price that requires looking at a shelf.

**T2 — Mint a Zenodo DOI and cut a versioned release.**
*What:* Public dataset repo → `LICENSE`, `CITATION.cff`, `.zenodo.json`, `CHANGELOG.md` → Zenodo GitHub integration → tag `v2026.1` → DOI, registered with DataCite.
*Why it produces links:* DataCite DOIs propagate into scholarly aggregators and are surfaced by Google Dataset Search. It converts "a blog's CSV" into a versioned, archived, citable object. This is the difference between something a researcher *can* cite and something they *won't*. It is also the entry ticket for T3 and T4.
*Effort:* half a day. *Payoff:* immediate existence, weeks for propagation. *Who:* owner needs a Zenodo account (10 min, GitHub login); Claude does the rest.
*Blocker found:* `git remote -v` shows only `moshearviv85/daily-life-hacks`. **No separate public dataset repo exists.** It has to be created first.

**T3 — Push the dataset to where data people already look.**
*What:* Hugging Face Datasets, data.world, Kaggle Datasets; verify `Dataset` JSON-LD on `/data/` so Google Dataset Search picks it up.
*Why it produces links:* these are crawled, high-authority domains that link out to the canonical source by convention. This is **pull-based**: you publish an artifact and people find it. No pitching, no pseudonymous email, no gatekeeper.
*Effort:* half a day. *Payoff:* 2–8 weeks. *Who:* owner creates 3 accounts; Claude uploads and writes the dataset cards.

**T4 — Submit to Data Is Plural.**
*What:* One submission, one paragraph, real name, DOI attached.
*Why it produces links:* DIP is a newsletter read by data journalists with an archive that is itself linked and cited. One placement typically produces a cluster of secondary links. It is a *submission form*, not cold outreach — you are not intruding on anyone.
*Effort:* 1 hour. *Payoff:* weeks, and acceptance is not controllable. *Who:* **owner must send it.**

**T5 — r/datasets post + one Show HN.**
*What:* Two posts, over two weeks, under Moshe's real account, about a free CC BY 4.0 dataset with USDA source IDs. Not about an article. Not linking to a monetized page.
*Why it produces links:* HN and Reddit links are nofollow, but both reliably produce *secondary* pickup from blogs and newsletters, which are not. Critically, **r/datasets has nothing to do with r/EatCheapAndHealthy** — different subreddit, different norms, and "here is a free open dataset" is on-topic there rather than self-promo. The previous ban does not transfer.
*Effort:* 2 hours. *Payoff:* days if it lands, nothing if it doesn't. *Who:* owner posts.

**T6 — Build the BLS monthly time series. This replaces crowdsourcing.**
*What:* Join BLS Average Price series (roughly 70 food items, monthly, national **plus four regions**, decades of history, free API, every number traceable to a named series ID) to USDA FDC nutrient values using the existing edible-fraction rules. Output: *grams of protein per dollar and grams of fiber per dollar in the United States, monthly, by region.* Re-pull and append via a monthly GitHub Action.
*Why it produces links:* it fixes all three weaknesses of the current dataset at once — one date becomes a time series, one geography becomes four official regions, one retailer becomes a federal statistical survey — and it makes the site the citable answer to "has protein actually gotten more expensive?", which is a question with a recurring news cycle rather than a one-time hit. A dataset that updates itself is the thing that separates a live dataset from a dead one, and it is what Data Is Plural and open-data catalogs weight most heavily.
*Honest constraints, state them on the methodology page rather than hiding them:* BLS AP tracks ground beef, chicken, eggs, milk, bread, rice, bananas and similar — **it does not track dry pinto beans or lentils.** Expect roughly 30–50 usable rows, not 267. The Walmart-based rankings stay as a separate, clearly labeled dataset.
*Effort:* 3–5 days, then near zero. *Payoff:* 2–4 months. *Who:* Claude, entirely. No accounts.

**T7 — The one-page SEO project: `high-fiber-fast-food-options-guide`.**
*What:* This URL is 457 impressions at position 13.87 — 19% of all site impressions on one page, and the only URL anywhere near page one. Expand it into the per-chain, per-item long tail it already half-ranks for ("high fiber order at [chain]"). "Best order at X" is the only query shape that has ever produced a meaningful impression count here.
*Why it might produce rankings:* it needs a few positions, not a domain rating. Every other page needs authority the site does not have.
*The honest ceiling, so nobody oversells this:* moving it from 13.9 to top 5 might produce 20–40 clicks a quarter. That is 4–8× the entire site's current output and still a small absolute number. **Do it because it is cheap, not because it is transformative.**
*Effort:* 2 days. *Payoff:* 6–12 weeks. *Who:* Claude.
*Companion note:* `best-low-cost-protein-sources-large-families` is at position 12.53 with 85 impressions and 1 click — the site's second-best foothold, and it sits squarely in the budget-protein space. Same treatment, second in queue.

**T8 — Add the supplement / powder / bar tier to the dataset.**
*What:* ~15–25 rows: whey concentrate, whey isolate, casein, soy and pea isolate, major bars, RTD shakes. Same schema, same per-row provenance, DIAAS where published values exist. Then compute — do not pre-write — the quality-adjusted powder-vs-whole-food comparison.
*Why it might produce links:* the audits report a live national news cycle on protein costs (whey price spikes, GLP-1-driven protein demand). **I did not verify those press claims and neither did the audit that surfaced them — treat as UNVERIFIED.** But the structural point stands independently: there is currently **no whey, no powder, no bar anywhere in your CSVs**, which means you have zero rows on the most commercially discussed protein category in the country. That is a gap in your own asset regardless of the news.
*Effort:* 1–2 days. *Payoff:* enables a pitch; no direct links. *Who:* Claude drafts; owner verifies prices.

**The contrarian angle worth leading with when you do pitch anything.** Computed from `protein-quality-per-dollar-2026.csv` (25 rows, verified just now): raw, pinto beans at 97.9 g/$ beat chicken drumsticks at 50.3 g/$ by **1.95×**. Quality-adjusted for DIAAS, that collapses to 57.8 vs 50.3 — a **1.15×** gap. Whole wheat flour falls from #2 raw (96.0) to #7 adjusted (43.2). That contradicts the "beans are ten times cheaper, obviously eat beans" content everyone else publishes — **including this site's own prior content.** Arguing against your own back catalogue with sourced numbers is the single most credible thing you can put in front of a journalist.

---

## 4. WHAT TO STOP DOING

Unsentimentally, including work already finished.

1. **Stop asserting nobody publishes protein-per-dollar.** It is falsified on the first page of the owner's own example queries. Any plan built on that premise inherits the error.
2. **Stop expanding the per-dollar cluster.** 15 pages, 0 impressions, 0 clicks. Page 16 tests nothing that pages 1–15 have not already failed to demonstrate. Let the cluster age past 90 days and *read the result* before writing another word in it.
3. **Stop writing new articles. All of them. For 90 days.** 267 articles produced 5 clicks. 174 of them (65%) have zero search evidence of any kind. Article #268 is not different from articles #94 through #267.
4. **Stop treating research rigor as a ranking input.** All eight of the site's top pages by impressions have `external_citation_count = 0`. The best-sourced page on the site has zero impressions. Rigor is correct for YMYL integrity — it is simply not the binding lever, and more hours spent there will not move clicks.
5. **Stop the content-quality rounds.** Five rounds are done. The measurement says content quality stopped being the constraint some time ago.
6. **Stop all technical SEO.** Sitemap, schema, TTFB, internal links, llms.txt, feeds, MCP server, regression harness — all excellent, all irrelevant to the two problems in §1. Any further hour here is an hour spent because it feels productive.
7. **Stop chasing head queries** like "cheapest source of protein." GoodRx, AARP, WebMD and Houston Methodist hold those with thin listicles on institutional trust. Our data is better than all of them and loses to all of them. That is the clearest available proof that data quality does not convert to rankings in nutrition.
8. **Stop marketing the single-retailer snapshot as the competitive advantage.** Until T6 ships, a head-to-head comparison against Nutrola or fries.wtf loses on price basis. Lead with provenance and reproducibility, never with price coverage.
9. **Stop trying to recover Pinterest.** Suppressed to zero. Sunk. Walk away.

---

## 5. THE CROWDSOURCE VERDICT

### **DEFER. Do not build it, do not build a minimal test.**

This is a straight adjudication between the audits: the crowdsource-design audit proposed a salvaged "bounded price-calibration layer" worth shipping this week; the competitive-gap and authority audits said kill it. **I side with kill/defer, and here is why the salvaged version does not survive either.**

The salvaged design's own argument is that it is "useful at zero contributions" — because it is really a personal calculator with an optional share checkbox bolted on. That is honest, and it is also the tell: if it is useful at zero contributions, then it is a calculator, and it should be judged as a calculator. Judged as a calculator, it targets "protein per dollar calculator," which returned **6 autocomplete completions**. It is not the highest-leverage build available this quarter. So it defers too.

**The evidence against the crowdsourced layer proper:**

- **Open Prices, the well-resourced case, is losing the US.** Live API figures pulled 2026-08-01: 284,714 prices, 7,396 registered users, 3,271 (44%) who ever submitted once, 6,611 store locations worldwide — **2,355 in France, ~323 in the United States.** Backed by Open Food Facts, three years old, with an app, a volunteer community, and gamification they evidently found necessary. Contribution followed the founders' pre-existing community, not market size or utility. *(Method note: country counts come from OSM address substring matching, so 323 is a floor, not a census. The France/US ratio is robust to that error bar.)*
- **Basket, the funded US commercial case, pays 1,000–3,000 commerce moderators per month** to keep prices fresh at ~100k active contributors. Crowdsourced local grocery pricing does not self-sustain on goodwill even at that scale.
- **The Nomad List analogy inverts the causality.** Levels had an audience from "12 startups in 12 months" *before* the spreadsheet; the spreadsheet monetized attention that already existed. The editability was the retention mechanic, not the acquisition mechanic. Copying the artifact without the audience copies the wrong half.
- **A pen name structurally blocks the mechanism.** "David Miller" cannot post "I made this, come break it." The Nomad List origin runs on founder identity.
- **Cold-start math for this specific site:** at 5 clicks a quarter, a new submission page gets functionally zero organic visitors. Even a generous 200 visitors and a 15% completion rate yields 30 rows spread across 49 foods × dozens of chains × hundreds of metros. Median cell count: zero. **Thirty rows is not a dataset, it is a suggestion box.**
- **It destroys the only asset.** Unverified anonymous submissions on a YMYL nutrition site are the exact opposite of per-row USDA FDC traceability. You would trade the one property that makes the data citable for a feature nobody searches.
- **Grocery prices are not unobtainable in 2026** the way city internet speeds were in 2014. Flipp, store apps, Basket and Open Prices already exist. A contributor's honest question — "why type this into a site I've never heard of?" — has no answer.

**One line: this is a distribution problem being addressed with a product feature.** Building a contribution layer to fix a traffic problem is treating a broken leg with a new pair of shoes. And the price-basis weakness it was meant to fix is fixed better, faster and automatically by T6 (BLS).

### Kill / revival criteria

Revisit the crowdsource layer **only** when **all three** are simultaneously true:

1. The site sustains **≥ 300 organic clicks per quarter** (60× current), so a submission page has an audience.
2. At least **one referring page sends ≥ 500 sessions in a month** — proof that a distribution channel exists at all.
3. The BLS layer (T6) has shipped and is still insufficient for a documented, specific question users are actually asking.

If any one is false, do not build it. Re-check at the 90-day review, not before.

---

## 6. FACEBOOK VERDICT

### **Do not run the daily-post plan. Create the page once, then leave it alone.**

**The mechanism, plainly:** Facebook outbound links are `rel="nofollow"` and its content sits behind a login wall Google does not crawl as an open page. A post with 10,000 shares moves the backlink count from 0 to 0. *(UNVERIFIED as of today: I could not confirm Facebook's current link markup from this environment. It is long-standing behaviour, but treat it as "very likely," not "checked." The walled-garden point is not in doubt either way.)*

**The organic reach problem is not a content problem.** A brand-new business Page with zero followers and no ad spend distributes to essentially nobody, because Page reach is a function of who already follows it. There is no "keep posting and the algorithm finds you" mechanic for a cold Page. Weeks 1–8 will be single-digit reach, most of it people you know. One post per day for 30 days is roughly **10 hours** spent to reach an audience that structurally does not exist yet.

**The audience fit is genuinely good** — US, grocery budgets, families, older-skewing — and the real distribution engine there is **Groups**, not Pages. But Groups is blocked in practice: most groups require posting from a personal profile, and a "David Miller" profile violates Facebook's real-name policy *and* walks straight back into the pseudonym discomfort. **UNVERIFIED:** whether specific target groups permit posting-as-a-Page. If the owner wants to test this, verify group-by-group before building any plan that depends on it.

**What Facebook is actually for, if you keep it:** a credibility anchor. A place a link can point to that proves the site is a real thing, checked by exactly the kind of person who is deciding whether to cite you. That job requires the page to *exist*, not to be *fed*.

**Decision:** create the page, fill the About section, post 3–5 times total so it is not empty, then stop. Reallocate the 20 minutes a day to T1–T5, which have mechanisms attached.

---

## 7. THE 30-DAY CONCRETE PLAN

Written to be executed without further deliberation.

### Week 1 — Unblock and clean
- **Day 1 (owner, ~30 min):** Decide the attribution question in §3 Action Zero. Yes or no, in writing. If yes, provide a contact email for `/data/`.
- **Day 1–2 (Claude):** Rewrite `/data/` with named maintainer, contact address, correction policy, stated quarterly re-audit cadence, and a "cite this dataset" block (DOI slot left empty).
- **Day 2–4 (Claude + owner):** Resolve all 19 `unresolved` rows. **Popcorn kernels first** — it is fiber rank #5 and the value looks like air-popped, not kernels. Then TVP. Then reconcile the $3.26 McDonald's price disagreement between `protein-day-cost-2026.csv` and `fastfood-protein-per-dollar-2026.csv`.
- **Day 5 (owner, 10 min):** Create the Facebook page, fill About, schedule nothing.

### Week 2 — Make it citable
- **Day 6–7 (Claude):** Create the public dataset repo. Add `LICENSE`, `CITATION.cff`, `.zenodo.json`, `CHANGELOG.md`, `datapackage.json`, README with methodology and known limitations (single retailer, single date — state it).
- **Day 8 (owner, 15 min):** Zenodo account via GitHub, enable the repo.
- **Day 8 (Claude):** Tag `v2026.1`. Confirm the DOI resolves. Add it to `/data/`.
- **Day 9–10 (Claude):** Verify `Dataset` JSON-LD on `/data/`; upload to Hugging Face Datasets, data.world and Kaggle with proper dataset cards. *(Owner: 3 account signups, ~20 min total.)*

### Week 3 — Distribute, and start the thing that lasts
- **Day 11 (owner, 1 hr):** Submit to Data Is Plural. Real name. One paragraph. Lead with reproducibility, not with the ranking.
- **Day 12 (owner, 20 min):** Post to r/datasets. Free dataset, no monetized link.
- **Day 15 (owner, 20 min):** Show HN on the dataset. Separate the two posts by several days.
- **Day 11–15 (Claude, parallel):** Begin T6. Map BLS AP series IDs to USDA FDC IDs. Document which of the 49 foods have BLS coverage and which do not — publish the exclusion list, do not quietly drop them.

### Week 4 — Build the durable asset, then the one SEO play
- **Day 16–20 (Claude):** Finish the BLS protein-per-dollar / fiber-per-dollar monthly index, national + four regions, with the monthly GitHub Action appending new data. Separate CSV, separate methodology page, clearly labeled distinct from the Walmart snapshot.
- **Day 21–25 (Claude):** Expand `high-fiber-fast-food-options-guide` into its per-chain long tail. Then `best-low-cost-protein-sources-large-families`.
- **Day 26–30:** Freeze. Write nothing new. Record the baseline in §8 so the 90-day comparison is honest.

**Not in this plan, deliberately:** any new article, any per-dollar expansion, any Facebook cadence, any contribution form, any schema or speed work.

---

## 8. HOW WE WILL KNOW IT IS WORKING

At 5 clicks a quarter, sitewide organic clicks are noise. A move from 5 to 12 is statistically meaningless and will be over-read in both directions. **Do not use clicks as a decision metric for 90 days.** Use these instead.

### Primary — the only metric that decides anything

| Metric | Baseline (2026-08-01) | 90-day threshold |
|---|---|---|
| **Distinct referring domains** (Bing Webmaster + GSC Links) | **0** | **≥ 3.** Below 3, the dataset thesis has failed. |

That is the whole scoreboard. Everything else is diagnostic.

### Secondary — diagnostics, not decisions

| Metric | Baseline | 30-day | 90-day |
|---|---|---|---|
| Zenodo DOI exists and resolves | none | yes | yes |
| Zenodo views / downloads | n/a | any nonzero | ≥ 50 downloads |
| Dataset listed in ≥ 3 external catalogs | 0 | 3 | 3+ |
| `/data/` CSV downloads from non-owner IPs (instrument via Pages Function) | not measured | measured | any sustained nonzero |
| Data Is Plural: submitted / accepted | not submitted | submitted | binary outcome |
| `high-fiber-fast-food-options-guide` avg position | **13.87** | — | **≤ 8.0** |
| That URL's impressions (3 mo) | **457** | — | ≥ 700 |
| Pages at position 11–20 | **10** (990 impressions) | — | ≥ 14 |
| Site impressions (3 mo) | **2,415** | — | ≥ 3,500 |

### What each result means

- **≥ 3 referring domains and any of them sends traffic:** the pull-based dataset thesis works. Double down on T6 and repeat the T3–T5 distribution cycle each time a new dataset version ships.
- **1–2 referring domains, no traffic:** partial. The asset is citable but not discoverable. The fix is more surfaces (more catalogs, more dataset versions), not more content.
- **0 referring domains after DOI + DIP + r/datasets + HN + 3 catalogs:** the thesis is dead, and it died having been given a fair test. Then the conclusion is unavoidable and should be stated plainly: **this site cannot earn links passively**, and the owner faces a binary — either accept a real-name public identity and the outreach that comes with it, or accept the site as a hobby that does not grow. Do not respond to that outcome by writing more articles.
- **Impressions rise but clicks do not:** expected, and fine. At this stage impressions are the leading indicator; clicks lag rankings by months.

### Explicit anti-metrics — do not report or optimize these

Word count, citation count, internal link count, articles published, schema coverage, page speed, Facebook reach, Pinterest anything.

---

## 9. HONEST RISKS AND UNKNOWNS

**Marked UNVERIFIED means an audit tried and could not confirm it. It is not a soft yes.**

**Things that could invalidate the whole plan**

1. **UNVERIFIED — is the flagship even indexed?** `/protein-per-dollar-cheapest-protein-sources/` has 0 impressions, and the site has 535 URLs not indexed. Zero impressions is consistent with both "indexed and ranking nowhere" and "not indexed at all," and those have completely different fixes. **Run GSC URL Inspection on it in week 1.** It is a five-minute check that changes the diagnosis.
2. **UNVERIFIED — is there a sitewide quality or trust suppression?** 5 clicks on 2,415 impressions is a 0.21% CTR, and 197 of 267 pages have no recorded position. That pattern is *consistent with* sitewide suppression and equally consistent with simply being an unknown domain on low-volume queries. Nobody can test this from outside GSC. If suppression exists, every recommendation here is aimed at the wrong constraint.
3. **The pseudonym decision is a genuine fork.** If the owner declines Action Zero, T2/T3/T4 lose most of their force. An org-only attribution is workable but weaker, and the honest expectation shifts toward the "0 referring domains" branch in §8.
4. **No public dataset repo exists.** `git remote -v` shows only the site repo, and no dataset repo is referenced in `datapackage.json` or `dataset-provenance.json`. T2 cannot start until one is created.

**Things measured but confounded**

5. **The per-dollar cluster's 0 impressions is age-confounded.** Published 2–4 weeks before the snapshot. It is not yet evidence of failure. Do not use it to justify deleting those pages — use it to justify not writing more.
6. **The 28 top-10 pages producing 514 impressions** is the strongest single finding in this document, but GSC average position is averaged across queries and can be inflated by rare long-tail hits. The direction is not in doubt; the precise magnitude is soft.

**Things nobody could verify**

7. **No search volume figures exist anywhere in this analysis.** No keyword tool was available. Autocomplete breadth counts are a proxy for *phrase variety*, not for volume. The absolute size of the protein-per-dollar market is genuinely unknown.
8. **No competitor authority data.** No Ahrefs or SEMrush. fries.wtf, nutrola.app and the rest are known to be *visible*; whether they are *strong* is unknown, which matters for how hard they'd be to displace.
9. **No literal Google SERP positions.** WebSearch ordering is not a Google SERP. Treat the competitor list as "these rank on page one somewhere," not as a ranked table.
10. **No competitor's numbers were spot-checked** against USDA FDC. Their claimed rigor may be overstated, which would improve our relative position slightly — not enough to change the verdict.
11. **The protein-cost news cycle is UNVERIFIED.** The press claims (whey shortage, price spikes, GLP-1-driven demand) came from search summaries and were not checked against BLS or USDA. Do not repeat any of those percentages in outward-facing copy. *(This site has already shipped a wrong ratio in a Reddit title once. Re-verify every number against source CSVs at delivery time.)*
12. **Facebook's nofollow behaviour was not confirmed today.** See §6.
13. **Open Prices' US store count (~323) is a floor**, derived from OSM address substring matching, not an exact census.
14. **Data Is Plural acceptance is not controllable.** It is one editor's judgment. Plan for rejection.

**Risks in the plan itself**

15. **T6 (BLS) is the largest single time investment and its payoff is the slowest.** If BLS coverage turns out to be under ~25 usable rows after the mapping work in week 3, stop and reassess rather than shipping a thin index.
16. **A DOI is permanent.** Every unresolved row and the McDonald's price inconsistency must be fixed *before* v2026.1, or the error becomes a citable, archived record.
17. **T7's ceiling is small.** 20–40 clicks a quarter in the best case. It is included because it is cheap and it is the only page in reach — not because it changes the trajectory.
18. **CC BY 4.0 means the data is not defensible.** Any site with authority can legally take the entire dataset, footnote it, and outrank us the same week. That is the deliberate price of open licensing, and it is the right trade — but it means the moat can only ever be maintenance cadence and provenance, never the numbers themselves. T6 is what makes the cadence real.
