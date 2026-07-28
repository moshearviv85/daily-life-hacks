# Query Family Plan — changing the doorway

**Date:** 2026-07-28
**Scope:** research and planning only. No articles written, no site source edited, no commits.
**Status:** COMPLETE.
**Evidence files:** `reports/growth/query-family-sizing-2026-07-28.json` (26 head shapes, ~2,100 autocomplete calls) and `reports/growth/query-family-perfood-demand-2026-07-28.json` (78 foods x 3 query shapes).

**The reframe this builds on:** the site targets "per dollar" phrasing.
`efficiencyiseverything.com` has owned that family for a decade and gets ~4,800
visits/month (Similarweb, June 2026, via `missed-levers-2026-07-27.md`).
`myfooddata.com` gets ~300,000/month on "foods highest in X". The site's best
query last month was *high fiber fast food*: 28 impressions, position 16.7. That
is a demand problem, not a ranking problem.

**Prior work this does not repeat:** `traffic-sweep/01-07`,
`missed-levers-2026-07-27.md`, `title-audit-2026-07-27.md`,
`serp-competitive-map-2026-07-26.md`. Last 48h of commits shipped: public JSON
API over the datasets, dataset repo + MCP server, `/data/` hub, entity graph,
crawlable calculators, image sitemap, IndexNow fixes, 14 title restorations,
Pinterest board rebuild and an 8/day poster. None of that is re-proposed here.

---

## 0. Method, stated up front

There is no paid keyword-volume tool. Every size claim below rests on one of
four signals, and each claim says which one it uses. **No inferred number is
presented as a measured one.**

| Signal | What it proves | What it does NOT prove |
|---|---|---|
| **S1 — autocomplete presence** | the string is typed often enough for Google/Bing/DDG to predict it | nothing about how often |
| **S2 — autocomplete ordinal rank** | *relative* popularity of siblings under one prefix (Google orders suggestions roughly by frequency) | absolute volume; ordering is undocumented |
| **S3 — breadth** = distinct completions a head generates across a–z expansion | how much addressable long-tail surface hangs off the head | that the head itself is big |
| **S4 — incumbent traffic** (Similarweb) + SERP composition | that money/traffic exists in the family, and what page type collects it | our share of it |

**A hard limitation of the existing harvest, stated because it changes how
`harvest.json` may be used.** `scripts/harvest_search_queries.py` expands **30
hand-chosen seeds** (`pipeline-data/keyword-research/seeds.txt`) via alphabet +
question-prefix + suffix expansion. Every one of those 30 seeds is a
budget/fiber/protein/beans phrase. So the 12,106 queries are a **modifier map
for the families we already believed in** — they cannot size a family we never
seeded. Counting "foods highest in X" inside that file returns 19 queries, and
that number means *we never asked*, not *nobody searches*.

Concretely, shape counts inside the existing 12,106:

| Shape | Queries | Read |
|---|---:|---|
| `high/low [X] foods` | 736 | real, and it is the biggest shape we seeded |
| `cheap ...` | 942 | inflated: 5 of 30 seeds contain "cheap" |
| `... budget ...` | 926 | inflated: 4 seeds contain "budget" |
| `recipe` | 614 | inflated by the `recipe` suffix modifier |
| `cheapest ...` | 338 | inflated: `cheapest` is a question prefix in the harvester |
| `X vs Y` | 341 | inflated: `vs` is a suffix modifier |
| `list / chart / ranked` | 283 | real signal, format demand |
| **`per dollar` / `cost per`** | **104** | **0.9% of a corpus seeded with 2 per-dollar seeds** |
| `foods high(est) in X` | 19 | **artefact — never seeded** |
| `how many calories in` | 11 | **artefact — never seeded** |

The per-dollar number is the one that matters. In a corpus deliberately seeded
with `protein per dollar` and `cheapest protein`, per-dollar phrasing still
reaches only 104 of 12,106 queries. Autocomplete would not withhold that
phrasing if people typed it. **This is independent confirmation, from our own
data, of the reframe.**

To size the families we never seeded, I ran a fresh probe (§1).

---

## 1. Sizing the families — fresh measurement, 2026-07-28

I re-ran the harvester's own technique against **26 candidate head shapes we had
never seeded**, three engines (Google, Bing, DuckDuckGo), full a–z expansion.
Script: `scratchpad/qfp_probe.py`, output `qfp_family_size.json`. ~2,100 live
autocomplete calls.

Two derived measures, and what each is worth:

- **On-topic breadth** — distinct completions that literally extend the head.
  This is the *addressable long-tail surface*: how many separate pages the family
  can support. It is a count of distinct queries, **not** a volume number.
- **Bare-prefix order** — Google's own ranking of the top 10 completions for the
  naked head. Google orders suggestions roughly by frequency, so this is the best
  free *relative* popularity signal that exists. The ordering algorithm is
  undocumented; treat it as ordinal, never cardinal.

### 1.1 The measured table

| # | Head shape | On-topic breadth | Multi-engine | Google's #1 completion | Verdict |
|---:|---|---:|---:|---|---|
| 1 | `how many calories in ___` | **407** | 234 | *an egg* | Biggest family measured. **We hold no calorie data.** |
| 2 | `best foods for ___` | **390** | 213 | *constipation* | Big, but see §3 — it is a health-condition family |
| 3 | `how much protein in ___` | **377** | 233 | *an egg* | **61% multi-engine — highest agreement of any substantive head** |
| 4 | `how much fiber in ___` | **354** | 209 | *an apple* | Same shape, we hold the data |
| 5 | `foods high in ___` | **336** | 225 | *iron* | 65% agreement — the highest measured |
| 6 | `foods highest in ___` | **257** | 166 | *magnesium* | Same family, different phrasing |
| 7 | `cheapest protein ___` | **165** | 35 | *sources* | Retailer modifiers: walmart, aldi, costco, trader joe's |
| 8 | `cheapest source of ___` | **151** | 15 | *protein* | 7% multi-engine. Weak. |
| 9 | `most protein per ___` | ~50 | 23 | — | Weak |
| 10 | **`protein per dollar ___`** | **19** | 71* | *chart* | **The family the site is built on** |
| 11 | `price per pound of protein ___` | **1** | 47* | — | Does not exist as a family |

\* the multi-engine count for heads 10–11 is inflated by off-topic completions
the a–z expansion dragged in; the on-topic breadth column is the honest one.

### 1.2 The single most important number in this report

```
how much protein in ___   →  377 distinct on-topic queries
protein per dollar ___    →   19 distinct on-topic queries
```

**A 20:1 ratio in addressable query surface**, measured today, against the same
engines, with the same method, in the same niche. That is not an opinion about
positioning. Both heads exist; both return autocomplete. One supports a few
hundred pages, the other supports about six.

`price per pound of protein` returns **exactly one** on-topic completion — the
head itself. It is not a query family at all.

Independent corroboration from our own harvest: in a 12,106-query corpus
*deliberately seeded with two per-dollar seeds*, per-dollar phrasing still
reaches only 104 queries (0.9%). Two different methods, same answer.

### 1.3 The modifiers people actually append

Straight from Google's bare-prefix ordering (its own popularity ranking):

| Head | Google's top-10 completions, in Google's order |
|---|---|
| `foods high in` | **iron, fiber, potassium, magnesium, protein, zinc, calcium, cholesterol, b12, copper** |
| `foods highest in` | **magnesium, fiber, iron, potassium, protein, vitamin c, calcium, zinc, b12, vitamin d** |
| `how much protein in` | an egg, chicken breast, salmon, one egg, a can of tuna, tofu, 1 boiled egg, steak, 100g chicken breast, 2 eggs |
| `how much fiber in` | an apple, chia seeds, lettuce, tomatoes, watermelon, kiwi, chickpeas, an avocado, sweet potato, blueberries |
| `how many calories in` | an egg, a banana, watermelon, an apple, a cucumber, an avocado, a date, a potato, a pita, popcorn |
| `best foods for` | **constipation, hair growth, gut health, diarrhea, bulking, period, weight loss, iron, fiber, diabetics** |
| `cheapest protein` | sources, powder, —, bars, shakes, sources per gram, powder reddit, powder uk, powder australia, powder india |
| `protein per dollar` | —, **chart, calculator, fast food**, reddit, **taco bell, mcdonald's**, list, foods, best |

Four things fall straight out of this and they set the whole plan:

1. **In `foods high(est) in X`, our two nutrients rank 2nd and 5th.** Fiber is
   #2 on both phrasings; protein is #5 on both. The four ahead of or around them
   — iron, magnesium, potassium, calcium — are nutrients **we do not hold a
   single number for.** We can contest roughly 20% of the biggest nutrient family
   by its own popularity ordering.
2. **`best foods for X` is a medical-condition family, not a nutrient family.**
   Eight of Google's top ten completions are conditions (constipation, hair
   growth, diarrhea, period, weight loss, diabetics…). That is YMYL. See §3.
3. **`cheapest protein` is contaminated by protein powder** — 6 of 10 top
   completions are supplement queries, and the `david-miller-voice` guide bans
   supplements. The genuinely food-shaped tail is the *retailer* modifiers found
   deeper in the expansion: `cheapest protein at walmart / aldi / costco /
   trader joe's / grocery store / mcdonald's`.
4. **The per-dollar family's own biggest modifiers are fast food** — `protein per
   dollar fast food`, `protein per dollar taco bell`, `protein per dollar
   mcdonald's`. That is the one place where cost-per-nutrient has live demand,
   and we hold `fastfood-protein-per-dollar-2026.csv` (30 chain items).

### 1.4 Can we actually answer these? Measured coverage

I matched every on-topic child of the three `how much X in Y` heads against the
165 foods we price (token match on the food name).

| Family | On-topic queries | Name a food we already price | Coverage |
|---|---:|---:|---:|
| `how much protein in ___` | 377 | **203** | **54%** |
| `how much fiber in ___` | 354 | **176** | **50%** |
| `how many calories in ___` | 407 | 155 | 38% — **but we hold no calorie column, so answerable coverage is 0%** |

Half of the two biggest answerable families is already inside our CSVs. That is
the strongest fact in this report on the *supply* side.

---

## 2. The live SERPs — read today, not remembered

**Method and its limits.** Google's HTML SERP is not fetchable server-side — a
plain `curl` returns a JS bootstrap shell (`enablejs` redirect), and Bing's HTML
endpoint returns a Cloudflare challenge. **Both blocked; stated rather than
guessed.** I read the SERPs through a real rendering browser
(`mcp__Claude_Browser`), signed out, `gl=us&hl=en`, and extracted the organic
domain order, AI Overview presence and AIO cited sources from the live DOM.

Caveat that applies to every row: this is one signed-out sample from one
location on one day. It is a composition read, not a rank-tracking series.

### 2.1 The eleven SERPs

| # | Query | AIO? | Distinct organic domains | Who owns the top | Page type that wins |
|---:|---|:---:|---:|---|---|
| 1 | `foods high in fiber` | **yes** | 17 | Mayo Clinic, Cleveland Clinic, **cancer.gov**, **dietaryguidelines.gov**, AICR, HelpGuide, Metamucil, Houston Methodist | institutional health article |
| 2 | `foods highest in fiber` | no (this sample) | 12 | Mayo Clinic, **NCI (.gov)**, **dietaryguidelines.gov (PDF)**, AICR, HelpGuide, Metamucil, **VA.gov (PDF)** | same |
| 3 | `foods highest in protein` | **yes** | 15 | **myfooddata.com (#1)**, MyFitnessPal, heart.org, Hopkins, Cleveland Clinic, Harvard Health, GoodRx | list article on a database site |
| 4 | `best foods for constipation` | **yes** | 9 | **hopkinsmedicine.org, medlineplus.gov, niddk.nih.gov, chop.edu, eatright.org**, MiraLAX, GoodRx | institutional medical |
| 5 | `how much protein in an egg` | no — **Google answers it itself** | 11 | **Google nutrition panel, "Sources include: USDA"**, then **fdc.nal.usda.gov #1**, WebMD, Healthline | none — zero-click |
| 6 | `how much fiber in chia seeds` | **yes** | 10 | AI Overview + USDA panel, then **fdc.nal.usda.gov #1**, Verywell, Harvard, PMC | none — zero-click |
| 7 | `cheapest source of protein` | **yes** | **9** | **reddit.com #1**, Facebook, Healthline, Houston Methodist, GoodRx, AARP, Men's Health, a beehiiv newsletter | forum + generic listicle |
| 8 | `cheapest protein sources` | **yes** | 16 | **reddit.com #1**, YouTube, Threads, thebodybuildingdietitians, predatornutrition, dontwastethecrumbs | forum + small blogs |
| 9 | `cheapest high fiber foods` | **yes** | 10 | Reddit, **Mayo Clinic, cancer.gov**, EatingWell, Metamucil | **Google ignores "cheapest" and serves the health SERP** |
| 10 | `high protein fast food` | **yes** | 14 | mattsfitchef.com, thedietchefs.com, masonfit.com, eatthis.com, PureWow, Reddit, Instagram | small blog listicle |
| 11 | **`protein per dollar fast food`** | **yes** | **12** | macromatefastfoodhacks.com, trainwithdaveoc.com, prospre.io, Reddit, TikTok, **efficiencyiseverything.com** | **no incumbent at all** |
| 12 | `protein per dollar` | **yes** | 13 | Reddit #1, **efficiencyiseverything.com #2**, optimisingnutrition, Etsy, egglandsbest | the incumbent, plus noise |
| 13 | `cheapest protein at walmart` | **yes** | 11 | Reddit, Facebook, walmart.com, **garagegymreviews, barbend, illuminatelabs** (all protein *powder*) | supplement review |
| 14 | `high fiber fast food` (our best query) | **yes** | **9** | moderatelymessyrd.com, kellyabramsonrd.com, EatingWell, Reddit, Tasting Table, Parade | small RD blog |

**AI Overview appeared on 12 of 14.** The two exceptions were replaced by
something worse for us: Google's own USDA-sourced nutrition panel.

### 2.2 Three findings that change the plan

**(a) The `how much X in Y` family is owned by Google and USDA directly.**
This is the family with the highest engine agreement I measured (61%), 377
on-topic queries, and it is structurally unwinnable at the head. Google renders
a nutrition panel with a food picker and a serving-size picker, captioned
*"Sources include: USDA"*, above everything, and `fdc.nal.usda.gov` ranks #1
organic underneath it. **Naming it as the brief asked: this family is owned by
USDA itself and is not winnable.** Chasing it head-on would be chasing a
zero-click SERP against the data's own publisher.

**(b) `foods high(est) in X` splits in two, and the half we can answer is the
half we cannot win.** For **protein** the SERP is a content SERP — myfooddata's
*article* is #1 and beatable-shaped sites sit around it. For **fiber** it is a
YMYL health SERP: Mayo Clinic, NCI, DietaryGuidelines.gov, VA.gov, Houston
Methodist. A pseudonymous non-clinical publisher does not displace
`cancer.gov` on a fiber-and-health query. And the four nutrients Google ranks
*above* protein and fiber — iron, magnesium, potassium, calcium — we hold no
data for at all.

**(c) `cheapest` is not an intent Google recognises in the fiber family.**
`cheapest high fiber foods` returns Mayo Clinic, cancer.gov and Metamucil — the
identical result set to `foods high in fiber`. Google folds the cost modifier
into the health SERP. **On fiber, the price angle does not open a door; it just
puts us on a door we cannot open.** On protein and on fast food it does open one
(rows 7, 8, 10, 11, 14 are all weak SERPs). That asymmetry is the single most
actionable thing in this section.

### 2.3 Where the SERP is genuinely weak

Ranked by weakness (fewest distinct organic domains, no institution present, no
dedicated database site):

1. **`protein per dollar fast food`** — 12 domains, all hobby blogs and social.
   No incumbent. We hold `fastfood-protein-per-dollar-2026.csv`.
2. **`high fiber fast food` / `high protein fast food`** — 9 and 14 domains, all
   small RD or fitness blogs. **Notably `fastfoodnutrition.org` (~130K/mo) does
   not rank on either** — it publishes per-item pages, not the ranked list the
   query wants.
3. **`cheapest source of protein` / `cheapest protein sources`** — 9 and 16
   domains, Reddit #1 on both. The AIO's primary cited source is
   `caloriescanai.com`, a calorie-app content blog with no authority story.

These three are the openings. Everything else in the table is owned.

---

## 3. The openings — and the families that are not winnable

### 3.1 What we hold, counted exactly

Counted from `public/data/*.csv` today. This is narrower than the strategy has
been assuming and it constrains everything below.

| Asset | Extent |
|---|---|
| Unique foods priced | **165** (474 rows, 22 CSVs) |
| Foods with a **nutrient-density** column | **79** — 49 with `protein_g_per_100g`, 53 with `fiber_g_per_100g`, 23 in both |
| Nutrients covered | **2** — protein and fiber. Nothing else. |
| **Calories** | **none, anywhere** |
| Iron / magnesium / potassium / calcium / vitamins | **none** |
| Protein *quality* | 25 foods with DIAAS + method + source — genuinely rare |
| Fast food | **30 items, 7 chains**, each with a cited nutrition source and a dated price basis |
| Price basis | Walmart Great Value, 2026, stated per row |

### 3.2 The incumbent is stronger than the brief assumed — on nutrients

`efficiencyiseverything.com`, read live today. It is **not a food site**: food is
one of three pillars ("Save Money") alongside time-saving and lifestyle content,
so the ~4,800 visits/month is *not* all food traffic — the per-dollar food family
is smaller than that figure suggests. Its own front page rates *Protein Per
Dollar List* at **two stars**.

But its flagship food asset is *"Ultimate Low Cost Healthy Food Guide — 44 Micro
Nutrients Per Dollar"*, and it also runs per-chain pages such as *"Wendy's Menu —
Calories per Dollar and Protein Per Dollar"*. **So the claim "cost-per-nutrient
is our unique asset" is only half true.** Someone has been computing
cost-per-nutrient across ~37–44 micronutrients for a decade, and across fast-food
chains. We compute it across **two**.

What we hold that they demonstrably do not:
- **Dated 2026 prices with a named retailer and a per-row source string.** Their
  lists carry no visible collection date or retailer on the pages I could reach.
- **Fiber per dollar.** Their coverage is calories, protein and micronutrients.
- **DIAAS-adjusted protein per dollar** (25 foods). I have found no other public
  dataset that multiplies grams-per-dollar by digestibility score.
- **Fast food with 2026 prices sourced per item.** Their chain pages exist, but
  the site's editorial line is explicitly *"avoid fast food"*, so the chain pages
  are an afterthought — and neither they nor `fastfoodnutrition.org` ranked on
  `high protein fast food` or `high fiber fast food` today.

### 3.3 Family-by-family verdict

| Family | Opening? | Why |
|---|---|---|
| `how much protein/fiber/calories in X` (377 / 354 / 407 queries) | **NO — owned by USDA itself** | Google renders its own USDA-sourced nutrition panel with food and serving pickers above all results, and `fdc.nal.usda.gov` ranks #1 organic. Zero-click by construction. **Named as unwinnable, as the brief asked.** |
| `foods high(est) in fiber` | **NO** | Mayo Clinic, NCI, DietaryGuidelines.gov, VA.gov, Houston Methodist, AICR. YMYL health SERP. A pseudonymous non-clinical author does not displace `cancer.gov`. |
| `best foods for {condition}` (390 queries) | **NO** | Eight of Google's ten top completions are medical conditions. SERP is Hopkins / MedlinePlus / NIDDK / CHOP / eatright.org. This is the family myfooddata's "Healthy Eating" articles serve, and they have an RD byline and 15 years of links. |
| `foods high(est) in iron / magnesium / potassium / calcium` | **NO — no data** | These are Google's #1–#4 completions for the biggest nutrient family. We hold zero numbers for any of them. Not a positioning problem; an inventory problem. |
| `how many calories in X` (407 queries — largest measured) | **NO today, YES with one data addition** | We have no calorie column. See §5.4. |
| `foods highest in protein` | **MARGINAL** | myfooddata #1, then Harvard/Hopkins/Cleveland Clinic. Beatable page *type* (a list article), unbeatable authority set. Worth a page as a hub, not as a ranking bet. |
| **`{X} protein/fiber per dollar` at fast-food chains** | **YES — best opening found** | 12 distinct domains on `protein per dollar fast food`, all hobby blogs and social. Neither `fastfoodnutrition.org` (~130K/mo) nor the AIO's cited sources carry dated 2026 prices. We have 30 items, 7 chains, sourced per row. |
| **`high protein / high fiber fast food`** | **YES** | 9 and 14 domains, small RD and fitness blogs only. **This is already our best-performing query** (`high fiber fast food`, 28 impressions, position 16.7) — we are ranking on the weakest SERP we measured, which is exactly what you would predict. |
| **`cheapest protein sources` / `cheapest source of protein`** | **YES, but small** | Reddit #1, AIO cites a calorie-app blog. Genuinely open. But 151–165 on-topic queries and the tail is 60% protein *powder*, which the voice guide bans. Take the page; do not build a wing on it. |
| `cheapest protein at {retailer}` | **MARGINAL** | Real modifier demand (walmart, aldi, costco, trader joe's) and our price basis *is* Walmart. But today's SERP is captured by supplement reviewers. Winnable only if we make the food intent unmistakable in the title. |
| `cheapest high fiber foods` | **NO** | Google discards "cheapest" and returns the Mayo/cancer.gov health SERP. **The price angle is irrelevant here** — this is the clearest case in the report of a differentiator that does not differentiate. |
| `protein per dollar` (19 queries) | **HELD, NOT GROWN** | efficiencyiseverything is #2 behind Reddit; we do not appear. 19 on-topic queries total. Keep the existing pages, stop building here. |

### 3.4 Where the price angle is a real differentiator, stated plainly

**It is a differentiator only where the food is bought as a priced unit and the
buyer is choosing between units.** That is: fast-food menu items, and
protein-source shopping decisions.

**It is irrelevant** wherever the query is a health question (fiber, gut health,
constipation), because Google resolves those to medical authority, and wherever
the query is a nutrient lookup, because Google answers those itself from USDA.

The site has been built on the assumption that cost-per-nutrient differentiates
everywhere. Measured, it differentiates in about a fifth of the surface.

---

## 4. The architecture — what myfooddata's shape becomes at 165 foods

### 4.1 The comparison, stated fairly

myfooddata runs **~151 hand-written articles** (counted live today from its
articles index: 9 categories — Popular 10, Vitamins 20, Minerals 26, Protein 12,
Amino Acids 11, Healthy Eating 28, Fats & Carbs 20, Calories & Fiber 18, Other 6)
above a generated tool layer at
`tools.myfooddata.com/nutrient-ranking-tool/{nutrient}/{food-group}/{direction}`.

The editorial layer exists to rank; the generated layer exists to catch the tail
and to give the editorial layer somewhere to link. **Both layers are powered by
the full USDA FoodData Central corpus and ~40 nutrients.** We have 165 foods and
2 nutrients. The shape does not transfer by analogy — it has to be re-derived.

### 4.2 The measured programmatic inventory

I probed autocomplete for every one of the 78 distinct foods that have both a
nutrient-density number and a price (`scratchpad/qfp_arch.py`, ~230 live calls):

| Test | Result |
|---|---|
| Foods with ≥1 `how much protein in {food}` completion | **71 of 78** (453 distinct completions) |
| Foods with ≥1 `how much fiber in {food}` completion | **67 of 78** (415 completions) |
| Foods with ≥1 `{food} vs …` completion | **70 of 78** (590 completions) |
| Foods with demand on any of the three | **74 of 78** |
| Sampled `{A} vs {B}` completions where **both sides are priced by us** | **93 of 379** (~25%) |

So the honest defensible URL count:

| Page kind | Defensible count | What makes it non-duplicative |
|---|---:|---|
| Per-food value page | **74** | price per 100 g at a named retailer on a stated date, $ per gram of nutrient, rank within its category, what $1 buys, nearest cheaper substitute at equal nutrient. **None of those five numbers is in USDA or on Google's panel.** |
| `{A} vs {B}` comparison | **~93–150** | a computed verdict — which one delivers more nutrient per dollar, and by how much — not two nutrition tables side by side |
| Category ranking | **9** | only categories with ≥6 priced rows: protein — meat & poultry (11), grains & pantry (9), dried beans & lentils (7), eggs & dairy (6); fiber — whole grains (11), fresh fruit (9), fresh vegetables (8), dried beans & peas (7), nuts & seeds (6) |
| Fast-food chain page | **7** | McDonald's 6 items, KFC 5, Taco Bell 5, Chipotle 4, Wendy's 4, Subway 3, Chick-fil-A 3, each with a dated 2026 price and a cited nutrition source |
| **Total** | **~183–240** | |

### 4.3 The decision

**165 foods cannot support a programmatic layer in the myfooddata sense.** 240 is
not a programmatic corpus; it is a second editorial tier that happens to be
template-generated. The prior report set ~300 as the go/no-go threshold and the
measured number lands below it.

But that is not the decisive argument. **This one is:**

> Search Console, 2026-07-10: **132 indexed, 486 not indexed.** The site already
> cannot get four fifths of its existing URLs into the index.

Adding 240 template pages to a site with 486 unindexed URLs does not produce 240
new entry points. It produces 240 more unindexed URLs, dilutes the crawl signal
further, and hands Google's scaled-content-abuse policy a much cleaner target
than 227 hand-written articles ever were. **Building the computed layer now would
make the actual bottleneck worse.**

### 4.4 The architecture I would actually build

**Three tiers, and the third is gated.**

**Tier 1 — Editorial, ~12 pages.** Hand-written, each aimed at one measured
weak SERP from §2.3. This is where every winnable query in this report lives.
Not templated, not generated, each one a page a food editor would publish.

**Tier 2 — Computed hubs, 9–16 pages.** The category rankings and the fast-food
chain pages. Template-generated but each one is a complete ranked table with a
stated methodology and a dated price basis — the format that already earns the
site AI citations (per `missed-levers` §Lever 3). Small enough to be crawled and
indexed, large enough to give Tier 1 somewhere to link.

**Tier 3 — Per-food and comparison pages, ~170. DO NOT BUILD YET.**
Gate: **do not create a single one until the indexed count crosses ~250 of the
existing URL set.** Until then, every page added is a page that will not be
indexed, and the marginal risk is higher than the marginal reward.

When the gate opens, build the ~93 comparison pages **before** the 74 food pages.
A comparison page carries a computed verdict USDA cannot produce; a single-food
page carries three computed numbers wrapped around one number Google already
displays above the results. **The comparison page is further from the thin-content
line, not closer.**

**Where the line is.** A page crosses into scaled-content abuse when the value it
adds over the source is formatting. Concretely, for this site: a page that says
"black beans have 8.7 g fiber per 100 g" is USDA reprinted and Google will treat
it that way. A page that says "black beans deliver 62 g of fiber per dollar at
Walmart in July 2026, ranking 4th of 53 foods we priced, and canned black beans
deliver 19 — you pay 3.2× more for the can" is a computation nobody else
publishes. **The test is one sentence: does the page contain a number that did
not exist before we computed it?** If no, do not publish it.

---

## 5. The plan

### 5.1 The one measured fact that sets the order

Search Console export in hand (2026-04-29 → 2026-07-26, 89 days):

| | |
|---|---:|
| Total clicks | **6** |
| Total impressions | **2,496** |
| Queries with any impression | 484 |
| Pages with any impression | 113 |
| Current run rate | **~6 impressions/day, 0 clicks** |

Of the 113 pages with any impressions, the top one is
`/high-fiber-fast-food-options-guide/` at **341 impressions, average position
15.09** — and the same page **also appears as a second GSC row without the
trailing slash** at 116 impressions, position 10.28. That is one page splitting
its own signal across two URLs, and it is the only page on this site with proven,
repeated demand. **Fixing that is worth more than any new article.**

The demand the site already has is concentrated in exactly the family §2 found to
have the weakest SERP: fast food. That is not a coincidence to be admired, it is
the plan.

### 5.2 The first ten things to build, in order

| # | Build | Target query | Why we can win it |
|---:|---|---|---|
| 1 | **Consolidate `/high-fiber-fast-food-options-guide/`** to one canonical URL and render **all** of `fastfood-protein-per-dollar-2026.csv` in visible HTML | `high fiber fast food` (28 impr, pos 16.7), `best fiber fast food`, `fast food with fiber` | Already ranking. 9-domain SERP of small RD blogs. The page is currently splitting 457 impressions across two URLs and publishing fewer rows than we hold. Zero new writing. |
| 2 | **`/fast-food-protein-per-dollar/`** — full 30-row table, per-row price date and nutrition source, methodology block | `protein per dollar fast food`, `high protein fast food`, `cheapest protein fast food` | **Weakest SERP measured**: 12 domains, all hobby blogs and social. `fastfoodnutrition.org` does not rank here. Nobody publishes dated 2026 chain prices joined to protein. |
| 3 | **7 chain pages**, `/{chain}-protein-per-dollar/` | `protein per dollar taco bell`, `protein per dollar mcdonald's`, `protein per dollar chick fil a` — **all three are literal Google autocomplete completions** | Directly measured demand, our data is per-chain already, and the only competitor with chain pages (efficiencyiseverything) editorially recommends avoiding fast food. |
| 4 | **`/cheapest-protein-sources/`** — food only, supplements explicitly excluded and said so on the page | `cheapest protein sources` (Google's #1 completion for `cheapest protein`), `cheapest source of protein` | Reddit is #1 on both; the AI Overview's primary cited source is `caloriescanai.com`, an app blog with no authority. 9–16 domain SERP. We have 49 priced protein foods and DIAAS on 25. |
| 5 | **9 category ranking pages** (4 protein, 5 fiber — only categories with ≥6 priced rows) | `cheapest meat protein`, `highest fiber whole grains`, `cheapest beans for protein` etc. | Each is a complete ranked table with a dated basis. This is the format that is already earning the site AI citations. Cheap: the data is computed, the work is templating. |
| 6 | **`/foods-highest-in-protein/`** as an entity hub, not a ranking bet | `foods highest in protein` | myfooddata is #1 and Harvard/Hopkins surround it — we will not take this. Build it anyway as the page every fast-food and category page links up to, so the cluster has a head. **Expected direct traffic: ~0. Say so in the plan rather than discovering it later.** |
| 7 | **`/cheapest-protein-at-walmart/`** | `cheapest protein at walmart` (+ aldi, costco, trader joe's variants) | Our entire price basis *is* Walmart Great Value — the only site for which this title is literally true. Risk stated: today's SERP is captured by protein-powder reviewers, so the title and H1 must make "food, not powder" unmistakable. |
| 8 | **Acquire the calorie column** (§5.4) | unlocks `calories per dollar`, `protein as % of calories`, `cheapest calories` | The largest family measured (407 queries). Also completes every table we already publish. |
| 9 | **`/protein-per-dollar-vs-per-calorie/`** — the DIAAS + calorie-adjusted ranking, once #8 lands | `best protein per dollar`, `protein per dollar ratio` | Nobody else multiplies grams-per-dollar by digestibility. This is the most genuinely unique number we own, and it is currently buried in one CSV. |
| 10 | **~93 `{A} vs {B}` comparison pages — GATED** | `black beans vs pinto beans`, `canned tuna vs chicken breast`, `brown rice vs quinoa` — all autocomplete-verified with both sides priced | **Do not start until the indexed count crosses ~250.** Then build these before any single-food pages, for the reason in §4.4. |

Items 1–3 use data that already exists and require no new writing. Items 1–5 are
roughly two weeks of work.

### 5.3 What to stop

- **Stop writing "per dollar" pages outside fast food.** 19 on-topic queries in
  the whole family. The six existing per-dollar study pages are enough; keep
  them, do not extend the wing.
- **Stop treating the price angle as universal.** On fiber-and-health queries
  Google discards the cost modifier entirely (§2.2c).
- **Do not chase `best foods for {condition}`.** 390 queries, and the SERP is
  Hopkins / MedlinePlus / NIDDK. Writing into it produces YMYL pages a
  pseudonymous author cannot rank and should not want to.

### 5.4 The data we would need to acquire

**The calorie column — what it would actually take.**

Source: USDA FoodData Central publishes full CSV exports (SR Legacy, Foundation
Foods, FNDDS) as free public-domain downloads. Energy in kcal per 100 g is
present for effectively every food we price. *(Checked: the repo has empty
placeholder directories for an SR Legacy dump but no actual data — this has been
started and abandoned before.)*

The work is **not acquisition, it is matching**, and matching honestly:

1. Assign each of the 165 priced foods an explicit FDC food ID. This must be
   hand-verified per row, because the failure modes are silent: raw vs. cooked
   (dry pinto beans are 347 kcal/100 g, cooked 143), the edible-fraction question
   we already handle for protein and fiber, and brand items with no FDC match.
2. Store `fdc_id`, `fdc_description`, `fdc_dataset` and `fdc_version` alongside
   the kcal value, so every number is traceable to a row in a public dataset.
3. Where no honest match exists, leave the cell empty. **An empty cell is
   defensible; an approximated calorie count in a dataset whose whole value
   proposition is auditability is not.**

Cost: about one working day for 165 rows, plus a re-run of the derived studies.
No money.

**What it unlocks:** calories per dollar (the largest family measured);
protein-as-percentage-of-calories, which the small competitors ranking above us
already publish per row and we do not; calorie density; and it completes the
fast-food table, where calories are the number people actually compare.

**The micronutrients — cheap to add, low value to have.** Iron, magnesium,
potassium and calcium come from the same FDC join at the same cost. They are
Google's #1–#4 completions for `foods high(est) in X`. **But §2 measured those
SERPs as institutional YMYL — Mayo, NCI, cancer.gov.** Adding the data would let
us answer queries we still could not rank for. Do it after calories, or not at
all; do not do it first because the family looks big.

**What would actually change the ceiling: more priced foods, not more nutrients.**
165 foods is the binding constraint on every programmatic option in §4. Going to
1,000+ priced foods is a paid-data or long-collection problem with no free
shortcut, and it is the same conclusion `missed-levers-2026-07-27.md` reached.
Nothing measured today changes it.

---

## 6. The honest forecast

### 6.1 Domain ages — measured today via RDAP, not estimated

| Domain | Registered | Age | Where it sits |
|---|---|---:|---|
| **daily-life-hacks.com** | **2026-01-24** | **6 months** | — |
| `proteinbro.net` | 2026-03-07 | **5 months** | quoted in synthesized answers on our core query |
| `caloriescanai.com` | 2025-05-29 | **14 months** | **the AI Overview's primary cited source** on `cheapest source of protein` and `cheapest protein sources` |
| `macromatefastfoodhacks.com` | 2025-08-06 | **12 months** | #2 organic on `protein per dollar fast food` |
| `moderatelymessyrd.com` | 2023-06-27 | 3 years | #1 on `high fiber fast food` |
| `efficiencyiseverything.com` | 2014-10-25 | **11.8 years** | owns `protein per dollar` |
| `myfooddata.com` | 2013-10-20 | **12.8 years** | #1 on `foods highest in protein` |

**This is the most useful pair of facts in the report.** The SERPs §2.3 flagged
as weak are being won *right now* by domains 5, 12 and 14 months old. The SERPs
§3.3 flagged as unwinnable are held by domains 12 years old and by
`cancer.gov`. The dividing line is not effort or quality — it is which pond.

**The site is 6 months old.** It has not been penalised, suppressed or
mismanaged. It is young, and it has been aiming at the twelve-year ponds.

### 6.2 Where it actually stands, measured

89 days of Search Console (2026-04-29 → 2026-07-26): **6 clicks, 2,496
impressions**, current run rate **~6 impressions/day and zero clicks**. 132 URLs
indexed, 486 not indexed. No backlinks. Pen-name author. AI Overview present on
**12 of the 14 SERPs** measured today.

### 6.3 Time to first movement

| Milestone | Realistic date | Why |
|---|---|---|
| New pages indexed | **4–10 weeks after publish** | The site indexes badly today — 486 of 618 URLs are not in. Assume the slow end. |
| First *impression* movement on the fast-food cluster | **October 2026** | ~3 months from publish is the fastest credible ranking response for a 6-month domain with no links. |
| First *click* movement | **December 2026 – February 2027** | Impressions move first, and with an AIO on nearly every SERP, clicks lag impressions by months. |
| **Anything visible before October 2026** | **No.** | Anyone who promises otherwise is guessing. |

**Watch impressions, not clicks, until 2027.** With AI Overviews on 12 of 14
SERPs, clicks are a lagging and heavily suppressed indicator. Impressions will
tell you whether the strategy is working four to eight weeks before clicks do.

### 6.4 The numbers

**At 6 months (≈ January 2027, domain age 12 months), if items 1–5 ship:**

| | Impressions/mo | Clicks/mo |
|---|---:|---:|
| Bad case (indexation stays broken) | 200–500 | **0–10** |
| Most likely | 1,000–3,000 | **20–80** |
| Good case (fast-food cluster catches) | 4,000–8,000 | **80–200** |

Basis: `/high-fiber-fast-food-options-guide/` alone already produces ~150
impressions/month at average position 15 on a 9-domain SERP. Nine more pages
aimed at the same weak family, with data none of the incumbents publish, is a
5–20× impression multiple on that single page — not a 100× one.

**At 12 months (≈ July 2027, domain age 18 months), if the calorie column lands
and the comparison layer opens:**

| | Visits/mo |
|---|---:|
| Bad case | 50–200 |
| **Most likely** | **300–1,200** |
| Good case | 1,500–3,000 |

**The ceiling, and why it is where it is.** `efficiencyiseverything.com` has
11.8 years, a YouTube channel, 35,000 newsletter subscribers, and three content
pillars — and gets ~4,800 visits/month. Our reachable subset (fast-food
cost-per-nutrient, cheapest protein foods, category rankings) is **a fraction of
their surface**, because the families §3.3 ruled out — `foods high in X`,
`best foods for X`, `how much X in Y` — are the ones that carry the volume, and
they are held by USDA, Mayo Clinic and cancer.gov.

**So: 3,000 visits/month at 18 months is the realistic good case, and 1,000–1,500
is the number to plan against.** Not 300,000. Not 30,000. myfooddata's 300K
requires ~40 nutrients across the full USDA corpus and a twelve-year-old domain;
we have two nutrients across 165 foods and six months.

### 6.5 What would break the forecast — in each direction

**Downward:**
- The 486 unindexed URLs are a site-level quality signal, not a crawl backlog. If
  so, publishing more pages makes it worse and the bad case becomes the base case.
- AI Overview coverage keeps rising. At 12 of 14 today, there is not much room
  left, but CTR under an AIO can still fall further.
- The fast-food price data goes stale. Chain prices move fast; a table dated
  Dec 2025 in mid-2027 is worse than no table, and *dated accuracy is the entire
  differentiator*.

**Upward — and this is the honest tail:**
- One pickup by a personal-finance or food journalist during an inflation news
  cycle changes the authority trajectory, and the dataset is genuinely
  quotable. This is low-probability and high-magnitude. It cannot be planned
  against, only made possible.
- `caloriescanai.com` went from registration to *primary AI Overview citation on
  our core query* in about 12 months. That path exists and it is documented above.

### 6.6 The one-paragraph version

The site is six months old and has been pointed at query families owned by
twelve-year-old domains, by Mayo Clinic and by USDA itself. Measured today, the
"per dollar" doorway supports **19** distinct queries where "how much protein in
X" supports **377** — but that 377 is answered by Google's own USDA panel and is
zero-click, so the answer is not simply to swap doorways. The genuine opening is
narrower and more specific than either framing: **fast-food cost-per-nutrient and
cheapest-protein-food queries, where the SERPs have 9–14 domains, no institution,
no database site, and are currently being won by domains 5 to 14 months old.**
We hold 30 sourced fast-food items and 49 priced protein foods, and our single
best-performing page is already in that family. Build the ten things in §5.2,
fix the indexation before adding the 170-page computed layer, expect nothing
visible before October 2026, and plan against **1,000–1,500 visits/month at
eighteen months** — with a real but unplannable tail above it.

---

*Compiled 2026-07-28. Research and planning only. No articles written, no site
source edited, no commits. Measurement artefacts: `scratchpad/qfp_probe.py`,
`qfp_family_size.json`, `qfp_arch.py`, `qfp_arch.json`; 14 live Google SERPs read
through a rendering browser; RDAP lookups for 7 domains; Search Console export
2026-04-29 → 2026-07-26.*
