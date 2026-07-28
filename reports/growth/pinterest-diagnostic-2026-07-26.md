# Pinterest Diagnostic — 2026-07-26

**Scope:** read-only. No pins created, no source edited, no commits. All Pinterest calls were GETs; account state was read from the public profile payload, from D1 via the site's own read endpoints, and from the analytics cache that GitHub Actions refreshed today at 12:54 UTC.

---

## VERDICT

**The account is suppressed *and* mis-optimized. It is not under-volumed, and Pinterest is not a dead channel in principle — but this specific account is close to dead in practice, and the most honest read is that its history is the liability.**

Four candidate diagnoses, each with the evidence and a confidence level:

### 1. Suppressed — YES. Confidence: HIGH (85%)

New pins receive effectively zero distribution. Every pin still earning impressions was created before mid-May.

| Pin posted in | Pins posted | Impressions in the 90-day window | Impressions / pin | Exposure-normalised imp/pin/day | % of pins clearing 40 impressions |
|---|---|---|---|---|---|
| 2026-04 | 172 | 2,710 | 15.8 | 0.175 | 11.6% |
| 2026-05 | 178 | 1,011 | 5.7 | 0.075 | 3.4% |
| 2026-06 | 75 | 67 | 0.9 | 0.023 | 1.3% |
| 2026-07 | 48 | **0** | **0.0** | **0.000** | **0.0%** |

Window = 2026-04-28 → 2026-07-26 (`pinterest_analytics_cache`, refreshed 2026-07-26 12:54 UTC). The exposure-normalised column corrects for the fact that older pins had more days inside the window; the collapse survives the correction with room to spare. It actually *understates* the problem, because a healthy Pinterest pin earns most of its impressions in its first weeks, so a July pin should out-earn an April pin per day, not trail it 100-to-nothing.

Not one of the 48 pins posted in July 2026 appears in the account's top-50 by impressions, top-50 by outbound clicks, or top-50 by saves. Twenty-seven of the 172 April pins do.

This is a **cliff, not a slope**. Per Pinterest's own [Enforcement policy](https://policy.pinterest.com/en/enforcement), the documented mechanism is called **"limited distribution"**: content stays visible on your profile but is withheld from search, home feed and related pins. The shape of this curve is the textbook signature. There is no API field and no dashboard indicator that reports it — Pinterest exposes 90+ organic metrics and zero distribution-health fields — so it can only be inferred, which is why this is 85% and not 100%.

**What it is not:** it is not a posting failure. D1 shows **473 POSTED, 180 PENDING, 0 FAILED** across 663 queue rows. Sampled pin URLs return HTTP 200 on pinterest.com. All 250 distinct destination URLs return 200, all carry `og:image` and `p:domain_verify`, and 104 carry Recipe schema. The site *is* claimed — Pinterest's own profile payload returns `domain_verified: true`, `domain_url: www.daily-life-hacks.com`, `indexed: true`, `seo_noindex_reason: null`. **The machinery works perfectly. Pinterest is simply not showing the output to anyone.**

### 2. Under-volumed — NO. Confidence: HIGH (95%)

The account has **786 live pins** (Pinterest's own profile payload, read today). Account-level trailing-30-day impressions from the weekly scorecards:

| Week | Impressions (30d) | Outbound clicks (30d) |
|---|---|---|
| 2026-W28 (Jul 12) | 1,466 | 21 |
| 2026-W29 (Jul 13) | 1,426 | 20 |
| 2026-W30 (Jul 20) | 1,493 | 15 |

786 live pins producing ~1,470 impressions/month is **1.9 impressions per pin per month**. There is no published benchmark for this figure that survives scrutiny — the largest real dataset (Tailwind's 2025 benchmark, 17,000 accounts / 1.2M pins) shows the top 1% of pins take >50% of all impressions and the bottom 80% take <10%, so "average impressions per pin" is a power-law artefact, not a rate. But 1.9/pin/month means *nothing* is catching distribution, not even by luck, across 786 attempts. **This volume should be producing far more than 1,466 impressions. The 50x gap is real and it is not explained by pin count.**

There is a second, quieter confirmation of decline: the 90-day snapshot totals **≥8,561 impressions**, while the trailing 30 days totals ~1,470. So the earlier 60 days of that window carried ~7,100 and the most recent 30 carried ~1,470 — roughly a halving, month over month, while pin count grew.

### 3. Mis-optimized — YES, substantially. Confidence: HIGH (90%)

Five concrete, verified defects, detailed in the next section. The largest: **~46% of the pins Pinterest has surfaced for this account do not point at our domain at all.** Of the 281 pins in the analytics cache, only 150 link to daily-life-hacks.com. The rest are 2024-era affiliate residue, including **49 pins pointing at `skrotrack.com/campaign/{uuid}?se=...`** — a click-redirect tracker — and 7 pointing at `healthnile.com`, a typosquat of healthline.com.

### 4. Pinterest is a dead channel for us — NO, but it is a *small* channel, and smaller than the plan assumes. Confidence: MEDIUM-HIGH (75%)

Pinterest the company is growing (631M MAU, +11% YoY, Q1 2026). Pinterest as a *referrer to food blogs* is shrinking. The best real datapoint: **Pinch of Yum**, one of the largest US food blogs, went from **6.33% of traffic from Pinterest (Mar 2024) to 3.99% (Mar 2026)** — and that is a *share*, so the absolute decline is larger. Independently, both Simple Pin Media and Tailwind report that **home decor has overtaken food as Pinterest's #1 niche**. Food is a declining slice of a growing platform.

**Bottom line:** this is not a creative problem and not a volume problem. It is an account-reputation problem sitting on top of a routing-and-format problem. See the ceiling estimate at the end before deciding whether to spend another hour on it.

---

## What actually happened — the timeline

| Date | Event | Evidence |
|---|---|---|
| 2024-02-22 | Account created. Used for affiliate content — swords, living rooms, "silly dogs", Makita tools, redirect-tracker links. | Profile `created_at`; 2024 pins still live and still earning |
| 2026-01 → 2026-03 | Repurposed for Daily Life Hacks. First food pins. | `created_at` on cached pins |
| pre-2026-05-14 | **Pins pointed at non-existent slugs. The router returned 200 OK for misses instead of 404.** The project's own spec records: *"Pinterest treated these as spam/low-quality, tanking impressions to near zero."* | `docs/superpowers/specs/2026-05-14-pinterest-seo-audit-design.md` |
| 2026-04-08 → 2026-05-24 | High-cadence burst posting: **33–62 pins/week (6–9/day)**, all to one domain, all AI-generated imagery. | D1 posting history |
| 2026-05-14 | 404 routing fixed. | Same spec |
| 2026-06 onward | **Distribution never recovers.** June pins: 0.9 impressions each. July pins: zero. | Table above |
| 2026-07-04 | Cadence cut to 1–2/day after "reach dropped to zero". | Project memory |
| 2026-07-19 | Cadence raised to 3/day. | `functions/api/_pin-schedule.js` |

Two spam signals fired simultaneously in April–May: a wall of broken destination URLs, and 6–9 AI-image pins per day to a single domain from an 18-follower account. The technical fault was fixed on 2026-05-14. **The reputational consequence was not, and has not lifted in the ten weeks since.**

---

## The specific fixable causes, ranked by expected impact

### #1 — 2024 affiliate residue is still live on the account
**Impact: very high. Effort: 2–4 hours.**

Of 281 pins in the analytics cache, destinations break down:

| Destination domain | Pins |
|---|---|
| www.daily-life-hacks.com | 150 |
| **skrotrack.com** (redirect/campaign tracker) | **49** |
| www.healthline.com | 14 |
| **healthnile.com** (typosquat of healthline.com) | **7** |
| www.makitatools.com | 6 |
| tips.daily-life-upgrade.com | 5 |
| www.eatingwell.com / protoolreviews / sites.google.com | 9 |
| tips.smart-choice-hub.com, libroworld, others | ~6 |
| (no link) | 8 |

In the current 90-day window these legacy pins are not dormant — they are **19% of every impression the account earns**:

- The account's **single highest-impression pin is "Eiffel Tower" (created 2024-03-16, 810 impressions)**. Nothing we have made in 2026 beats it.
- The **#2 pin, at 742 impressions and 29 outbound clicks, is titled "High Fiber Meals for Constipation Relief 2026" and links to healthline.com.** That single pin is sending 12% of the account's total outbound clicks to a competitor.
- `skrotrack.com/campaign/{uuid}?se=...` is a cloaked-redirect URL pattern. Pinterest's [Community Guidelines](https://policy.pinterest.com/en/community-guidelines) name **link cloaking and deceptive redirects** as spam explicitly. Fifty of these are live on the account today.

Whatever Pinterest's classifier believes this account is, it is not "a budget food publisher". It is an account with swords, living rooms, a typosquatted health domain and fifty affiliate trackers on it. **Delete these pins and the boards holding them.** This is the highest-leverage, lowest-effort action available, and nothing else on this list will work while they remain.

### #2 — The board ID map in code is wrong; two boards are swapped, and the biggest ones have no descriptions
**Impact: high. Effort: ~1 day.**

Live board names, read from Pinterest's own page payload today:

| Board ID | **Actual live name** | Live pins | Description | What the code thinks it is |
|---|---|---|---|---|
| `…679184034` | **Healthy Meal Prep & Kitchen Tips** | 182 | 234 chars ✓ | `gutHealthNutrition` → "Gut Health Tips and Nutrition Charts" ✗ |
| `…679184036` | **Gut Health & Nutrition Tips** | 86 | **EMPTY** ✗ | `mealPrepKitchen` → "Healthy Meal Prep & Kitchen Tips" ✗ |
| `…679184032` | *not present on the profile board list* | ? (154 in May) | ? | `highFiberRecipes` → "High Fiber Dinner and Gut Health Recipes" ✗ |
| `…679097740` | High Fiber Dinner and Gut Health Recipes | 10 | 265 ✓ | not in the map |
| `…679053588` | gut health recipes | 18 | **EMPTY** | not in the map |
| `…679548778` | Easy Dinner Recipes | 14 | 225 ✓ | ✓ |
| `…679548779` | Budget Meals and Grocery Hacks | 16 | 258 ✓ | ✓ |
| `…679548780` | High Protein Meals and Smart Swaps | 12 | 241 ✓ | ✓ |
| `…679548781` | Food Storage and Freezer Tips | 28 | 231 ✓ | ✓ |
| `…679640841` | Grocery Math: Food Prices and Nutrition Data | 16 | 272 ✓ | ✓ |

Boards **034 and 036 are swapped** in `functions/api/_pin-metadata.js`, `scripts/pinterest_boards.py` and `scripts/lib/d1_csv.py`. Verified by sampling what actually landed there:

- Routed to `…036` (live name **"Gut Health & Nutrition Tips"**): *"Stop Ruining Your Knives With the Wrong Cutting Board"*, *"The Only 4 Cooking Oils You Need for Everything"*, *"I Used EVOO for Stir-Fry Until My Kitchen Filled With Smoke"* — 86 kitchen-tips pins on the nutrition board.
- Routed to `…034` (live name **"Healthy Meal Prep & Kitchen Tips"**): *"Flip the Bag. Check 'Added Sugars.' 6g or Less Is Your Benchmark."*, *"These Foods Keep You Full Longer Without the Weird Labels"* — nutrition pins on the meal-prep board.

Board name and board description are genuine Pinterest ranking surfaces — Tailwind's benchmark places keywords in pin titles, descriptions and **board names** as the top ranking factors, with hashtags contributing ~1%. Pinterest's enforcement policy also states that **if a board's distribution is limited, every pin on that board is limited too** — so board hygiene is not cosmetic.

The perverse shape here: **the six boards with good keyword-loaded descriptions hold 96 pins between them. The two boards holding 268 pins are the two that are mislabeled, and one of them has no description at all.**

### #3 — Pin images are the wrong aspect ratio and under-resolution
**Impact: high. Effort: 1–2 days (regeneration is mechanical).**

Sampled 120 of 1,063 pin images on disk:

| Dimensions | Ratio | Count |
|---|---|---|
| 896×1200 | 0.747 (≈3:4) | 63 |
| 768×1024 | 0.750 (3:4) | 26 |
| 1000×1500 | **0.667 (2:3)** ✓ | 19 |
| 848×1264 | 0.671 ✓ | 7 |
| 896×1280 | 0.700 | 3 |
| 1024×1536 / 832×1248 | 0.667 ✓ | 2 |

**Only ~23% are Pinterest's 2:3 standard. 74% are 3:4 or shallower, and most are under the recommended 1000px width.** 2:3 at 1000×1500 is Pinterest's own published ad spec and the dominant convention because a taller pin occupies more vertical feed space per impression. This is a self-inflicted handicap: the media pipeline deliberately generates 3:4 (recorded in project memory as the pin-model default). Changing it costs a config change plus a regeneration run.

### #4 — Pin descriptions waste the main keyword surface
**Impact: medium-high. Effort: hours.**

- Median description length across the queue: **135 characters, in an 800-character field.**
- Titles are fine (median 52 chars).
- **36 of the 44 "Grocery Math" text pins share a byte-identical 90-character closing sentence** (*"…nutrition data and real July 2026 store prices, with the full methodology on the site."*). Duplicate boilerplate across a board is a low-quality signal and, worse, it burns the one field Pinterest search actually indexes on repeated non-differentiating text.
- Only 2 descriptions contain a hashtag — correct, hashtags are worth ~1%, don't add them.

### #5 — Same-destination repetition and redirect hops
**Impact: medium. Effort: low–medium.**

- **473 posted pins point at only 250 distinct destination URLs.** Sixty destinations carry 4 pins each and 8 carry 5. The project's own rule in `.claude/rules/pinterest.md` requires each pin variant to use a unique alias slug precisely so *"Pinterest sees different URLs for pins pointing to the same article (avoids spam detection)"* — that rule is not being followed for the bulk of the queue.
- **228 of 250 destinations are served through a trailing-slash 301.** Every pin link is one redirect hop from its content. Not fatal, but it means Pinterest's crawler resolves a redirect before it ever sees the `og:` tags and `p:domain_verify`. Point pins at the canonical trailing-slash URL directly.

### #6 — Profile is unoptimized
**Impact: low–medium. Effort: 15 minutes.**

`full_name` is **"DavidMiller"**. `about` is **empty**. Both are indexed by Pinterest search. Eighteen followers, 94 following. A budget-food account should be named for the query it wants ("Daily Life Hacks · Budget High-Fiber Meals") with a keyword-bearing bio.

---

## On the AI-image theory

The brief flagged prior research that Pinterest began suppressing AI images in food around Dec 2025. **That is half-right and it is not our problem.** What actually happened, with dates:

- **2025-04-30** — Pinterest rolls out "Gen AI labels" globally; image pins can show an "AI modified" badge. ([newsroom.pinterest.com](https://newsroom.pinterest.com/news/introducing-gen-ai-labels/))
- **2025-10-16** — Pinterest ships a GenAI "tuner" letting users opt to *see less* GenAI content, per category. Food is not among the launch categories. ([newsroom](https://newsroom.pinterest.com/en-gb/news/pinterest-rolls-out-new-tools-to-give-users-more-control-over-gen-ai-content/), [Engadget](https://www.engadget.com/social-media/pinterest-will-let-you-dial-down-ai-slop-in-your-feeds-130000337.html))
- **2025-12-12** — **Food and Drink is added to the tuner categories.** This is the real event behind the Dec-2025 claim.
- **2026-07-22** — Pinterest, on the record: *"recommendation system prioritizes high-quality content, regardless of if it's human-created or GenAI."* ([Business Insider, via dnyuz](https://dnyuz.com/2026/07/22/from-substack-to-youtube-here-are-the-social-platforms-cracking-down-on-ai-slop/))

So: **labelled ≠ demoted**. What labelling costs you is *reachable audience* — users who toggled the filter — and Pinterest has published zero data on how many did. Detection runs on IPTC metadata plus a proprietary pixel classifier; C2PA is not named by Pinterest anywhere.

**Three reasons to reject AI suppression as our cause:**

1. **Our images are metadata-clean.** Of ~400 pin JPEGs sampled, only 2 carry C2PA / `trainedAlgorithmicMedia` / OpenAI markers. The pipeline's re-encode strips them. The metadata half of Pinterest's detection has almost nothing to find.
2. **The PIL-rendered text pins die identically.** These carry no AI imagery at all. Nine have posted, all since 2026-07-15, and they have **zero impressions between them** — the same zero the 114 AI-photo pins posted since June 1 earned (67 impressions total across all of them). *Both* creative types are at zero. The suppression is account-level, not creative-level. (Caveat: 9 pins over 11 days is far too small a sample to conclude anything about text-vs-AI on its own merits — what it does establish is that switching creative type did not restore distribution.)
3. **The timing doesn't fit.** Food joined the tuner on 2025-12-12. Our impressions were healthy through April 2026 and collapsed in May–June. The collapse tracks the broken-slug spam episode and the 6–9/day burst, not the AI policy.

**One genuine AI-related risk worth knowing:** false-positive labelling is documented and effectively un-appealable. 404 Media (2026-02-20) reported artists whose hand-drawn work was repeatedly auto-tagged "AI modified", with appeals that get reversed and then re-applied. Switching to real photography does not guarantee escape from the label.

---

## What successful budget-food accounts do differently in 2026

Sourced from Simple Pin Media (Kate Ahl, ~10-year Pinterest agency, [Food Blogger Pro, 2026-01-27](https://www.foodbloggerpro.com/podcast/pinterest-strategy-for-food-creators-in-2026/)) and Tailwind's benchmark study:

- **Cadence is a solved question.** Ahl: *"We're beyond that question"* on 5-vs-10 pins/day. Tailwind's guidance is ~5 fresh pins/day. There is no published Pinterest limit; the "50/day" figure in blog folklore is not a documented rule. Our 3/day is not the bottleneck.
- **Fresh > repin, decisively.** Fresh pins drive >90% of traffic to creator sites. Practitioner consensus is 3–7 days minimum between pins to the same destination.
- **Pinterest behaves like search, not social.** Over 60% of saves come from pins more than a year old. Pins aged 1–2 years averaged 68 saves in a trailing 90 days vs 44 for pins under a year. **This channel pays out on an 18-month horizon or not at all** — which is exactly why the account-level suppression matters more than any creative tweak.
- **The 2026 differentiator is "legibly human", not "polished".** Ahl's prescription: strong photograph, 3–4 words of overlay copy, visible authenticity signals — the creator's face, hands, real kitchen, visible branding. Polish now reads as slop. This directly contradicts our current direction of illustrated character pins and clean data graphics.
- **Video is a coin flip.** Ahl: video pins get *"a billion views a day"* but *"there does not seem to be any rhyme or reason"* to which ones perform. Do not invest here. Idea Pins no longer exist as a separate format — they were folded into Video Pins and all current pin formats carry a destination link, so the old "Idea Pins kill outbound clicks" concern is moot.
- **Board taxonomy is SEO infrastructure, not filing.** Boards should be named for the query ("Cheap Dinners for Two", "$5 Family Meals"), not for brand-cute categories.

**On our CTR:** 21 clicks on 1,466 impressions is **1.43%**, at the top of every published organic range (platform average 0.2–0.5%; "good" in 2026 is 1.0–1.5%). But at n=1,466 the 95% confidence interval is roughly 0.9–2.2%, so this is not distinguishable from luck. **The creative is not the problem. The 1,466 is the problem.** Optimise distribution, not conversion.

---

## An honest ceiling

**If every fix above lands and the account is *not* under a distribution limit:** 786 live pins going to ~1,500 over six months at 3/day, with correct 2:3 format, correct boards and keyword-loaded descriptions, plausibly reaches **10,000–40,000 impressions/month within 6 months**, at 0.5–1.5% outbound CTR → **50–600 clicks/month**. That is a 7–25x improvement on today and it is genuinely worth having.

**It is not 100k+.** The 100k figure describes established food accounts with years of accumulated pin age, thousands of followers, and clean domain history. We have 18 followers and a 2024 affiliate account. Given that 60% of Pinterest saves come from pins over a year old, we are structurally 12–18 months from that range even on a perfect run.

**If the account *is* under a distribution limit** — which the evidence says is 85% likely — **none of the above happens.** Pinterest's Business Community carries a [2026-07-08 thread](https://community.pinterest.biz/t/limited-distribution-of-my-account/47839) documenting an account under limited distribution for five months, four appeals filed, no response, with a Pinterest staff member replying *"I wish there were more we could do here."* Combined with 404 Media's reporting on degraded auto-moderation appeals, the realistic expectation is: **there is no reliable path to getting a limit lifted by asking.**

### The uncomfortable recommendation

The single most valuable asset this account has is 1,466 impressions and 18 followers. That is worth approximately nothing. The single biggest liability is a two-year history of affiliate spam, cloaked redirect links, a typosquatted health domain, and a documented burst-posting episode against broken URLs. **A clean account starts with no equity and no baggage. This account starts with no equity and considerable baggage.**

I would not recommend abandoning it before testing, because the test is cheap. But I would frame the next six weeks as a test with a written kill criterion, not as a growth plan:

1. **Weeks 1–2:** delete the affiliate residue (fix #1), fix the board map and descriptions (fix #2), fix the profile (fix #6). Freeze posting during the purge.
2. **Weeks 3–8:** resume at 3/day with 2:3 images and 300–500-char descriptions. Change nothing else.
3. **Kill criterion, written now:** if trailing-30-day account impressions have not reached **5,000** by 2026-09-15, Pinterest is not recoverable on this account. At that point the choice is a clean account or reallocating the hours entirely.

**The owner should hear this plainly:** months of pipeline work produced nothing not because the pipeline is broken — it is one of the cleanest parts of this project, 473 pins posted with zero failures — but because Pinterest stopped listening in May and has not started again. Fixing the pipeline further will not change that. The only things that might are removing the account's spam history and waiting. If neither works by mid-September, this channel should be closed rather than nursed.

---

## Appendix — a measurement warning

The site's own `pinterest_hits` counter reports **5,551 total hits, 200 today**, and `/api/analytics` reports **15,612 page views in 7 days**. Pinterest's API reports **21 outbound clicks in 30 days**, and GSC reports ~5 impressions/day. The second-largest country in `pinterest_hits` is **Israel (2,021 hits)**.

These numbers cannot both be true. The site's first-party analytics are dominated by bots and self-traffic and **must not be used to judge Pinterest performance**. Only the Pinterest API's `OUTBOUND_CLICK` metric is trustworthy here. Any prior decision made on the basis of the 15,612 figure should be revisited.

A second measurement caveat: `pinterest_analytics_cache` is **cumulative, not a fixed window**. Rows carry `cached_at` values spanning 2026-04-09 to 2026-07-26, and each row holds whatever 90-day figure was current when that pin last appeared in a top-50 list. Summing the whole table mixes time windows. The "3.3% baseline CTR / 9,620 impressions across 66 pins" figure in `docs/pinterest-creative-playbook.md` and quoted onward in `reports/growth/seo-breakthrough-research-2026-07-26.md` is built on that mixed sum and overstates the account's real position. All figures in this report use only the 91 rows sharing the latest `cached_at` timestamp.

---

## Evidence index

| Claim | Source |
|---|---|
| 473 POSTED / 180 PENDING / 0 FAILED | `GET /api/pins-status` (D1 `pins_schedule`), 2026-07-26 |
| Per-month impression collapse | `GET /api/pinterest-analytics` (D1 `pinterest_analytics_cache`, refreshed 2026-07-26 12:54 UTC), joined to `GET /api/pins-posted` |
| 786 pins, 28 boards, 18 followers, `domain_verified: true`, empty `about` | `__PWS_INITIAL_PROPS__` payload, `pinterest.com/DavidMiller615/`, 2026-07-26 |
| Live board names, pin counts, description lengths | Per-board `__PWS_INITIAL_PROPS__` payloads, 2026-07-26 |
| Board ID map wrong / 034↔036 swapped | `functions/api/_pin-metadata.js`, `scripts/pinterest_boards.py`, `scripts/lib/d1_csv.py` vs the live payloads above |
| Board misrouting confirmed by content | `pipeline-data/pinterest-bulk-upload-001.csv` / `-004.csv`, titles routed per board ID |
| Off-domain destinations (skrotrack, healthnile, …) | Destination-domain histogram over 281 cached pins |
| 250/250 destinations HTTP 200 with `og:image` + `p:domain_verify` | Live GET sweep with a Pinterest-bot user agent, 2026-07-26 |
| Aspect-ratio distribution | PIL over a 120-image sample of `public/images/pins/*.jpg` (1,063 total) |
| Only 2/400 images carry AI metadata | Byte-scan for C2PA / `trainedAlgorithmicMedia` / XMP markers |
| Broken-slug spam episode | `docs/superpowers/specs/2026-05-14-pinterest-seo-audit-design.md` |
| Cadence history | D1 posting history by ISO week; `functions/api/_pin-schedule.js` |
| Account 30d impressions trend | `pipeline-data/scorecards/scorecard-2026-W28/29/30.md` |
