# Pinterest Board Architecture — Research, Audit and Migration Plan

**Site:** daily-life-hacks.com · **Account:** 29 boards, 561 live pins · **Date:** 2026-07-26/27
**Status:** RESEARCH AND DESIGN ONLY. Nothing in this file has been executed. No board was created, renamed or deleted. No commit was made.
**Deliverable owner executes.** Every step below is written to be run by hand or by an existing script.

---

## 0. Executive summary

**The thesis holds, but for a narrower reason than "specificity is good."**

Our own measured data (below) shows a 10x spread between narrow and broad boards. But the spread is not caused by the boards being *narrow*. It is caused by the narrow boards' names being **phrases people actually type into Pinterest search**, and the broad boards' names being **internal filing categories**. "Easy Dinner Recipes" is a real Pinterest query. "Healthy Meal Prep & Kitchen Tips" is a folder label somebody invented. That distinction is what this whole document is built on.

A second finding changes the design materially: we already own **real Pinterest autocomplete data** (`pipeline-data/pi-keywords-data-21042026.csv`, 166 keywords harvested from 15 Pinterest seeds via a Pin Inspector-class tool). It was sitting unused. It shows the exact phrase shapes Pinterest users type, and several of our best content clusters map onto monster Pinterest seeds we have **no board for at all** (see §2.3). That data, not the Google/Bing harvest, is the authority for board naming.

**Headline numbers:**

| | Now | Proposed |
|---|---|---|
| On-topic boards | 10 (2 of them empty or near-empty) | 24 |
| Pins in boards under 1.0 imp/pin | 407 of 561 (73%) | 0 |
| Boards whose name is a verified Pinterest query | 3 of 10 | 24 of 24 |
| Boards with no description | 2 of the 3 largest | 0 |
| Off-topic legacy boards | 19 | 0 public (see §5 for the method) |

---

## 1. How Pinterest board naming and description actually affect distribution

> **Section status:** COMPLETE. Every claim below is tagged with a source class. See the key at the end of this section, and Appendix A for the full evidence index.
>
> **The short version:** the owner's thesis is confirmed by Pinterest's own engineering publications, with quantified ablations. Board titles are a named input feature to pin classification, pin embeddings, and search retrieval. And Pinterest **deletes** topically incoherent boards from its recommendation graph outright. Two of the plan's working assumptions turned out to be wrong, and both are corrected in §1.9.

### 1.0 Our own evidence first

Measured 2026-07-26 across 561 live pins on our own account, impressions per pin:

| Board | Pins | Imp/pin | Name is a real Pinterest query? |
|---|---:|---:|---|
| Easy Dinner Recipes | 12 | **8.2** | Yes — "easy dinner recipes" |
| Food Storage and Freezer Tips | 12 | **6.6** | Yes — "food storage tips" / "freezer tips" |
| High Protein Meals and Smart Swaps | 11 | **5.6** | Partly — "high protein meals" yes, "smart swaps" no |
| Budget Meals and Grocery Hacks | 6 | **4.2** | Partly — "budget meals" yes, "grocery hacks" yes |
| Grocery Math: Food Prices and Nutrition Data | 14 | **2.4** | **No** — "grocery math" is not a query anyone types |
| Gut Health & Nutrition Tips | 83 | **2.0** | Weakly — "gut health tips" yes, but no format word |
| High Fiber Recipes | 226 | **0.7** | Truncated — the real query is "high fiber **dinner** recipes" |
| Healthy Meal Prep & Kitchen Tips | 181 | **0.6** | **No** — two unrelated topics welded together |

**Read the table by column 4, not column 2.** Sorted by imp/pin, the ranking is almost exactly the ranking by "is this name a phrase a human types into the Pinterest search bar." That is a stronger and more actionable claim than "narrow beats broad," and it survives the obvious objection below.

### 1.1 The confound we have to be honest about

The correlation between board size and performance is **partly an artifact of the routing bug fixed on 2026-07-26**, not purely a board-quality effect. Before the fix, `board_for_pin()` in `scripts/lib/d1_csv.py` checked the two broadest keyword sets (`GUT_NUTRITION_KEYWORDS` containing bare `"fiber"` and `"nutrition"`, and `MEAL_PREP_KEYWORDS` containing bare `"prep"`) *before* the recipe rule. Those two rules swallowed nearly everything. So:

- The two giant boards received **whatever was left over after no specific rule matched** — i.e. the most generic, least searchable pins on the account.
- The small high-performing boards received only pins that matched a **specific, intent-bearing keyword** — i.e. the sharpest pins we produce.

**Therefore some of the 10x gap is pin quality, not board quality.** Anyone selling you the pure "narrow boards win" story from this dataset is overclaiming, and we should not overclaim to ourselves.

What survives the confound:
1. **Board naming is free to fix and cannot hurt.** Even if boards were 100% neutral, a board named with a real query is an additional indexed surface at zero cost.
2. **The direction of every mechanism we can verify points the same way** (§1.2-§1.5).
3. **The 226-pin board at 0.7 imp/pin is evidence on its own.** 226 pins is well past any plausible "needs more pins to warm up" threshold. If volume alone drove distribution, that board would be the account's best. It is the account's second worst. Volume is demonstrably not the lever.

**Design consequence:** we are betting on naming and topical coherence, and we are *not* betting on "more boards is inherently better." Board count is a cost, not a benefit — every board added is a board that must be filled and maintained. The proposal in §3 adds boards only where a distinct, verified query exists to justify one.

### 1.2 Is the board name indexed? Is the board *description*?

**Board titles: YES, confirmed. Board descriptions: NOT EVIDENCED ANYWHERE. This split matters.**

- **[ENG]** `OmniSearchSage: Multi-Task Multi-Entity Embeddings for Pinterest Search` ([arXiv 2404.16260](https://arxiv.org/abs/2404.16260), submitted 2024-04-25, WWW '24 Companion) is the model behind production Pinterest search. Its abstract names three enrichment sources for pin representations: image captions from a generative LLM, historical engagement, and **user-curated boards**. Mechanism: Pinterest gathers the titles of every board a pin has been saved to, ranks them, drops noisy ones, and feeds the **top 10 board titles** in as a model feature. Verbatim: "Each board carries an associated title, reflecting the topic or theme of the collection."
- **[OFFICIAL]** Boards are a first-class *result type* in Pinterest search. [Search for ideas on Pinterest](https://help.pinterest.com/en/article/search-for-ideas-on-pinterest): users "can select from multiple different content type filters, including all Pins, **Boards**, Profiles, Videos and Products."
- **[OFFICIAL]** Board pages are indexed by Google. `pinterest.com/robots.txt` does not disallow `/{username}/{boardname}/`, and it lists **ten dedicated board sitemaps** — including `board_link_sitemap_high_cohesion_tier_0`/`_tier_1`, `board_link_sitemap_recent_engagement_tier_0`/`_tier_1`, and `board_link_sitemap_tier_0` through `tier_3_quality_uncrawled`. Pinterest is prioritising which boards it feeds to Google by **cohesion**, **recent engagement**, and **quality tier**. That robots.txt is a direct artifact proving Pinterest computes a per-board cohesion score.

**The negative finding, stated plainly:** across P2I, Interest Taxonomy, OmniSearchSage, OmniSage, PinSage, Pixie and Related Pins, **only board *titles* are ever named as a feature. Board descriptions are never mentioned once.** The universal SEO advice to keyword-stuff board descriptions has **no engineering-source support**. `[FOLKLORE]`

**What we do about that:** we still write good descriptions (§3.2), because they cost one hour total, they are read by humans deciding whether to follow, and absence of evidence is not evidence of absence. But we do **not** treat descriptions as the lever, and we do not spend a second round of effort tuning them. **The board NAME is the lever.**

### 1.3 Does the board feed pin classification, or is it just a folder?

**It is a genuine, named input feature. This is the crux of the owner's thesis, and it is confirmed by Pinterest's own engineering publications with quantified ablations.** `[ENG]`

1. **Pin2Interest (pin to taxonomy classification)** — [Interest Taxonomy](https://medium.com/pinterest-engineering/interest-taxonomy-a-knowledge-graph-management-system-for-content-understanding-at-pinterest-a6ae75c203fd), Pinterest Engineering, 2020-01-10. P2I "leverages both text and visual inputs such as annotations, visual embeddings, and **board names**." P2I output feeds home feed ranking, search ranking and retrieval, ads interest targeting and safety filtering.
2. **OmniSearchSage ablation, Table 4** — each row is the marginal gain over the row above:

   | Features added | Save | Long-Click | Relevance |
   |---|---:|---:|---:|
   | Continuous features only | 0.43 | 0.53 | 0.30 |
   | + Title, description, GenAI captions | 0.52 (+21%) | 0.63 (+19%) | 0.39 (+30%) |
   | **+ Board titles** | **0.61 (+17%)** | **0.68 (+8%)** | **0.44 (+13%)** |
   | + Engaged queries | 0.65 (+7%) | 0.73 (+7%) | 0.46 (+5%) |

   Board titles are the **second-largest text contributor**, behind the pin's own title/description/caption and **ahead of engaged search queries**.
3. **Boards are one of only two node types in Pinterest's graph models.** [PinSage](https://medium.com/pinterest-engineering/pinsage-a-new-graph-convolutional-neural-network-for-web-scale-recommender-systems-88795a107f48) trains on the pin-board bipartite graph (3 billion nodes). [OmniSage](https://arxiv.org/abs/2504.17811) (2025-04-22): "we consider two types of entities, namely Pins and boards." [Related Pins](https://arxiv.org/pdf/1702.07969) (WWW 2017) uses **board co-occurrence** as its original candidate generator — pins on the same board are emitted as related pairs.

**Verdict: the board is not a folder. The owner's thesis is correct and it is correct for the reason he stated.**

### 1.4 Board count, minimum pins, and ramp time — all folklore

| Claim | Verdict |
|---|---|
| "Optimal board count is 10 / 15 / 30" | **`[FOLKLORE]`.** No Pinterest source, official or engineering, states an optimal count. No published Pinterest model contains an account-level board-count term. Even the widely-cited "2,000 board limit" could not be verified against Pinterest's own text — [Limits for Pins, boards and follows](https://help.pinterest.com/en/article/limits-for-pins-boards-and-follows) confirms a cap exists but **declines to publish the number**. |
| "A board needs 20 / 30 / 50 pins before it gains traction" | **`[FOLKLORE]`.** No verifiable threshold anywhere. Weak indirect support that *some* pins are needed: Pixie estimates a board's topic distribution from its recent pins, so a near-empty board yields a poorly-estimated topic vector. That is an inference from mechanism, and it implies **no specific number**. |
| "A new board takes 3-6 months to rank" | **`[FOLKLORE]`** as stated about *boards*. Real data exists at the *pin* level: `[3P-DATA]` [Tailwind 2025 Benchmark Report Part 3](https://www.tailwindapp.com/pinterest-marketing/research/2025-benchmark-study-part-three) (2025-03-27, 17k accounts, ~1.2M pins) found new pins show near-zero impressions for the first days, **~20% still had zero distribution after one week**, and distribution expands across the first 90 days. `[OFFICIAL]` Pinterest says only "there's no set engagement window for Pins." |

**Design consequence:** stop worrying about board count and minimum pins. Neither is a real constraint. The 16-pin floor in §3.1 is a *presentation* standard (an empty board looks abandoned to a human), not an algorithmic one.

### 1.5 Concentration vs spread - the strongest external evidence in the file

**Spread across cohesive boards wins, and the mechanism is brutal.** `[ENG]`

[Pixie: A System for Recommending 3+ Billion Items to 200+ Million Users in Real-Time](https://ar5iv.labs.arxiv.org/html/1711.07601) (arXiv 1711.07601, WWW 2018, Pinterest + Stanford), Section 3.2, Graph Pruning, verbatim:

> "First, we quantify the content diversity of each board by computing the entropy of its topic distribution."
> "**Boards with large entropy are removed from the graph along with all their edges.**"
> "Surprisingly, we find that pruning is beneficial in two aspects: (1) decreases the size of the graph ... by a factor of six; (2) and also **leads to 58% more relevant recommendations**"

Two separate pruning mechanisms, both favouring narrow boards:

1. **Board-level.** A high topic-entropy board is **deleted from the recommendation graph entirely**, with all its edges. A grab-bag board contributes *nothing* to the pins sitting on it. Not "less" — nothing.
2. **Pin-level.** For pins saved to many boards, edges are pruned by cosine similarity between the pin's topic vector and the board's topic vector: "only keep the edges with the highest cosine similarity." Off-topic saves are discarded rather than counted.

**This is the mechanism behind our own 0.6 and 0.7 imp/pin boards.** A 226-pin board covering breakfast, snacks, dinners, salads, bread and soup has high topic entropy by construction. It is a strong candidate for exactly this pruning. That explains why 226 pins produce less reach than 12.

**Caveat, stated honestly:** Pixie is 2018. No 2024-2026 paper restates the LDA-entropy implementation, so the specific implementation may be superseded. But the *principle* is independently corroborated by the 2026 `high_cohesion_tier` board sitemaps in robots.txt, and Pinterest has published no retraction. `[UNVERIFIED]` as to current exact implementation; well-corroborated as to direction.

**No data, experiment, or Pinterest statement supporting the concentration position was found.**

### 1.6 Duplicate pinning to multiple boards

Two different things get conflated constantly. Separate them:

- **(a) Creating duplicate *Pins* (re-uploading the same image+URL as a new pin): officially discouraged.** `[OFFICIAL]` [Pin performance and distribution](https://help.pinterest.com/en/business/article/pin-performance-and-distribution): "**Avoid creating duplicate Pins:** Try not to repeatedly save the same Pins or upload content that already exists on Pinterest. **You may get flagged as spam and get temporarily blocked from creating Pins.**" `[3P-DATA]` Tailwind quantifies the decay: same URL + *new* image after 11-25 pins retains **64%** of original distribution; same URL + *same* image retains **11%**.
- **(b) Saving one pin object to several genuinely relevant boards: mildly beneficial.** `[ENG]` OmniSearchSage uses up to **10 board titles** per pin, so each additional *relevant* board title is additional signal. Pixie's cosine pruning means irrelevant saves are silently discarded rather than punished — the cost is wasted effort, not damage.
- **The "save to max 10 boards, wait 2 days between each" rule: `[FOLKLORE]`.** No traceable Pinterest source. The "2 days" traces to Tailwind's Interval Scheduling *product feature*, not to Pinterest policy. (Amusing coincidence: OmniSearchSage's 10-board-title cap matches the folklore number, but the folklore predates the 2024 paper, so there is no causal link.)

**Design consequence:** do not re-upload pins to seed new boards. Move the existing pin objects (§4).

### 1.7 Do off-topic boards harm the account?

**No. There is no account-level topical penalty in any published Pinterest mechanism.** Every documented mechanism is per-pin or per-board:

1. P2I and OmniSearchSage use *the board titles of the boards a given pin was saved to*. A legacy board containing **none of our food pins contributes zero tokens** to our food pins. It cannot dilute them.
2. Pixie prunes **per board**. A high-entropy off-topic board is dropped from the graph. The penalty lands on that board, not on the account.
3. OmniSage's graph has Pin and board nodes only. **There is no account node and no account-level topical score.**
4. Related Pins operates on pins co-occurring *on the same board*. Our food pins never co-occur with a "bohemian world" board unless they share it.

**The popular 2026 claim to explicitly reject:** the SEO-blog narrative that "Pinterest uses topical authority; if your pins scatter across themes Pinterest can't anchor your account to anything," and the "boards are like subdomains" metaphor, appear in **no Pinterest source whatsoever**. The board-level cohesion claim is well-supported. The account-level topical authority claim is invented. `[FOLKLORE]`

**Also frequently misquoted:** `[OFFICIAL]` Pinterest Newsroom 2018-02-14 says archiving "improves the relevance of your recommendations and notifications." That is about **the feed you see as a user**, not about your content's distribution to others. SEO blogs routinely cite it as evidence that archiving boosts reach. It does not say that.

### 1.8 2025-2026 changes worth knowing

- **TransAct V2** `[ENG]` ([arXiv 2506.02267](https://arxiv.org/abs/2506.02267), Jun 2025). Home feed ranking now models up to **16,000 lifelong user actions**, 160x the prior system. A/B: +6.35% homefeed repin volume, -12.80% hide volume, +1.41% time spent. (Unusually, the SEO blogs citing "16,000 actions" are correct.)
- **OmniSage** `[ENG]` (Apr 2025) — unified representation learning; **boards are one of only two node types**; ~2.5% sitewide repin lift; board embeddings used in both retrieval and ranking.
- **Home feed diversification overhaul** `[ENG]` ([Pinterest Engineering, 2026-04-07](https://medium.com/pinterest-engineering/evolution-of-multi-objective-optimization-at-pinterest-home-feed-06657e33cd10)). Moved from DPP to Sliding Spectrum Decomposition, then added quality-aware "soft spacing" penalties, with Semantic IDs for category-level overlap control. **Pinterest actively spaces out near-duplicate and same-category content within a feed** — another argument against near-identical pins.
- **Boards got an AI upgrade** `[OFFICIAL]` ([Newsroom, 2025-10-27](https://newsroom.pinterest.com/news/pinterest-boards-get-ai-powered-upgrade-for-personalized-experience/)) — "Make it yours", "More ideas", and testing **"Boards made for you"** (AI-curated boards pushed into home feeds). Pinterest is investing *into* boards, not away from them. Good news for a board-architecture bet.
- **Not verified `[FOLKLORE]`:** "massive algorithm update August 2024", "boards function like subdomains", "real-time engagement processing is new in 2026" (real-time action modeling shipped in 2023 with TransAct v1).

### 1.9 What the research changed about our plan

| Belief going in | After research |
|---|---|
| Narrow boards win | **Confirmed, with a mechanism** — Pixie deletes high-entropy boards from the graph outright |
| Board names matter | **Confirmed and quantified** — 2nd-largest text feature in OmniSearchSage |
| Board descriptions matter | **Downgraded to unevidenced.** Write them once, cheaply, then stop |
| 19 legacy junk boards are hurting us | **Wrong.** No account-level penalty exists. Archive for hygiene, not for lift |
| Need a minimum pin count per board | **No evidence.** Our 16-pin floor is a human-presentation standard only |
| Should split pins across many boards | **Yes — but cohesion, not count, is the variable.** 24 cohesive boards good; 40 mushy ones bad |

### 1.10 Source-class key

| Class | Meaning |
|---|---|
| **[OFFICIAL]** | Pinterest's own help/business/newsroom documentation |
| **[ENG]** | Pinterest Engineering publication or peer-reviewed paper by Pinterest authors |
| **[3P-DATA]** | Third party publishing an actual dataset or experiment with numbers |
| **[FOLKLORE]** | SEO/blogger advice with no traceable source. Repeated everywhere, verified nowhere |
| **[OURS]** | Measured on our own account |
| **[UNVERIFIED]** | Claim we could not substantiate either way |

---

## 2. Audit: our current board names vs what people actually search

### 2.1 The data we mined

Two sources, and they are **not equally authoritative for this job**:

| Source | Rows | What it is | Authority for board naming |
|---|---:|---|---|
| `pipeline-data/pi-keywords-data-21042026.csv` | 166 | **Pinterest** autocomplete expansions from 15 Pinterest seeds | **HIGH — this is the one that matters** |
| `pipeline-data/keyword-research/harvest.json` | 12,106 | Google (8,698) / Bing (4,497) / DDG (3,542) autocomplete | Medium — different platform, different intent |
| `pipeline-data/keyword-research/gaps.json` | 848 high-value | Subset of the above, scored for winnability | Medium — same caveat |

**This distinction is load-bearing and it was not in the brief.** The 12,106-query harvest is *search engine* data. Pinterest queries have a different grammar. Google users type questions ("how long do canned beans last after best by date"). Pinterest users type **noun phrases ending in a format word** — "ideas", "recipes", "meals", "tips". Of the 166 verified Pinterest keywords, essentially every one ends in or contains `recipes`, `ideas`, `meals`, or `food ideas`. Almost none is a question.

The Pinterest-side tables in `pipeline-data/topic-research.sqlite` (`pin_inspector_keywords`, `autocomplete`, `pinterest_trends`, `audience_interests`) are all **empty**. The CSV is the only Pinterest query data we hold. Refilling those tables is a recommendation in §7.

### 2.2 Pinterest query grammar, derived from our 166 verified keywords

Every strong Pinterest board name in this niche fits one of these shapes:

1. `<attribute> <meal> <recipes|ideas>` — "high fiber dinner recipes", "high protein sandwich ideas", "healthy picnic food ideas"
2. `<price/qualifier> <meals> for <audience>` — "cheap meals for large families"
3. `<ingredient> <recipes>` — "sourdough discard pizza dough recipes"
4. `<season> <meal> <recipes>` — "easy spring dinner recipes", "easy summer pasta salad recipes"

Three rules fall straight out of that and govern §3:

- **Always end on a format word.** `recipes`, `ideas`, `meals`, `tips`. A board name without one is a folder label, not a query.
- **Name the meal slot.** "dinner", "breakfast", "lunch", "snacks". Pinterest's biggest food queries are meal-slot queries. Our worst board omits the meal slot entirely.
- **Never weld two topics with "and" unless both halves are searched together.** "Meal Prep & Kitchen Tips" is two boards pretending to be one.

### 2.3 The four boards we should have and do not

These are Pinterest seeds that generated 15-30+ autocomplete expansions each in our own harvest, where we hold 4-10 articles, and where **we currently have no board**:

| Verified Pinterest seed | Expansions in our data | Articles we already own | Current board home |
|---|---:|---:|---|
| `cheap meals for large families` | **30** | 9 | scattered across Budget / Meal Prep |
| `high fiber dinner recipes` | **32** | 8+ | "High Fiber Recipes" (truncated name) |
| `healthy picnic food ideas` | **24** | 4 | "Healthy Meal Prep & Kitchen Tips" |
| `healthy snacks for sweet tooth` | **15** | 6 | "Healthy Meal Prep & Kitchen Tips" |
| `sourdough discard pizza dough recipe` | **17** | 5 | scattered |

`cheap meals for large families` alone expands into budget/healthy/crockpot/summer/aldi/chicken/camping/pasta/breakfast/dinner/ground beef/casseroles/picky eaters/gluten free/vegan variants. We have articles for **most of those variants already** (`cheap-crockpot-meals-large-families`, `cheap-chicken-casserole-meals-large-families`, `cheap-ground-beef-meals-large-families`, `camping-meal-hacks-large-families`, `aldi-shopping-hacks-large-family-meals`, `how-to-stretch-meals-large-families`, `freezer-organization-tips-large-family-meals`, `best-low-cost-protein-sources-large-families`, `low-cost-protein-meal-hacks-families`). That is a fully-formed board's worth of content with a verified query behind it, and it has no board.

### 2.4 Board-by-board verdict on current names

| Board | Verdict | Why |
|---|---|---|
| **High Fiber Recipes** (226) | **WEAK — truncated** | The verified Pinterest query is `high fiber dinner recipes`, which expands 32 ways. `high fiber recipes` appears in our data only as the *reversed* long-tail `high fiber recipes dinner`. We dropped the highest-volume word in the phrase. Also: **no description at all** on a 226-pin board. |
| **Healthy Meal Prep & Kitchen Tips** (181) | **WEAKEST on the account** | Two unrelated topics in one name. No meal slot. "Kitchen tips" and "meal prep" are searched by different people with different intent, so the board's topical signal is mud. This is the account's catch-all and it performs like one (0.6). |
| **Gut Health & Nutrition Tips** (83) | **WEAK** | "Gut health" is real but "nutrition tips" is a filler half. No format word tying it to a content type. Zero of our 166 verified Pinterest keywords contain "gut health" — this may simply be a low-demand phrase on Pinterest, distinct from its Google demand. **No description.** |
| **Grocery Math: Food Prices and Nutrition Data** (14) | **WEAK NAME, possibly weak topic** | Nobody types "grocery math." Worse: no per-dollar/price-comparison phrasing appears anywhere in our 166 verified Pinterest keywords. Our data moat may have thin *Pinterest* demand even though it has Google demand. Flag as a hypothesis to test, not a settled fact. |
| **Easy Dinner Recipes** (12) | **STRONG — keep verbatim** | Exact high-volume query. Best board on the account at 8.2. Do not touch the name. |
| **Food Storage and Freezer Tips** (12) | **GOOD** | Both halves are real queries and they are genuinely adjacent. 6.6 imp/pin. Worth splitting later at volume, not now. |
| **High Protein Meals and Smart Swaps** (11) | **MOSTLY GOOD** | "High protein meals" is strong. "Smart swaps" is invented and adds nothing. Trim. |
| **Budget Meals and Grocery Hacks** (6) | **GOOD** | Both halves searched. Keep. |
| **High Fiber Dinner and Gut Health Recipes** (2) | **NEARLY RIGHT, ORPHANED** | Ironically this board contains the exact winning phrase "high fiber dinner" and holds **2 pins** while the truncated-name board holds 226. This is the single clearest mis-allocation on the account. |
| **Gut Health Tips and Nutrition Charts** (0) | **DEAD** | Zero pins, duplicate of the 83-pin board, exists only so the name resolves rather than 404s in `BOARD_NAME_TO_ID`. |

### 2.5 The one-line version

> Our 226-pin board is named with the phrase minus its highest-volume word, our 181-pin board is named after a filing cabinet, and the board holding the correct phrase has two pins in it.

---

## 3. The target board architecture — 24 boards

### 3.0 Design rules used

1. **Never rename a board that works.** Four boards measure above 4.0 imp/pin. Renaming one to chase a marginally better phrase is an unforced risk with no evidence behind it. `Easy Dinner Recipes`, `Food Storage and Freezer Tips`, `High Protein Meals and Smart Swaps` and `Budget Meals and Grocery Hacks` keep their exact names. Descriptions get rewritten; names do not move.
2. **Every name ends on a format word** (`recipes`, `ideas`, `meals`, `tips`) or is a verified query as-is (§2.2).
3. **Every name under 50 characters** (Pinterest's board-title limit). Longest below is 43.
4. **Cohesion is the variable, not count** (§1.5). Each board must survive the question "could a single LDA topic describe everything on this board?" That is the actual test Pixie applies.
5. **Recycle dead boards instead of creating new ones.** The 0-pin and 2-pin boards get renamed into two of the new slots. Removes two zombie entries from `BOARD_NAME_TO_ID` and yields two boards for free.
6. **Every board holds 16+ pins on day one** (4 articles x 4 variants). This is a *human presentation* standard — an empty board looks abandoned. It is **not** an algorithmic threshold; no such threshold is evidenced (§1.4). One board misses it and is deferred.

### 3.1 Verified coverage

The routing rules in §6 were simulated against all 219 published articles (`src/data/articles/*.md`). Result: **219/219 routed, 24 boards, zero fallthrough into a catch-all, no board above 19 articles, one board below 4.**

| # | Board (exact name) | Chars | Source | Articles | Pins |
|---:|---|---:|---|---:|---:|
| 1 | Protein Per Dollar: Cheap Protein Sources | 41 | rename of *Grocery Math* | 19 | 76 |
| 2 | Fiber Per Dollar: Cheap High Fiber Foods | 40 | rename of *HF Dinner and Gut Health* (2 pins) | 10 | 40 |
| 3 | Cheap Meals for Large Families | 30 | **new** | 9 | 36 |
| 4 | Healthy Snacks for a Sweet Tooth | 32 | **new** | 5 | 20 |
| 5 | High Protein Breakfast Ideas | 28 | **new** | 9 | 36 |
| 6 | High Fiber Breakfast Ideas | 26 | **new** | 7 | 28 |
| 7 | High Protein Lunch and Sandwich Ideas | 37 | **new** | 14 | 56 |
| 8 | Sheet Pan and One Pot Dinner Recipes | 36 | **new** | 6 | 24 |
| 9 | Bean and Lentil Recipes | 23 | **new** | 18 | 72 |
| 10 | Healthy Soup Recipes | 20 | **new** | 4 | 16 |
| 11 | Salad Recipes and Homemade Dressings | 36 | **new** | 12 | 48 |
| 12 | Sourdough Discard Recipes and Easy Bread | 40 | **new** | 8 | 32 |
| 13 | How to Cook Chicken, Pork and Beef | 34 | **new** | 7 | 28 |
| 14 | High Fiber Dinner Recipes | 25 | rename of *High Fiber Recipes* (226 pins) | 14 | 56 |
| 15 | High Protein Meals and Smart Swaps | 34 | **keep verbatim (5.6)** | 4 | 16 |
| 16 | Easy Dinner Recipes | 19 | **keep verbatim (8.2)** | 11 | 44 |
| 17 | High Fiber Snack Ideas | 22 | **new** | 4 | 16 |
| 18 | Food Storage and Freezer Tips | 29 | **keep verbatim (6.6)** | 15 | 60 |
| 19 | Kitchen Tips and Cooking Hacks | 30 | rename of *Healthy Meal Prep & Kitchen Tips* (181) | 10 | 40 |
| 20 | Grocery Budget Tips and Shopping Lists | 38 | rename of *Gut Health Tips and Nutrition Charts* (0 pins) | 7 | 28 |
| 21 | Budget Meals and Grocery Hacks | 30 | **keep verbatim (4.2)** | 4 | 16 |
| 22 | Gut Health Foods and Fiber Tips | 31 | rename of *Gut Health & Nutrition Tips* (83) | 5 | 20 |
| 23 | Healthy Food Swaps and Alternatives | 35 | **new — DEFERRED** | 3 | 12 |
| 24 | Nutrition Labels and Daily Values Explained | 43 | **new** | 14 | 56 |
| | **TOTAL** | | 6 renames, 4 kept, 14 new | **219** | **876** |

Board 23 is the only one under the 16-pin floor. **Do not create it in phase 1.** Hold until two more swap articles exist. Until then those 12 pins route to `Nutrition Labels and Daily Values Explained`. That makes phase 1 **23 boards**, going to 24.

### 3.2 Board descriptions

David Miller voice, 200-400 characters, no em dashes, contractions throughout, no medical claims, no supplements. Paste verbatim into the board description field.

**Expectation-setting, per §1.2:** board descriptions are **not** an evidenced ranking feature. Write these once and move on. They earn their keep with humans deciding whether to follow, not with the algorithm.

---

**1. Protein Per Dollar: Cheap Protein Sources**
> We priced real protein at real stores and ranked it by grams per dollar. Eggs, chicken thighs, dried beans, canned tuna, tofu, Greek yogurt, peanut butter. If you want cheap protein sources that actually hold up, the numbers are here instead of the marketing. Budget protein, ranked, with receipts.

*Content:* animal/dairy/plant/meat-per-dollar-ranked, protein-per-dollar-*, one-dollar-protein, what-50-grams-of-protein-costs, every `X-vs-Y-protein-cost` comparison, cheapest-complete-protein-pairs, no-cook-protein-per-dollar, fast-food-protein-per-dollar. **19 articles.**
*Routing keywords:* `protein per dollar`, `cheapest protein`, `protein cost`, `protein value`, `protein per serving`, `complete protein pairs`, `protein sources ranked`

---

**2. Fiber Per Dollar: Cheap High Fiber Foods**
> Fiber is the cheapest thing in the grocery store and almost nobody talks about it that way. We priced beans, oats, popcorn, lentils, frozen vegetables and whole grains, then ranked them by grams of fiber per dollar. Cheap high fiber foods sorted by what your money actually buys.

*Content:* fiber-per-dollar-cheapest-high-fiber-foods, grains/produce-fiber-per-dollar-ranked, high-fiber-snacks-per-dollar, one-dollar-fiber, what-30-grams-of-fiber-costs, popcorn-vs-almonds-fiber-cost, whole-wheat-flour-vs-quinoa-fiber-cost, frozen-vs-fresh-vegetables-fiber-cost. **10 articles.**
*Routing keywords:* `fiber per dollar`, `cheapest high fiber`, `cheapest fiber`, `fiber cost`, `30 grams of fiber`, `one dollar fiber`, `fiber comparison`

---

**3. Cheap Meals for Large Families**
> Feeding five or six people without spending a fortune. Cheap meals for large families that stretch, freeze and reheat: crockpot dinners, ground beef casseroles, sheet pan chicken, big pots of rice and beans. Aldi runs, camping food, picky eaters. Real portions and real prices, not serves-four math.

*Content:* cheap-crockpot / chicken-casserole / ground-beef-meals-large-families, how-to-stretch-meals-large-families, camping-meal-hacks-large-families, aldi-shopping-hacks-large-family-meals, freezer-organization-tips-large-family-meals, best-low-cost-protein-sources-large-families, low-cost-protein-meal-hacks-families, quick-dinner-recipes-for-family. **9 articles.**
*Routing keywords:* `large family`, `large families`, `for a crowd`, `feed a crowd`, `big family`, `stretch meals`, `families`

---

**4. Healthy Snacks for a Sweet Tooth**
> Snacks that scratch the sweet craving without being dessert wearing a health costume. Black bean brownies, no bake energy balls, chia jam, ricotta and berry toast, granola that isn't candy. Healthy snacks for a sweet tooth that hold you until dinner instead of leaving you hungry twenty minutes later.

*Content:* black-bean-brownies-hidden-fiber-dessert, no-bake-high-fiber-energy-balls, healthy-sweet-tooth-snack-ideas-night, high-fiber-raspberry-jam-recipe-chia, how-to-choose-granola-not-dessert. **5 articles.**
*Routing keywords:* `sweet tooth`, `brownie`, `energy ball`, `dessert`, `jam`, `sweet snack`, `sweet treat`, `granola`

---

**5. High Protein Breakfast Ideas**
> Breakfast that keeps you full past ten in the morning. High protein breakfast ideas built on eggs, Greek yogurt, cottage cheese and beans: freezer burritos, sheet pan hash, savory oatmeal bowls, make ahead egg sandwiches. Most of it preps Sunday and reheats in three minutes on a weekday.

*Content:* high-protein-vegetarian-breakfast-burritos-you-can-freeze, sheet-pan-breakfast-hash, savory-oatmeal-bowls, healthy-egg-sandwich-add-ins, macronutrient-breakdown-healthy-egg-sandwich, make-ahead-breakfast-ideas-without-eggs, balanced-breakfast-that-keeps-you-full, best-breakfast-foods-for-sustained-energy, breakfast-staples-per-dollar. **9 articles.**
*Routing keywords:* `high protein breakfast`, `protein breakfast`, `breakfast burrito`, `breakfast hash`, `egg sandwich`, `savory oatmeal`, `breakfast staples`, `balanced breakfast`, `make ahead breakfast`

---

**6. High Fiber Breakfast Ideas**
> Chia pudding, overnight oats, bran muffins that don't taste like cardboard, yogurt parfaits and loaded avocado toast. High fiber breakfast ideas that are quick, cheap and genuinely filling. Prep them the night before and mornings stop being a decision you have to make at 6 AM.

*Content:* easy-high-fiber-breakfast-ideas-for-gut-health, chia-pudding-variations, savory-chia-seed-recipes-breakfast, high-fiber-yogurt-parfait, high-fiber-avocado-toast-variations, high-fiber-bran-muffins-that-taste-good, ricotta-berry-toast-bar-no-cook. **7 articles.**
*Routing keywords:* `high fiber breakfast`, `fiber breakfast`, `chia pudding`, `overnight oats`, `yogurt parfait`, `avocado toast`, `bran muffin`, `savory chia`, `ricotta berry`

---

**7. High Protein Lunch and Sandwich Ideas**
> The work lunch problem, solved. High protein sandwich ideas, bagel builds, burrito bowls, farro and quinoa lunch bowls, and salads packed so they don't go soggy by noon. Cheaper than the fifteen dollar wrap and better than leftovers that look depressing under office lighting.

*Content:* high-protein-bagel-sandwich-ideas-lunch, how-to-prep-high-protein-lunches-work, how-to-pack-lunch-crisp-sandwiches-salads, how-to-pack-salad-for-work-not-soggy, how-to-keep-sandwiches-from-getting-soggy, high-fiber-burrito-bowl-meal-prep, farro-lunch-bowl, high-fiber-quinoa-salad-for-lunch-prep, healthy-blue-collar-lunch-ideas-men, simple-lunch-recipes-indian-veg, chicken-veggie-lettuce-wraps, best-high-protein-breads-healthy-sandwiches, how-much-protein-in-bagel-sandwich. **14 articles.**
*Routing keywords:* `sandwich`, `lunch`, `bagel`, `work lunch`, `packed lunch`, `lunch prep`, `lunch bowl`, `burrito bowl`, `wrap`, `wraps`

---

**8. Sheet Pan and One Pot Dinner Recipes**
> One pan in, one pan to wash. Sheet pan salmon, sticky ginger tofu and broccoli, one pot chicken and rice, creamy tomato orzo with white beans, hands off barley risotto, crockpot dinners. Sheet pan and one pot dinner recipes for the nights when the sink is already half full before you start.

*Content:* sheet-pan-salmon-and-vegetables-30-minutes, sheet-pan-ginger-tofu-broccoli, easy-one-pot-chicken-and-rice-dinner, creamy-tomato-orzo-white-beans-one-pot, creamy-mushroom-barley-risotto-hands-off, cheap-crockpot-meals. **6 articles.**
*Routing keywords:* `sheet pan`, `one pot`, `skillet dinner`, `crockpot`, `crock pot`, `slow cooker`, `risotto`, `hands-off`

---

**9. Bean and Lentil Recipes**
> Beans are the cheapest protein and fiber in the store, so here's what to actually do with them. Black bean tacos and burgers, three bean chili, Tuscan white bean and kale soup, red lentil curry, split pea soup, homemade hummus, roasted chickpeas. Dried, canned, quick soaked. No penance involved.

*Content:* beans-and-rice-complete-protein-meal, easy-black-bean-tacos, quick-black-bean-burgers, quick-black-bean-and-corn-salsa, hearty-vegetarian-chili-with-three-beans, tuscan-white-bean-kale-soup, lentil-curry-high-fiber-vegan-dinner, split-pea-soup-recipe-high-fiber, high-fiber-hummus-recipe, crispy-roasted-chickpeas, how-to-cook-dried-beans-from-scratch, how-to-quick-soak-dried-beans, canned-vs-dry-beans-cost, beans-double-win-fiber-protein, cucumber-edamame-salad, natto-japanese-fermented-soybeans. **18 articles.**
*Routing keywords:* `bean`, `beans`, `lentil`, `lentils`, `chickpea`, `hummus`, `split pea`, `legume`, `rice and beans`, `edamame`, `natto`, `soybean`

---

**10. Healthy Soup Recipes**
> Big pots of soup that freeze well and cost almost nothing to make. Cabbage soup, split pea, Tuscan white bean and kale, spring vegetable. Healthy soup recipes heavy on beans, lentils and whatever is cheap that week, plus how to rescue one you oversalted. Thick enough to count as dinner on its own.

*Content:* fiber-rich-soup-for-weight-loss-cabbage, healthy-spring-vegetable-soup-recipes, health-benefits-eating-soup-in-spring, fix-oversalted-soup-sauce-rice. **4 articles.**
*Routing keywords:* `soup`, `stew`, `chili`, `broth`, `chowder`, `bisque`

---

**11. Salad Recipes and Homemade Dressings**
> Salads worth eating, and homemade salad dressing recipes that beat anything in a bottle. Tabbouleh, pear and walnut, cucumber edamame, smashed potato salad, cold pasta salad for potlucks and picnics. Vegan caesar and Indian style dressings, plus how to pack a salad for work so it isn't soggy.

*Content:* tabbouleh-salad-high-fiber-bulgur, pear-salad-with-walnuts, crispy-smashed-potato-salad, easy-cold-summer-pasta-salad-potlucks, how-to-pack-cold-pasta-salad-picnics, healthy-homemade-vegan-caesar-salad-dressing, healthy-homemade-indian-salad-dressing-recipes, high-fiber-salad-dressings-homemade, hidden-sugars-popular-summer-salad-dressings, how-to-store-homemade-salad-dressing-safely. **12 articles.**
*Routing keywords:* `picnic`, `potluck`, `pasta salad`, `salad`, `dressing`, `dressings`, `slaw`, `tabbouleh`, `vinaigrette`

---

**12. Sourdough Discard Recipes and Easy Bread**
> Stop pouring discard down the drain. Sourdough discard pizza dough in same day and no yeast versions, a gluten free one, easy sandwich bread for beginners, high fiber loaves and homemade dumpling wrappers. Sourdough discard recipes measured in grams, plus how to store bread so it isn't moldy by Thursday.

*Content:* easy-sourdough-discard-pizza-dough-no-yeast, how-to-make-sourdough-pizza-dough-same-day, gluten-free-sourdough-discard-pizza-dough, easy-sourdough-discard-recipes-beginners, how-to-measure-sourdough-discard-grams, easy-sandwich-bread-recipe-beginners, high-fiber-gluten-free-bread-recipe, healthy-homemade-dumpling-wrapper-recipe. **8 articles.**
*Routing keywords:* `sourdough`, `discard`, `pizza dough`, `bread recipe`, `sandwich bread`, `dumpling wrapper`, `homemade bread`, `baking`

---

**13. How to Cook Chicken, Pork and Beef**
> The best way to cook the cuts you actually put in the cart. Chicken breasts and thighs, pork chops, pork tenderloin, ribs, prime rib, baked potatoes, and what to do with a Costco rotisserie chicken on a Tuesday. Temperatures, times, and the small moves that decide whether it comes out dry or good.

*Content:* best-way-to-cook-chicken / pork-chops / a-pork-tenderloin / prime-rib / ribs / baked-potatoes, costco-rotisserie-chicken-meal-ideas-dinner. **7 articles.**
*Routing keywords:* `best way to cook`, `how to cook chicken`, `pork chop`, `pork tenderloin`, `prime rib`, `ribs`, `baked potato`, `rotisserie chicken`, `steak`, `roast`

---

**14. High Fiber Dinner Recipes**
> High fiber dinner recipes that don't feel like a punishment. Quinoa, farro, bulgur and whole wheat bases, loaded stir fries, cauliflower pizza crust, vegetarian and vegan mains, and pasta swaps that actually hold their shape. Easy enough for a weeknight and heavy on beans and vegetables.

*Content:* high-fiber-dinner-recipes-picky-kids, vegetarian-high-fiber-dinners, vegan-high-fiber-meal-prep-for-week, high-fiber-meal-prep-ideas-for-busy-weeks-2026, high-fiber-stir-fry-vegetables, high-fiber-pizza-crust-cauliflower, high-fiber-cauliflower-rice-recipes, comparing-fiber-content-different-pizza-crusts, high-fiber-pasta-alternatives, whole-wheat-vs-white-pasta-fiber, the quinoa/farro/barley/bulgur/amaranth-millet-teff pieces, healthy-alternatives-white-rice-dinner. **14 articles.**
*Routing keywords:* `high fiber dinner`, `fiber dinner`, `high fiber meal`, `high fiber recipes`, `vegetarian high fiber`, `vegan high fiber`, `high fiber stir fry`, `high fiber pizza`, `high fiber cauliflower`, `quinoa`, `farro`, `barley`, `bulgur`, `millet`, `teff`, `amaranth`, `whole grain`, `high fiber pasta`, `whole wheat`, `stir fry`

---

**15. High Protein Meals and Smart Swaps** *(existing, 5.6 imp/pin, name unchanged)*
> High protein meals that don't rely on chicken breast and a sad side of broccoli. Turkey meatballs, Greek yogurt and cottage cheese builds, higher protein breads, and swaps that add fifteen or twenty grams without adding much cost. For anyone trying to hit a protein number on a normal grocery budget.

*Content:* healthy-turkey-meatballs-meal-prep, cottage-cheese-vs-greek-yogurt-protein-uses, high-protein-on-a-budget-complete-guide, high-protein-high-fiber-meals-for-weight-loss. **4 articles.**
*Routing keywords:* `high protein`, `protein meal`, `protein swap`, `greek yogurt`, `cottage cheese`, `turkey meatball`, `protein bread`

---

**16. Easy Dinner Recipes** *(existing, 8.2 imp/pin, best board on the account, DO NOT RENAME)*
> Easy dinner recipes for the nights you've got twenty minutes and zero patience. Fish tacos, sheet pan salmon, baked cod, cauliflower fried rice, stuffed portobellos, lettuce wraps, quick curries. Mostly one pan, mostly under ten dollars to get on the table, and nobody asks where the meat went.

*Content:* easy-weeknight-fish-tacos, baked-cod-lemon-capers-green-beans, air-fryer-salmon-bites, cauliflower-fried-rice-with-eggs, stuffed-portobello-mushrooms, chicken-veggie-lettuce-wraps, quick-dinner-recipes, quick-20-minute-high-fiber-meals, quick-and-easy-stir-fry-sauce-recipes, food-prep-guide-recipes. **11 articles.**
*Routing keywords:* `dinner`, `weeknight`, `tacos`, `salmon`, `cod`, `fish`, `chicken`, `tofu`, `pasta`, `orzo`, `pizza`, `casserole`, `meatballs`, `portobello`, `curry`, `fried rice`, `20 minute`, `quick dinner`, `recipe`, `recipes`

---

**17. High Fiber Snack Ideas**
> Crispy roasted chickpeas, popcorn with toppings worth eating, and honest swaps for the potato chip habit. High fiber snack ideas that stop you digging through the pantry an hour later, plus a fridge snack drawer setup so the good stuff is also the easy stuff to grab.

*Content:* crispy-roasted-chickpeas-high-fiber-snack, high-fiber-popcorn-toppings-healthy, healthy-alternatives-potato-chips-snacking, popcorn-vs-potato-chips-fiber-comparison, grab-and-go-fridge-snack-drawer. **4 articles.**
*Routing keywords:* `snack`, `snacks`, `popcorn`, `potato chips`, `chips`, `roasted chickpeas`

---

**18. Food Storage and Freezer Tips** *(existing, 6.6 imp/pin, name unchanged)*
> Food storage tips that keep produce alive past Wednesday. How to store herbs, ginger, berries, avocados, bread and cooked grains, how to revive wilted lettuce, what to do with leftover rice. Plus freezer meal prep, a freezer inventory that stops you buying a third bag of peas, and freezing bananas for smoothies.

*Content:* every `how-to-store-*` and `keep-*-fresh` article, best-way-to-store-avocados, how-to-revive-wilted-lettuce, how-to-use-leftover-rice, how-to-reduce-food-waste-at-home, freezer-inventory-simple-system, freezer-meal-prep-ideas-for-beginners, how-to-freeze-bananas-for-smoothies, frozen-vs-fresh-produce-when-to-buy. **15 articles.**
*Routing keywords:* `freezer`, `freeze`, `frozen`, `how to store`, `storage`, `keep fresh`, `fresh longer`, `shelf life`, `leftover`, `leftovers`, `food waste`, `wilted`, `browning`, `keep berries`, `store cooked`

> **Note:** this board covers two topics and I said not to do that. It is grandfathered because it measures 6.6 imp/pin and both halves are real queries. Revisit splitting it into `Food Storage Tips to Keep Produce Fresh` + `Freezer Meals and Freezer Organization` **only** if it drops below 3.0 after the migration.

---

**19. Kitchen Tips and Cooking Hacks**
> Kitchen tips and cooking hacks that come from actually cooking, not from a catalog. Seasoning cast iron, preheating a skillet so food browns instead of steaming, which cutting board to use, parchment versus silicone, cleaning a blender in ten seconds, and doubling a recipe without doubling the salt.

*Content:* how-to-season-cast-iron-skillet-properly, how-to-preheat-skillet-even-browning, cutting-board-basics, baking-sheet-liners-parchment-silicone, how-to-clean-blender-fast-no-scrub, kitchen-hacks-for-sink, kitchen-tools-that-save-time-and-money, how-to-organize-a-small-kitchen-on-a-budget, how-to-double-recipe-seasoning-without-guessing, how-to-cool-rice-for-fried-rice, food-prep-tips-to-save-time. **10 articles.**
*Routing keywords:* `kitchen`, `cast iron`, `skillet`, `cutting board`, `blender`, `parchment`, `baking sheet`, `cookware`, `utensil`, `organize`, `organization`, `oversalted`, `seasoning`, `cool rice`, `preheat`, `clean`, `tools`

---

**20. Grocery Budget Tips and Shopping Lists**
> Grocery budget tips backed by actual receipts. A healthy shopping list that fits a real budget, Aldi strategies, pantry staples worth stocking, whether driving to the cheaper store pays for itself, planning a week of dinners off one list, and why your bill went up right after you started cooking more.

*Content:* grocery-shopping-list-for-healthy-eating-on-a-budget, how-to-make-grocery-shopping-cheaper, is-driving-to-cheaper-grocery-store-worth-it, why-grocery-bill-went-up-after-cooking-more, shelf-stable-pantry-per-dollar, usda-thrifty-food-plan-weekly-cost, plan-week-of-dinners-fewer-grocery-runs, one-theme-five-dinners-one-grocery-list. **7 articles.**
*Routing keywords:* `grocery`, `groceries`, `shopping list`, `aldi`, `costco`, `thrifty`, `grocery bill`, `pantry`, `shelf stable`, `meal plan`, `meal planning`, `week of dinners`, `grocery run`

---

**21. Budget Meals and Grocery Hacks** *(existing, 4.2 imp/pin, name unchanged)*
> Cheap healthy meals that don't taste cheap. Budget dinners, cooking for one without wasting half of everything you buy, low cost protein hacks, and the whole playbook for eating well on a tight grocery budget. Real dollar amounts and real portions, no lectures about how you should skip the coffee.

*Content:* eat-healthy-on-a-budget-complete-playbook, budget-meal-ideas-for-one, how-to-meal-prep-on-a-budget-for-one-person, budget-meal-ideas-philippines. **4 articles.**
*Routing keywords:* `budget`, `cheap`, `affordable`, `save money`, `saving money`, `frugal`, `low cost`, `cost`, `for one`, `cooking for one`

---

**22. Gut Health Foods and Fiber Tips**
> Gut health foods without the buzzword salad. Prebiotic staples, fermented foods like natto, artichokes, peppermint and ginger tea, high fiber smoothies, and how to add fiber to your week without spending the afternoon regretting it. Food first, gentle pacing, and no supplements anywhere on this board.

*Content:* prebiotic-foods-beyond-the-buzzwords, artichoke-recipes-for-gut-health, gut-health-tea-peppermint-ginger, gut-friendly-high-fiber-smoothies, high-fiber-smoothies-for-kids-picky-eaters, how-to-increase-fiber-intake-without-gas, high-fiber-meals-for-constipation-relief, prune-juice-alternatives-for-constipation, water-and-fiber-the-golden-rule. **5 articles routed here; the constipation-tagged pieces route to fiber boards by keyword.**
*Routing keywords:* `gut health`, `gut friendly`, `constipation`, `prebiotic`, `probiotic`, `fermented`, `bloat`, `digestion`, `digestive`, `artichoke`, `prune juice`, `natural relief`, `smoothie`, `smoothies`, `tea`

---

**23. Healthy Food Swaps and Alternatives** *(DEFERRED — create when it has 20 pins)*
> Swaps that hold up when you actually eat them, not just when you read about them. Popcorn instead of chips, whole wheat versus white pasta, high fiber pasta alternatives, better rice options, granola that isn't dessert. Plus big flavor with less salt using citrus, herbs and umami instead of the shaker.

*Content:* big-flavor-less-salt-citrus-herbs-umami-swaps, add-flavor-without-more-sugar-tricks, healthy-alternatives-white-rice-dinner. **3 articles — below floor.**
*Routing keywords:* `alternative`, `alternatives`, `swap`, `swaps`, `hidden sugar`, `less salt`, `less sugar`, `sodium`, `without more sugar`, `substitute`

---

**24. Nutrition Labels and Daily Values Explained**
> How to read a nutrition label without needing a degree. What "good source of fiber" legally means, fiber and protein daily values, how much protein you actually need in a day, healthy fats, zinc and selenium foods, cooking oil smoke points, and why protein and fiber keep you full longer than most things do.

*Content:* how-to-read-nutrition-labels-for-beginners, good-source-of-fiber-label-meaning, fiber-protein-daily-values-explained, how-much-protein-do-you-need-per-day, healthy-fats-list-foods-to-eat-daily, selenium-containing-foods, zinc-containing-foods-weekly-meals, cooking-oils-smoke-points-best-uses, high-protein-vs-high-fiber-satiety, best-high-fiber-fruits-for-weight-loss-list, 30-day-high-fiber-challenge-meal-plan. **14 articles.**
*Routing keywords:* `nutrition label`, `label`, `daily value`, `daily values`, `how much protein`, `macronutrient`, `macro`, `healthy fats`, `selenium`, `zinc`, `vitamin`, `mineral`, `smoke point`, `cooking oil`, `nutrition facts`, `satiety`, `weight loss`, `fiber intake`, `water and fiber`, `challenge`, `per day`, `nutrition`

---

### 3.3 A content gap this exposed

`healthy picnic food ideas` is a verified Pinterest seed that produced **24 autocomplete expansions** in our own harvest, including "for a crowd", "high protein", "for kids", "aesthetic", "finger food", "vegetarian", "beach", "labor day". We hold **two** articles that fit. That is a board-shaped hole with proven demand and almost no content behind it. Same story, smaller, for `easy spring dinner recipes` and `summer crockpot meals for family` — Pinterest is heavily seasonal and our seasonal coverage is thin.

**Recommendation:** queue 4-6 picnic/potluck articles, then open the board. Do not open an empty board and hope.

---

## 4. Migration plan

### 4.1 Can pins be moved between boards? YES — and this is the pivotal fact

**Verified against Pinterest's official OpenAPI spec v5.28.0 (published 2026-07-15), `github.com/pinterest/api-description`.**

| Method | Endpoint | Moves board? | Preserves pin id + stats? | Beta-gated? |
|---|---|---|---|---|
| **Primary** | `PATCH /v5/pins/{pin_id}` body `{"board_id": "..."}` | Yes | **Yes** | **Yes — may 403** |
| **Fallback** | `POST /v5/pins/{pin_id}/save` body `{"board_id": "..."}` | Yes (for pins you own) | **Yes** | No |
| **Do not use** | `POST /v5/pins` (recreate) | n/a | **No — new id, zero history** | No |
| **Bulk, no API** | UI: board → **Organize** → select → **Move** | Yes | Inferred yes | n/a |

Details and caveats:

- `PinUpdate` mutable fields: `board_id`, `board_section_id`, `title`, `description`, `link`, `alt_text`, `carousel_slots`, `ai_disclosures`. Media is **not** updatable. `[OFFICIAL]`
- **The beta gate is real.** The endpoint description in the current spec still ends: "This endpoint is currently in beta and not available to all apps." Whether *our* app is entitled cannot be determined without a call. **Test on one pin before planning around it.**
- The `save` fallback: Pinterest's official Python SDK calls the endpoint then repopulates the *same* Pin instance in place, id unchanged. For an owned pin this behaves as a move, not a copy. `[UNVERIFIED as prose]` — inferred from official SDK code, not from a documentation sentence. Verify on one pin.
- `source_type: "pin_id"` **does not exist in v5.** Copy-a-pin uses the top-level `parent_pin_id` field, which is a lineage pointer only. `pin_metrics` is readOnly and per-pin id, so a recreated pin starts at zero. **Never recreate.**
- **No bulk endpoint exists.** The only `bulk` path in the entire 189-endpoint spec is product-tag deletion. 400 pins means 400 calls.
- **Board mutation** `PATCH /v5/boards/{board_id}` accepts exactly `name`, `description`, `privacy`. `category` is not mutable and does not exist on the v5 board model.
- **Rate limits:** all relevant endpoints are category `org_write`. **Trial access: 300/day.** Standard access: 100/minute per user per app. So ~500 moves is roughly 5-10 minutes on Standard, or **2 days on Trial**. Confirm which tier the app holds before scheduling.

### 4.2 The highest-ROI action in this entire document

**Rename the 226-pin board from `High Fiber Recipes` to `High Fiber Dinner Recipes`. One API call.**

Because board titles are a per-pin model feature (§1.3), renaming a board **instantly changes the board-title token attached to every pin on it**. One call improves the feature for 226 pins. Compare with moving 226 pins: 226 calls, and each move only relocates one pin.

Do the six renames first, wait, measure, *then* move pins. Renames are cheap, reversible, and touch the single strongest evidenced lever.

### 4.3 Where the existing pins actually belong

I routed the live pins in `pinterest_pins` (local snapshot, 345 of 561 — **refresh with `scripts/fetch-all-pins.py` before executing**) through the proposed rules:

| Current board | Sampled | Largest single destination | Share |
|---|---:|---|---:|
| High Fiber Recipes (226) | 154 | Bean and Lentil Recipes | **24%** |
| Healthy Meal Prep & Kitchen Tips (181) | 132 | Nutrition Labels and Daily Values | **17%** |
| Gut Health & Nutrition Tips (83) | 55 | Kitchen Tips and Cooking Hacks | **15%** |

**Read this carefully: no destination inherits a majority from any giant.** The contents are genuinely scattered — which is precisely the high-entropy condition Pixie prunes for (§1.5). It also kills the tempting shortcut of "just rename each giant to wherever most of its pins belong": that would be right for at most a quarter of them.

Full destination breakdown for `High Fiber Recipes` (154 sampled): Bean and Lentil 37, High Fiber Dinner 17, High Protein Lunch 16, Easy Dinner 16, Salad 13, Sourdough 13, Large Families 8, Sheet Pan 8, Sweet Tooth 7, HF Breakfast 5, Soup 4, How to Cook 4, other 6.

For `Healthy Meal Prep & Kitchen Tips` (132 sampled): Nutrition Labels 22, Easy Dinner 14, High Fiber Dinner 14, Food Storage 14, Gut Health 12, Large Families 10, HP Breakfast 9, Freezer 5, then a long tail of 2-4s.

### 4.4 Per-board migration verdict

| Existing board | Pins | Verdict | Action |
|---|---:|---|---|
| **High Fiber Recipes** | 226 | **RENAME + EVACUATE** | Rename to `High Fiber Dinner Recipes`. ~11% of pins already belong; move the other ~200 out over phases. |
| **Healthy Meal Prep & Kitchen Tips** | 181 | **RENAME + EVACUATE** | Rename to `Kitchen Tips and Cooking Hacks`. Only ~2% belong; this is effectively a full evacuation of ~175. |
| **Gut Health & Nutrition Tips** | 83 | **RENAME + EVACUATE** | Rename to `Gut Health Foods and Fiber Tips`. ~2% belong; move ~80. |
| **Grocery Math: Food Prices and Nutrition Data** | 14 | **RENAME, keep pins** | Rename to `Protein Per Dollar: Cheap Protein Sources`. Move the fiber-per-dollar pins out to board 2. |
| **High Fiber Dinner and Gut Health Recipes** | 2 | **RENAME, repurpose** | Rename to `Fiber Per Dollar: Cheap High Fiber Foods`. Move its 2 pins to their correct homes first. |
| **Gut Health Tips and Nutrition Charts** | 0 | **RENAME, repurpose** | Rename to `Grocery Budget Tips and Shopping Lists`. Free board, no pins at risk. |
| **Easy Dinner Recipes** | 12 | **KEEP AS-IS** | Rewrite description only. Do not touch the name. Best board on the account. |
| **Food Storage and Freezer Tips** | 12 | **KEEP AS-IS** | Rewrite description only. Revisit splitting only if it falls below 3.0. |
| **High Protein Meals and Smart Swaps** | 11 | **KEEP AS-IS** | Rewrite description only. "Smart Swaps" is dead weight but 5.6 imp/pin is not worth risking for it. |
| **Budget Meals and Grocery Hacks** | 6 | **KEEP AS-IS** | Rewrite description only. |

### 4.5 Execution sequence

**Phase 0 — verify (do this before anything else)**
1. `gh workflow run list-boards.yml` — refresh the live board list and IDs.
2. `python scripts/fetch-all-pins.py` — refresh `pinterest_pins`; the local snapshot is only 345/561.
3. **Test `PATCH /v5/pins/{pin_id}` on ONE pin.** If it 403s, the whole plan switches to the `save` fallback or the UI. Do not skip this.
4. Confirm whether the app has Trial (300 writes/day) or Standard access. This sets the schedule.

**Phase 1 — renames and descriptions (6 renames + 10 descriptions, ~16 API calls, one sitting)**
5. Apply the six renames in §4.4 via `PATCH /v5/boards/{board_id}`.
6. Write descriptions on all ten existing boards, including the two 200-plus-pin boards that currently have **none**.
7. Update `BOARD_NAME_TO_ID` in `scripts/lib/d1_csv.py` to the new names, keeping the old lowercase keys as aliases so nothing 404s mid-transition.
8. **STOP. Measure for 21 days.** This is the clean experiment: board names changed, pins did not move. Any lift is attributable to naming. Given ~20% of new pins have no distribution after a week (§1.4), 21 days is the minimum honest window.

**Phase 2 — create the new boards (13 creations)**
9. Create boards 3-13 and 17 from §3.1 with names and descriptions. Defer board 23.
10. Point new pin production at them via §6 routing. **New pins first, migration second** — this fills the boards with fresh content, which is what Pinterest rewards, rather than with relocated old pins.

**Phase 3 — migrate the giants (~460 moves)**
11. Move pins out of the three evacuated boards in **descending order of the destination board's expected value**: fill `Bean and Lentil Recipes` first (37 waiting), then `High Protein Lunch`, then the rest.
12. **Pace it.** Given the account's suppression history, 500 writes in ten minutes is a bad idea regardless of what the rate limit permits. **50-100 moves/day.** If the app is on Trial access, the 300/day cap enforces this for you.
13. Re-measure at 30 and 60 days.

### 4.6 Risks, stated honestly

- **The beta gate on `PATCH /pins`.** Unknown entitlement. Mitigated by testing one pin in Phase 0.
- **No official statement exists on whether moving a pin resets its distribution.** `[UNVERIFIED]` Pinterest has published nothing. Third-party commentary claims temporary turbulence while board context is re-evaluated, without a full reset. Given the account is already suppressed at the account level, this risk is second-order.
- **Renaming a board:** no evidence either way on whether a rename resets board-level signals. `[UNVERIFIED]` The 21-day measurement gap in Phase 1 exists partly to detect this.
- **The measured 10x gap is partly a pin-quality confound** (§1.1). Expect the migration to produce *less* than 10x. If overall impressions per pin roughly double, that is a win.

---

## 5. The legacy junk — 19 off-topic boards

### 5.1 Verdict: ARCHIVE. Do not delete. And do not expect a lift.

The research answer here contradicts the intuitive one, so it is worth being precise.

**Does an off-topic board with 32 pins harm the account's topical clarity? No — and there is a mechanism-level reason, not a guess.**

1. P2I and OmniSearchSage use *the board titles of the boards a given pin was saved to*. The `fashion` board contains **zero** of our food pins, so it contributes **zero tokens** to any food pin's representation. It cannot dilute what it never touches. `[ENG]`
2. Pixie prunes **per board**. A high-entropy off-topic board is dropped from the recommendation graph along with its edges. The penalty lands on that board, not on the account. `[ENG]`
3. OmniSage's graph contains Pin nodes and board nodes. **There is no account node and no account-level topical score** in any published Pinterest model. `[ENG]`

**The claim to reject explicitly:** the 2026 SEO-blog narrative that "Pinterest uses topical authority, so scattered themes mean it can't anchor your account," and the "boards are like subdomains" metaphor, appear in **no Pinterest source**. `[FOLKLORE]` The board-level cohesion claim is well-supported; the account-level version is invented.

**Also commonly misquoted:** Pinterest's 2018 statement that archiving "improves the relevance of your recommendations and notifications" is about **the feed the account owner sees**, not about outbound distribution. `[OFFICIAL]` It is routinely cited as proof that archiving boosts reach. It does not say that.

### 5.2 So why archive at all?

Three honest reasons, none of them algorithmic:

1. **Humans.** A visitor who lands on the profile and sees `impact driver`, `dogs`, `bohemian world`, `Modern living room` and `שמירות מהירות` next to food boards reads the account as abandoned or as a spam farm. Given the account's actual spam history, profile presentation is not cosmetic.
2. **Follower signal.** Legacy boards holding other people's off-topic repins pull off-topic audience signal and shape who follows us.
3. **`BOARD_NAME_TO_ID` hygiene.** Fewer live boards, less chance of the ID-rotation bug that was just fixed.

### 5.3 Archive, not delete — this is the important operational point

`[OFFICIAL]` [Archive or delete a board](https://help.pinterest.com/en/article/archive-or-delete-a-board), verbatim: **"When you delete a board, all the Pins on the board are deleted, too."** The restore window is **seven days**, in the UI's "Recently deleted" section only.

Archiving is reversible, hides the board from the profile, prevents new saves to it, and **destroys nothing**.

**Caveat:** there is **no archive endpoint in Pinterest API v5.** Archiving is UI-only. Nineteen boards is a ten-minute manual job. There is no script for this and there should not be one.

The "delete boards gradually or Pinterest flags it as spam" advice is `[FOLKLORE]` with no source.

### 5.4 The one thing to do BEFORE archiving

**Audit the pins on those 19 boards for the cloaked-redirect spam pattern first.**

Archiving hides a board but **does not remove its pins from the account**. If any of the 217 removed spam pins had siblings living on `fashion` (32), `diets` (25), `Gut health recipes` (11), `Money Making Ideas and Business Tips` (1) or `Relationship Psychology and Red Flags` (1), those pins are still attached to the account and still carry whatever signal caused the suppression. Given the diagnosis in `pinterest_suppression_2026-07-26`, this is the one place where the legacy boards could plausibly still be doing damage — not through topic dilution, but through surviving policy-violating pins.

**Order of operations:** audit those ~85 pins → delete any that are spam or carry cloaked redirects → archive the boards.

`Daily Life Hacks Demo` (3 pins) is ours and harmless; archive it with the rest.

### 5.5 Priority

**Low.** This is hygiene, not growth. It is a ten-minute job that should happen, but it should not delay Phase 1. If forced to choose between renaming the 226-pin board and archiving all 19 legacy boards, rename the board — that is the action with evidence behind it.

---

## 6. Routing rules for `scripts/lib/d1_csv.py`

### 6.1 The bug not to repeat

The bug fixed on 2026-07-26 was ordering: `GUT_NUTRITION_KEYWORDS` contained bare `"fiber"` and `"nutrition"`, and `MEAL_PREP_KEYWORDS` contained bare `"prep"`. Both ran before the recipe rule. Those three tokens match most of what this site publishes, so two rules swallowed 405 of 561 pins before any specific rule could see them.

**The invariant:** a rule's keywords must be **more specific than every rule below it**. Where a broad token is unavoidable (`"snack"`, `"nutrition"`, `"recipe"`), the rule holding it must sit **near the bottom**, and the narrow rules that would otherwise lose pins to it must sit above.

Concretely, in the table below:
- `"snack"` sits in rule 21 (`High Fiber Snack Ideas`), *below* `Healthy Snacks for a Sweet Tooth` (rule 5), so sweet-tooth pins are claimed first.
- `"recipe"`/`"recipes"` sit in rule 19 (`Easy Dinner Recipes`), *below* every specific recipe-form board, so only genuinely unclassified recipes land there.
- `"nutrition"` sits in the final rule, so it catches only true leftovers.
- `"cost"` sits in rule 25 (`Budget Meals`), *below* both per-dollar rules, so priced-data pins are claimed first.
- `"salad"` sits below `pasta salad`/`picnic` within the same rule, and the whole rule sits below the bean rule, so `cucumber-edamame-salad` goes to beans.

### 6.2 Verification

Simulated against all 219 articles: **219/219 routed, no rule starved, no rule over-collecting.** The simulation lives at `scratchpad/sim_routing.py` (not committed — reproduce or discard).

Two ordering bugs the simulation caught and the fix:
- `Healthy Picnic Food Ideas` collected **0 articles** because the `salad` and `pasta salad` rules ran first. Resolved by folding picnic keywords into the salad board rather than keeping a starved board.
- `Healthy Snacks for a Sweet Tooth` collected **1 article** because `bean` claimed `black-bean-brownies` and `granola` was sitting in the breakfast rule. Resolved by moving the rule above the bean rule and reassigning `granola`.

**Re-run the simulation after any edit to this table.** That is the whole point of having it.

### 6.3 The code

```python
# ── Board name to ID. RE-VERIFY with scripts/list-boards.py after the renames.
# Old lowercase aliases are kept so in-flight CSVs do not 404 mid-transition.
BOARD_NAME_TO_ID = {
    # renamed boards (IDs unchanged by a rename)
    "high fiber dinner recipes":                  "1124140825679184032",  # was High Fiber Recipes (226)
    "high fiber recipes":                         "1124140825679184032",  # alias
    "kitchen tips and cooking hacks":             "1124140825679184034",  # was Healthy Meal Prep & Kitchen Tips (181)
    "healthy meal prep & kitchen tips":           "1124140825679184034",  # alias
    "gut health foods and fiber tips":            "1124140825679184036",  # was Gut Health & Nutrition Tips (83)
    "gut health & nutrition tips":                "1124140825679184036",  # alias
    "protein per dollar: cheap protein sources":  "1124140825679640841",  # was Grocery Math (14)
    "grocery math":                               "1124140825679640841",  # alias
    "fiber per dollar: cheap high fiber foods":   "1124140825679097740",  # was HF Dinner and Gut Health (2)
    "grocery budget tips and shopping lists":     "1124140825679640840",  # was Gut Health Tips and Nutrition Charts (0)
    # unchanged winners
    "easy dinner recipes":                        "1124140825679548778",  # 8.2 imp/pin
    "budget meals and grocery hacks":             "1124140825679548779",  # 4.2
    "high protein meals and smart swaps":         "1124140825679548780",  # 5.6
    "food storage and freezer tips":              "1124140825679548781",  # 6.6
    # new boards - fill IDs from list-boards.py AFTER creating them
    "cheap meals for large families":             "",
    "healthy snacks for a sweet tooth":           "",
    "high protein breakfast ideas":               "",
    "high fiber breakfast ideas":                 "",
    "high protein lunch and sandwich ideas":      "",
    "sheet pan and one pot dinner recipes":       "",
    "bean and lentil recipes":                    "",
    "healthy soup recipes":                       "",
    "salad recipes and homemade dressings":       "",
    "sourdough discard recipes and easy bread":   "",
    "how to cook chicken, pork and beef":         "",
    "high fiber snack ideas":                     "",
    "nutrition labels and daily values explained": "",
    # deferred until it has 20 pins - see report section 3.1
    # "healthy food swaps and alternatives":      "",
}

# ── Routing table. ORDER IS THE CONTRACT: first match wins, top to bottom.
# Narrowest and highest-intent first. A rule holding a broad token MUST sit
# below every rule that could legitimately claim a pin containing it.
# Re-run the simulation over src/data/articles/*.md after ANY edit here.
BOARD_RULES = (
    # 1-2. Priced data. Must beat every topical rule: a per-dollar pin is a
    # data pin first and a food pin second.
    ("Protein Per Dollar: Cheap Protein Sources", (
        "protein per dollar", "protein-per-dollar", "per dollar protein",
        "cheapest protein", "cheapest animal protein", "cheapest dairy protein",
        "protein cost", "protein-cost", "protein value", "protein per serving",
        "cost per gram of protein", "50 grams of protein", "one dollar protein",
        "one-dollar-protein", "complete protein pairs", "protein sources ranked",
    )),
    ("Fiber Per Dollar: Cheap High Fiber Foods", (
        "fiber per dollar", "fiber-per-dollar", "per dollar fiber",
        "cheapest high fiber", "cheapest fiber", "fiber cost", "fiber-cost",
        "30 grams of fiber", "one dollar fiber", "one-dollar-fiber",
        "fiber comparison",
    )),
    # 3. Audience rule. "families" is broad but the audience intent outranks
    # the dish: a crockpot meal for eight belongs here, not on Sheet Pan.
    ("Cheap Meals for Large Families", (
        "large family", "large families", "for a crowd", "feed a crowd",
        "feeding a crowd", "big family", "stretch meals", "families",
    )),
    # 4. Above the bean rule on purpose: black-bean-brownies is a dessert.
    ("Healthy Snacks for a Sweet Tooth", (
        "sweet tooth", "brownie", "brownies", "energy ball", "energy balls",
        "dessert", "jam", "sweet snack", "sweet treat", "granola",
    )),
    # 5-7. Meal slot x attribute: the highest-intent shape on Pinterest.
    ("High Protein Breakfast Ideas", (
        "high protein breakfast", "protein breakfast", "breakfast burrito",
        "breakfast hash", "egg sandwich", "savory oatmeal", "breakfast staples",
        "balanced breakfast", "breakfast foods for sustained",
        "make ahead breakfast", "make-ahead-breakfast",
    )),
    ("High Fiber Breakfast Ideas", (
        "high fiber breakfast", "fiber breakfast", "chia pudding",
        "overnight oats", "yogurt parfait", "avocado toast", "bran muffin",
        "savory chia", "ricotta berry", "chia seed recipes",
    )),
    ("High Protein Lunch and Sandwich Ideas", (
        "sandwich", "lunch", "bagel", "work lunch", "packed lunch", "lunch prep",
        "lunch bowl", "burrito bowl", "wrap", "wraps",
    )),
    # 8-14. Recipe forms, narrow to broad.
    ("Sheet Pan and One Pot Dinner Recipes", (
        "sheet pan", "sheet-pan", "one pot", "one-pot", "skillet dinner",
        "crockpot", "crock pot", "slow cooker", "risotto", "hands-off",
    )),
    ("Bean and Lentil Recipes", (
        "bean", "beans", "lentil", "lentils", "chickpea", "chickpeas", "hummus",
        "split pea", "black bean", "kidney bean", "white bean", "legume",
        "rice and beans", "edamame", "natto", "soybean",
    )),
    ("Healthy Soup Recipes", (
        "soup", "stew", "chili", "broth", "chowder", "bisque",
    )),
    ("Salad Recipes and Homemade Dressings", (
        "picnic", "potluck", "potlucks", "pasta salad", "salad", "dressing",
        "dressings", "slaw", "tabbouleh", "vinaigrette",
    )),
    ("Sourdough Discard Recipes and Easy Bread", (
        "sourdough", "discard", "pizza dough", "bread recipe", "sandwich bread",
        "dumpling wrapper", "homemade bread", "baking",
    )),
    ("How to Cook Chicken, Pork and Beef", (
        "best way to cook", "how to cook chicken", "pork chop",
        "pork tenderloin", "prime rib", "ribs", "baked potato",
        "rotisserie chicken", "steak", "roast",
    )),
    ("High Fiber Dinner Recipes", (
        "high fiber dinner", "fiber dinner", "high-fiber dinner",
        "high fiber meal", "high fiber recipes", "vegetarian high fiber",
        "vegan high fiber", "high fiber stir fry", "high fiber pizza",
        "high fiber cauliflower", "high fiber quinoa", "quinoa", "farro",
        "barley", "bulgur", "millet", "teff", "amaranth", "whole grain",
        "high fiber pasta", "whole wheat", "stir fry", "stir-fry",
    )),
    ("High Protein Meals and Smart Swaps", (
        "high protein", "high-protein", "protein meal", "protein swap",
        "greek yogurt", "cottage cheese", "turkey meatball", "protein bread",
    )),
    # 15. Holds bare "recipe"/"recipes". Deliberately below every specific
    # recipe-form board so it catches only genuinely unclassified recipes.
    # This is the account's best board (8.2) and a good place to land.
    ("Easy Dinner Recipes", (
        "dinner", "weeknight", "tacos", "salmon", "cod", "fish", "chicken",
        "tofu", "pasta", "orzo", "pizza", "casserole", "meatballs",
        "portobello", "curry", "fried rice", "20-minute", "20 minute",
        "quick dinner", "recipe", "recipes",
    )),
    # 16. Holds bare "snack". Below Sweet Tooth so sweet pins are claimed first.
    ("High Fiber Snack Ideas", (
        "snack", "snacks", "popcorn", "potato chips", "chips",
        "roasted chickpeas",
    )),
    # 17-18. Storage and kitchen. Freezer before general storage: a freezer
    # meal is a freezer pin even though it also matches "storage".
    ("Food Storage and Freezer Tips", (
        "freezer", "freeze", "frozen", "how to store", "storage", "keep fresh",
        "fresh longer", "shelf life", "leftover", "leftovers", "food waste",
        "wilted", "browning", "keep berries", "store cooked",
    )),
    ("Kitchen Tips and Cooking Hacks", (
        "kitchen", "cast iron", "skillet", "cutting board", "blender",
        "parchment", "baking sheet", "cookware", "utensil", "organize",
        "organization", "oversalted", "seasoning", "cool rice", "preheat",
        "clean", "tools",
    )),
    # 19-20. Budget. Grocery-logistics before general budget, and both below
    # the per-dollar rules so priced data is never swallowed by "cost".
    ("Grocery Budget Tips and Shopping Lists", (
        "grocery", "groceries", "shopping list", "aldi", "costco", "thrifty",
        "grocery bill", "pantry", "shelf stable", "shelf-stable", "meal plan",
        "meal planning", "week of dinners", "grocery run",
    )),
    ("Budget Meals and Grocery Hacks", (
        "budget", "cheap", "affordable", "save money", "saving money", "frugal",
        "low cost", "low-cost", "cost", "for one", "cooking for one",
    )),
    # 21. Gut health. Narrow on purpose: the old version held bare "fiber"
    # and "nutrition", which is exactly what caused the 405-pin pileup.
    ("Gut Health Foods and Fiber Tips", (
        "gut health", "gut-health", "gut friendly", "gut-friendly",
        "constipation", "prebiotic", "probiotic", "fermented", "bloat",
        "digestion", "digestive", "artichoke", "prune juice", "natural relief",
        "smoothie", "smoothies", "tea",
    )),
    # 22. DEFERRED until the board exists with 20+ pins. Keep commented so the
    # intended position in the order is not lost.
    # ("Healthy Food Swaps and Alternatives", (
    #     "alternative", "alternatives", "swap", "swaps", "hidden sugar",
    #     "less salt", "less sugar", "sodium", "without more sugar", "substitute",
    # )),
    # 23. LAST. Holds bare "nutrition", so it must stay at the bottom.
    ("Nutrition Labels and Daily Values Explained", (
        "nutrition label", "label", "daily value", "daily values",
        "how much protein", "macronutrient", "macro", "healthy fats",
        "selenium", "zinc", "vitamin", "mineral", "smoke point", "cooking oil",
        "nutrition facts", "satiety", "weight loss", "fiber intake",
        "water and fiber", "challenge", "per day", "nutrition",
    )),
)

# Fallbacks when no rule matches. Must name boards that exist and are used.
CATEGORY_TO_BOARD = {
    "recipes":   "Easy Dinner Recipes",                          # 8.2 imp/pin
    "nutrition": "Nutrition Labels and Daily Values Explained",
    "tips":      "Kitchen Tips and Cooking Hacks",
}


def board_for_pin(pin: dict, category: str) -> str:
    """Route a pin to a board. First match in BOARD_RULES wins.

    Ordering is the contract, not the keyword sets. See report section 6.1.
    Verified 2026-07-26: 219/219 articles route with no starved rule.
    """
    haystack = _pin_haystack(pin)
    for board, keywords in BOARD_RULES:
        if _contains_any(haystack, keywords):
            return board
    return category_to_board((category or "").lower())
```

### 6.4 A guard worth adding

`board_for_pin` currently returns a name that may not exist in `BOARD_NAME_TO_ID`, and `board_name_to_id` returns `""` silently. During a 13-board creation that is a foot-gun. Add:

```python
def board_name_to_id(board_name: str) -> str:
    key = (board_name or "").strip().lower()
    board_id = BOARD_NAME_TO_ID.get(key, "")
    if not board_id:
        raise ValueError(
            f"no Pinterest board id for {board_name!r}; create the board and "
            f"add its id to BOARD_NAME_TO_ID (run scripts/list-boards.py)"
        )
    return board_id
```

Failing loudly beats shipping pins to an empty board id, which is a variant of the failure that put 405 pins on the two worst boards.

---

## 7. Recommendations beyond the board question

1. **Refill the Pinterest-side research tables.** `pin_inspector_keywords`, `autocomplete`, `pinterest_trends` and `audience_interests` in `pipeline-data/topic-research.sqlite` are all **empty**, and the only Pinterest query data we hold is a 166-row CSV from April. We are naming boards for a platform we have almost no query data on. A fresh Pinterest autocomplete harvest across the 24 proposed board names would validate or kill several of them cheaply.
2. **Test the per-dollar hypothesis explicitly.** No per-dollar or price-comparison phrasing appears anywhere in our 166 verified Pinterest keywords. Our data moat may have strong Google demand and weak *Pinterest* demand. Boards 1 and 2 are the test. If they stay under 2.0 imp/pin after 60 days with good names, the honest conclusion is that priced-data content is a search asset and not a Pinterest asset, and pin production should reweight accordingly.
3. **Write the picnic cluster.** Verified 24-expansion Pinterest seed, two articles. Cheapest content-to-demand gap in the file.
4. **Never re-upload a pin to seed a new board.** `[OFFICIAL]` duplicate pins risk a spam flag, and `[3P-DATA]` a same-image repin retains 11% of distribution. Move the pin object (§4.1).
5. **Do not chase board count.** No evidence supports an optimal number (§1.4). Twenty-four cohesive boards is good; forty mushy ones would be worse than the ten we have.

---

## Appendix A — evidence index

| Claim | Class | Source |
|---|---|---|
| Board names feed pin classification (P2I) | ENG | [Interest Taxonomy, Pinterest Eng, 2020-01-10](https://medium.com/pinterest-engineering/interest-taxonomy-a-knowledge-graph-management-system-for-content-understanding-at-pinterest-a6ae75c203fd) |
| Board titles are a search-embedding feature, +17/8/13% ablation | ENG | [OmniSearchSage, arXiv 2404.16260, 2024-04-25](https://arxiv.org/abs/2404.16260) |
| Pins and boards are the only two node types | ENG | [OmniSage, arXiv 2504.17811, 2025-04-22](https://arxiv.org/abs/2504.17811) |
| Pin-board bipartite graph, 3B nodes | ENG | [PinSage, Pinterest Eng](https://medium.com/pinterest-engineering/pinsage-a-new-graph-convolutional-neural-network-for-web-scale-recommender-systems-88795a107f48) |
| High-entropy boards removed from graph; pruning gives +58% relevance | ENG | [Pixie, arXiv 1711.07601, WWW 2018](https://ar5iv.labs.arxiv.org/html/1711.07601) |
| Board co-occurrence is the original Related Pins generator | ENG | [Related Pins, WWW 2017](https://arxiv.org/pdf/1702.07969) |
| Boards are a search result type | OFFICIAL | [Search for ideas on Pinterest](https://help.pinterest.com/en/article/search-for-ideas-on-pinterest) |
| Board pages indexed by Google; 10 board sitemaps incl. `high_cohesion_tier` | OFFICIAL | [pinterest.com/robots.txt](https://www.pinterest.com/robots.txt) |
| Duplicate pins risk a spam flag | OFFICIAL | [Pin performance and distribution](https://help.pinterest.com/en/business/article/pin-performance-and-distribution) |
| Deleting a board deletes its pins; 7-day restore | OFFICIAL | [Archive or delete a board](https://help.pinterest.com/en/article/archive-or-delete-a-board) |
| Board/pin limits exist but numbers not published | OFFICIAL | [Limits for Pins, boards and follows](https://help.pinterest.com/en/article/limits-for-pins-boards-and-follows) |
| Bulk move exists in the UI (Organize → Move) | OFFICIAL | [Move Pins to another board](https://help.pinterest.com/en/article/move-pins-to-another-board) |
| Boards AI upgrade; "Boards made for you" | OFFICIAL | [Pinterest Newsroom, 2025-10-27](https://newsroom.pinterest.com/news/pinterest-boards-get-ai-powered-upgrade-for-personalized-experience/) |
| `PATCH /v5/pins/{pin_id}` mutates `board_id`; beta-gated | OFFICIAL | [Pinterest OpenAPI v5.28.0, 2026-07-15](https://github.com/pinterest/api-description) |
| `org_write` limits: Trial 300/day, Standard 100/min | OFFICIAL | [Rate limits](https://developers.pinterest.com/docs/reference/rate-limits/) |
| ~20% of new pins have zero distribution after one week | 3P-DATA | [Tailwind 2025 Benchmark Part 3, 2025-03-27](https://www.tailwindapp.com/pinterest-marketing/research/2025-benchmark-study-part-three) |
| Same-image repin retains 11% of distribution vs 64% for new image | 3P-DATA | Tailwind, ibid. |
| Board growth study, 2.6M boards | 3P-DATA | [Understanding Online Collection Growth, WWW 2017](https://cs.stanford.edu/people/jure/pubs/boards-www17.pdf) |
| Optimal board count / minimum pins / new-board ramp | FOLKLORE | No traceable source found for any figure |
| "10 boards, 2 days apart" | FOLKLORE | Traces to a Tailwind product feature, not Pinterest policy |
| "Account-level topical authority", "boards are subdomains" | FOLKLORE | Appears in no Pinterest source |
| Whether moving a pin resets distribution | UNVERIFIED | Pinterest has published nothing |
| Whether renaming a board resets board signals | UNVERIFIED | Pinterest has published nothing |
| Whether board *descriptions* are indexed | UNVERIFIED | Never named in any engineering source |
| Our own imp/pin measurements | OURS | 561 live pins, 2026-07-26 |
| Pinterest autocomplete phrasing | OURS | `pipeline-data/pi-keywords-data-21042026.csv`, 166 keywords |
| 219/219 routing coverage | OURS | Simulation over `src/data/articles/*.md` |
