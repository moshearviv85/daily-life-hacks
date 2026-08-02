# T1 — Cascade map: blast radius of the `public/data/` corrections

**Generated:** 2026-08-02
**Scope:** every restatement of a changed dataset value across `src/data/articles/*.md`, `src/pages/**`, `src/content/**`, `public/data/*.json`, and sibling CSVs.
**Status of this file:** reporting only. No file was edited. No git, build, or deploy command was run.

`EXTRACTION SURFACE` marks frontmatter `quickAnswer`, `excerpt`, `faq[*]`, or a heading — the strings AI assistants lift into FAQPage JSON-LD and answer boxes. Those are the ones that ship wrong answers downstream.

---

## 0. What actually changed (source of truth for everything below)

Confirmed by `git diff public/data/`. Nine value changes plus fourteen rank moves and twenty status changes.

### Fiber flagship — `public/data/fiber-per-dollar-2026.csv`

| Food | Field | Old | New |
|---|---|---|---|
| Popcorn kernels | `fiber_g_per_100g` | 14.5 | **12.9** |
| Popcorn kernels | `fiber_g_per_dollar` | 57.7 | **51.3** |
| Popcorn kernels | rank / status | 5 / unresolved | **7 / proxy (FDC 167959)** |
| Canned black beans | `fiber_g_per_100g` | 5.6 | **6.9** |
| Canned black beans | `fiber_g_per_dollar` | 27.9 | **34.4** |
| Canned black beans | rank / status | 15 / unresolved | **10 / proxy (FDC 175188)** |
| Canned chickpeas | `fiber_g_per_100g` | 4.8 | **4.4** |
| Canned chickpeas | `fiber_g_per_dollar` | 21.5 | **19.7** |
| Canned chickpeas | status | unresolved | **exact (FDC 175206)** |
| Frozen green beans | `fiber_g_per_100g` | 2.7 | **2.6** |
| Frozen green beans | `fiber_g_per_dollar` | 11.2 | **10.8** |
| Frozen green beans | status | unresolved | **exact (FDC 169962)** |
| Apples (gala) | `fiber_g_per_100g` | 2.4 | **2.3** |
| Apples (gala) | `fiber_g_per_dollar` | 7.7 | **7.3** |
| Apples (gala) | rank / status | 41 / unresolved | **42 / exact (FDC 168204)** |
| Oranges (navel) | `fiber_g_per_100g` | 2.4 | **2.2** |
| Oranges (navel) | `fiber_g_per_dollar` | 6.7 | **6.2** |
| Oranges (navel) | rank / status | 45 / unresolved | **47 / exact (FDC 169917)** |
| Frozen shelled edamame | status | proxy (168411) | **unresolved** (value 5.2 / 8.3 unchanged) |

Rank-only moves (values unchanged): barley 6→5, navy 7→6, chickpeas dry 10→11, brown lentils 11→12, chia 12→13, bran flakes 13→14, flaxseed 14→15, kale 42→41, russet 46→45, raisins 47→46.
Status-only moves: dry roasted peanuts, peanut butter, canned pumpkin, frozen broccoli florets, yellow onions — all unresolved → proxy.

### Protein flagship — `public/data/protein-per-dollar-2026.csv`

| Food | Field | Old | New |
|---|---|---|---|
| TVP | `protein_g_per_100g` | 50.0 | **52.17** |
| TVP | `protein_g_per_dollar` | 22.5 | **23.4** |
| TVP | rank / status | 32 / unresolved | **31 / proxy (manufacturer label, no FDC ID)** |
| Canned kidney beans | rank | 31 | **32** |

Status-only moves: peanut butter, white rice, spaghetti, dry roasted peanuts, canned black beans, canned chickpeas → proxy; whole milk, cottage cheese, whole chicken → exact.

### Child CSVs already updated in the same commit
`fiber-day-cost` (chickpeas 10.6→9.7, black beans 12.3→15.2), `protein-day-cost` (McDonald's 3.79→5.35, 3.19→3.99, 2.99→3.89), `grains-fiber-per-dollar-ranked`, `high-fiber-snacks-per-dollar`, `one-dollar-fiber-what-it-buys`.

### Audit-count totals (verified by re-counting both CSVs)

| | Was (HEAD) | Now |
|---|---|---|
| Fiber (53 rows) | 38 exact / 4 proxy / 11 unresolved | **42 exact / 10 proxy / 1 unresolved** |
| Protein (49 rows) | 36 exact / 5 proxy / 8 unresolved | **39 exact / 10 proxy / 0 unresolved** |
| Combined (102 rows) | 74 exact / 9 proxy / 19 unresolved | **81 exact / 20 proxy / 1 unresolved**, 100 rows carry an FDC ID |

### Arithmetic check (required by the brief)
`(nutrient/100) · package_weight_g · edible_fraction / package_price_usd` reproduces the stated per-dollar figure on **49/49 protein rows and 53/53 fiber rows**, and `price/(weight/100)` reproduces `price_per_100g_usd` on all 102. **No pre-existing arithmetic defect.** Every changed row re-derives correctly:
popcorn 12.9/100 × 907 / 2.28 = 51.32 → 51.3 · canned black beans 6.9/100 × 439 / 0.88 = 34.42 → 34.4 · canned chickpeas 4.4/100 × 439 / 0.98 = 19.71 → 19.7 · green beans 2.6/100 × 907 / 2.18 = 10.82 → 10.8 · apples 2.3/100 × 454 × 0.9 / 1.28 = 7.34 → 7.3 · oranges 2.2/100 × 454 × 0.73 / 1.18 = 6.18 → 6.2 · TVP 52.17/100 × 283 / 6.30 = 23.43 → 23.4.

---

## P0 — Ships wrong data to machines. Fix before minting the DOI.

### P0-1 `public/data/api-index-v1.json` — the site renders the pre-audit numbers right now
The whole file is stale while stamping `"generated_at": "2026-08-02T00:00:00Z"`, which makes it look current. Verified stale entries:

| JSON path | field | stale | correct |
|---|---|---|---|
| `/rows/186/fields` | `rank`, `fiber_g_per_100g`, `fiber_g_per_dollar`, `nutrition_source_status` | 5, 14.5, 57.7, `unresolved` | 7, 12.9, 51.3, `proxy` |
| `/rows/196/fields` | same four (canned black beans) | 15, 5.6, 27.9, `unresolved` | 10, 6.9, 34.4, `proxy` |
| `/rows/200/fields` | same four (canned chickpeas) | 19, 4.8, 21.5, `unresolved` | 19, 4.4, 19.7, `exact` |
| `/rows/212/fields` | same four (frozen green beans) | 31, 2.7, 11.2, `unresolved` | 31, 2.6, 10.8, `exact` |
| `/rows/222/fields` | same four (apples gala) | 41, 2.4, 7.7, `unresolved` | 42, 2.3, 7.3, `exact` |
| `/rows/226/fields` | same four (oranges navel) | 45, 2.4, 6.7, `unresolved` | 47, 2.2, 6.2, `exact` |
| `/rows/393/fields` | canned black beans protein status | `unresolved` | `proxy` |
| `/rows/404/fields` | TVP `rank`, `protein_g_per_100g`, `protein_g_per_dollar`, status | 32, 50, 22.5, `unresolved` | 31, 52.17, 23.4, `proxy` |
| `/rows/407/fields` | canned chickpeas protein status | `unresolved` | `proxy` |
| `/rows/236, 246, 286` | `value` (popcorn, three child datasets) | 57.7 | 51.3 |
| `/rows/296` | `value` (canned black beans, one-dollar-fiber) | 27.9 | 34.4 |
| `/rows/335` | `value` (frozen green beans, produce ranked) | 11.2 | 10.8 |
| `/rows/39, 254, 341` | `value` (apples gala) | 7.7 | 7.3 |
| `/rows/345` | `value` (oranges navel) | 6.7 | 6.2 |
| `/rows/107, 324, 443` | `value` / `protein_g_per_dollar` (TVP) | 22.5 | 23.4 |
| `/rows/28, 30` | `fiber_g_per_dollar` (beans-double-win canned rows) | `null` | 34.4 / 19.7 (see P1-4) |

**Three live pages import this file directly** — `src/pages/food-value-database/index.astro:6`, `src/pages/research/index.astro:5`, `src/pages/statistics/index.astro:5` — so the public tables currently show pre-audit numbers.
**Fix:** regenerate with `node scripts/build-api-index.mjs`, but only *after* the derived CSVs in P1 are corrected, or the regeneration bakes in their staleness.

### P0-2 `public/data/datapackage.json` — one resource checksum fails against its own file
Verified all 23 resources with LF normalisation. Exactly one real mismatch (the other 16 apparent mismatches are CRLF artifacts of the Windows working tree and are **not** defects):

```
protein-day-cost-2026.csv
  stated: bytes 2448, sha256:aacd9c660d05fb8…   (matches HEAD, not the working file)
  actual: bytes 2787, sha256:f8d625925bb365c014f159ba20e1dd0c06890c6b2f3ff3b3f5d1bcd6e878eeec
```
The McDonald's price fix edited this CSV; its resource entry was never updated.

### P0-3 `public/data/datapackage.json` — fiber schema documents a row that does not exist
The fiber resource's `nutrition_source_url` field description still reads *"…or the current manufacturer page for the unresolved TVP label row."* **There is no TVP row in the fiber CSV.** The protein resource's equivalent wording was fixed in the same commit; this one was missed.

---

## P1 — Sibling CSVs that still carry the old values

### P1-1 `public/data/produce-fiber-per-dollar-ranked-2026.csv` — 3 stale values + re-sort
| Line | Food | stale | correct |
|---|---|---|---|
| 7 | Frozen green beans | 11.2 | **10.8** |
| 13 | Apples (gala) | 7.7 | **7.3** |
| 17 | Oranges (navel) | 6.7 | **6.2** |

Re-sort consequences: apples drops below chopped kale (7.5) → position 12 becomes 13; oranges drops below russet potatoes (6.6) → position 16 becomes 17. Green beans holds position 6.
Also note the unflagged `8.3` for frozen shelled edamame still flows into this file from a row the parent now marks `unresolved`.

### P1-2 `public/data/eggs-vs-everything-protein-value-2026.csv` — stale TVP row
Line 33: `TVP (textured vegetable protein),Soy & plant proteins,22.5,…` → **23.4**, and the row must move **above** canned kidney beans (23.4351 vs 23.3835 in the parent). The `price_basis` also still carries the removed suffix `; label value (USDA defatted soy flour: 51.5)`.

### P1-3 `public/data/plant-protein-per-dollar-ranked-2026.csv` — stale TVP row **(not in the independent audit)**
Line 14: `TVP (textured vegetable protein),Soy & plant proteins,22.5,…` → **23.4**, must move above canned kidney beans (currently listed at position 12, TVP at 13). Same stale `; label value (USDA defatted soy flour: 51.5)` suffix. This third file was missed by the audit, which named only `eggs-vs-everything` and `protein-quality`.

### P1-4 `public/data/protein-quality-per-dollar-2026.csv` — stale TVP row + derived column
Line 23: `TVP (textured vegetable protein),22.5,0.90,0.90,…,20.2,…` → `protein_g_per_dollar` **23.4**, `adjusted_g_per_dollar` **21.1** (23.4 × 0.90 = 21.06). Rank position 22 is unaffected (21.1 still sits below peanut butter's 21.8 and above whole wheat bread's 16.1).

### P1-5 `public/data/fiber-day-cost-2026.csv` — one row was missed in the same edit
The apple row was not recomputed when the gala value changed:
```
Day 5: Realistic mixed,Lunch,1 medium apple (180g),180,3.9,0.51,parent CSV: Apples (gala)
```
180 g × 0.9 edible × 2.3/100 = 3.726 → **3.7 g** (was 3.9 from 2.4). This is the same class of miss as the two rows that *were* fixed in this file.
**Recomputed day totals** (fiber only; costs unchanged):
- Day 2 no-cook: 8.2 + 3.1 + 1.6 + 2.8 + **9.7** + 5.4 = **30.8 g** (was 31.7)
- Day 5 realistic mixed: 5.1 + 3.1 + 3.1 + 1.6 + **3.7** + **15.2** + 3.0 = **34.8 g** (was 32.1)

### P1-6 `public/data/beans-double-win-fiber-protein-2026.csv` — blank fiber on canned rows
The three canned rows leave `fiber_g_per_dollar` empty while `value` means protein+fiber on the dry rows and protein-only on the canned ones. Now fillable from the corrected parent: canned black beans **34.4**, canned kidney beans **19.3**, canned chickpeas **19.7**; `value` becomes 64.5 / 42.7 / 41.7. Sort order is unaffected (all three stay below red lentils at 81.3). Currently `api-index-v1.json` `/rows/28` and `/rows/30` publish `fiber_g_per_dollar: null` for these.

### P1-7 `public/data/breakfast-staples-per-dollar-2026.csv` — stale apples row
Line 10: `Apples (gala),Fresh fruit,7.7,,7.7,per lb,1.28,Walmart` → `value` **7.3** and `fiber_g_per_dollar` **7.3**. Position (last) unaffected.

---

## P2 — Site pages (`src/pages/**`, `src/content/**`)

| File:line | Stale | Correct | Surface |
|---|---|---|---|
| `src/pages/methodology.astro:69` | "83 rows: 74 exact matches and 9 disclosed proxies… The other 19 flagship rows are unresolved" | **100 rows carry an FDC ID; 81 exact, 20 proxy, 1 unresolved across 102 flagship rows** (TVP is a manufacturer-label proxy with no FDC ID) | body |
| `src/pages/statistics/index.astro:194` | "38 exact matches, 4 close proxies, and 11 unresolved rows" | **42 exact, 10 proxy, 1 unresolved** | body |
| `src/pages/statistics/index.astro:208-209` | "Popcorn's 57.7-gram row is unresolved because its nutrition value is for air-popped popcorn while its price is for unpopped kernels" | Popcorn is now **proxy at 51.3 g/$** on a dry-matter conversion from FDC 167959; rewrite the caveat, do not just swap the number | body |
| `src/pages/food-value-database/index.astro:208-209` | "Popcorn's fiber row is unresolved because its 14.5 g/100 g value is for air-popped popcorn while its 57.7 g/$ price calculation uses unpopped kernels" | Same rewrite; values **12.9** and **51.3** | body |
| `src/pages/data/index.astro:153-155` | "Three published datasets carry the same recorded TVP product-label value; that row is unresolved because the current product page works out to about 52.2 rather than the recorded 50.0" | TVP is now **proxy at 52.17 / 23.4**, sourced to the manufacturer label; the "unresolved" framing is inverted | body |
| `src/pages/research/index.astro:8` | meta description: "…an unresolved recorded TVP label value…" | No longer unresolved | **EXTRACTION SURFACE** (meta description) |
| `src/pages/research/index.astro:134-136` | same TVP 52.2/50.0 "unresolved" block | as above | body |
| `src/pages/api-docs.astro:47` | meta description mentions the unresolved TVP row | as above | **EXTRACTION SURFACE** (meta description) |
| `src/pages/api-docs.astro:156-159` | TVP 52.2/50.0 "unresolved" block | as above | body |
| `src/pages/api-docs.astro:265-267` | TVP 52.2/50.0 "unresolved" block | as above | body |
| `src/pages/guides/index.astro:80-81` | TVP 52.2/50.0 "unresolved" block | as above | body |
| `src/content/datasets.ts:153-156` | `additionalSourceNote` "TVP is unresolved…"; `sourceAuditSummary` "36 exact USDA matches, 5 close USDA proxies, and 8 unresolved rows" | **39 exact, 10 proxy, 0 unresolved** | rendered into dataset schema |
| `src/content/datasets.ts:172-175` | grains: "Popcorn is unresolved: its 14.5-gram value…"; "9 exact, 1 proxy, 1 unresolved" | **9 exact, 2 proxy, 0 unresolved** | rendered into dataset schema |
| `src/content/datasets.ts:217-220` | snacks: "Popcorn is unresolved: its 14.5-gram value…"; "6 exact, 0 proxies, 4 unresolved" | **7 exact, 3 proxy, 0 unresolved** | rendered into dataset schema |
| `src/content/datasets.ts:254-257` | one-dollar-fiber: "Popcorn is unresolved: its 14.5-gram value…"; "12 exact, 1 proxy, 2 unresolved" | **12 exact, 3 proxy, 0 unresolved** | rendered into dataset schema |

### Every other child-dataset audit summary also changed
Recomputed by joining each child CSV back to the corrected flagships. Any `sourceAuditSummary` in `datasets.ts` or `*Source audit:*` footer in an article that quotes these must be reissued:

| Child dataset | Was | Now |
|---|---|---|
| grains-fiber-per-dollar-ranked | 9 exact / 1 proxy / 1 unresolved | **9 / 2 / 0** |
| high-fiber-snacks-per-dollar | 6 / 0 / 4 | **7 / 3 / 0** |
| one-dollar-fiber-what-it-buys | 12 / 1 / 2 | **12 / 3 / 0** |
| produce-fiber-per-dollar-ranked | 15 / 2 / 5 | **18 / 3 / 1** |
| beans-double-win-fiber-protein | 8 / 0 / 2 | **8 / 2 / 0** |
| breakfast-staples-per-dollar | 4 / 1 / 2 (+2 unjoined) | **6 / 1 / 0** (+2 unjoined) |
| eggs-vs-everything-protein-value | 36 / 5 / 8 | **39 / 10 / 0** |
| plant-protein-per-dollar-ranked | 13 / 0 / 5 | **13 / 5 / 0** |
| no-cook-protein-per-dollar | 8 / 2 / 5 | **10 / 5 / 0** |
| one-dollar-protein-what-it-buys | 11 / 0 / 4 | **11 / 4 / 0** |
| shelf-stable-pantry-per-dollar | 20 / 1 / 6 | **20 / 7 / 0** |
| canned-vs-dry-beans-cost | 8 / 0 / 2 | **8 / 2 / 0** |
| animal-protein-per-dollar-ranked | 15 / 5 / 1 | **18 / 3 / 0** |
| dairy-protein-per-dollar-ranked | 4 / 1 / 1 | **6 / 0 / 0** |
| meat-per-dollar-protein-ranked | 8 / 3 / 0 | **9 / 2 / 0** |
| protein-quality-per-dollar | 20 / 1 / 4 | **22 / 3 / 0** |

---

## P3 — Articles. Ordered by extraction risk.

> Per the brief, article markdown is **reported only** and is handled in a later phase. Nothing below was edited.

### P3-A `what-50-grams-of-protein-costs-per-day.md` — the worst single cascade
The McDonald's price fix invalidates the article's entire headline number. Day 4 total is now **5.35 + 3.99 + 3.89 = $13.23**, not $9.97.

| Line | Stale | Correct | Surface |
|---|---|---|---|
| 3 | excerpt: "from 82 cents to **$9.97**. Same protein, **12 times** the price" | **$13.23**, **16 times** (13.23/0.82 = 16.1) | **EXTRACTION — excerpt** |
| 15 | faq[0]: "Anywhere from 82 cents to $9.97… runs about $9.97" | $13.23 (×2) | **EXTRACTION — faq[0]** |
| 17 | faq[1]: "At the **$3.19** menu-price snapshot… the McDouble works out to about **7 grams per dollar**" | $3.99; 22/3.99 = **5.5 g/$** | **EXTRACTION — faq** |
| 19 | faq[2]: "cost **$9.97**, about **12 times** the 82-cent day and about **7 times** the $1.51 mixed day" | $13.23; **16 times**; **8.8 times** | **EXTRACTION — faq** |
| 23 | faq[4]: "the daily fast-food day about **$3,639**" | 13.23 × 365 = **$4,829** | **EXTRACTION — faq** |
| 26 | intro: "$9.97 if you let McDonald's do it… about 12 times the price" | $13.23; 16 times | body (lede) |
| 34 | "**$9.97**, if McDonald's builds it… about 12 times the money" | $13.23; 16 times | body |
| 52 | image alt: "…to a **$9.97** fast-food day" | $13.23 — **chart image itself must be regenerated** | alt text |
| 82 | "convenience from a drive-thru costs about **eight dollars more**" (vs the $2.05 no-cook day) | 13.23 − 2.05 = **$11.18**, "about eleven dollars more" | body |
| 96 | heading `## Day 4: The fast-food day ($9.97)` | **($13.23)** | **EXTRACTION — heading** |
| 102-104 | table: $3.79 / $3.19 / $2.99 | **$5.35 / $3.99 / $3.89** | body table |
| 105 | table total **$9.97** | **$13.23** | body table |
| 107 | "At the **$3.19** price… around **7 grams** of protein per dollar" | $3.99; **5.5 g/$** | body |
| 129 | "**The spread is 12x.** $0.82 to $9.97" | **16x**; $13.23 | body (bolded takeaway) |
| 131 | "The fast-food day costs **$9.97**" | $13.23 | body |
| 133 | "The drive-thru day costs **$9.15 more**" | 13.23 − 0.82 = **$12.41** | body |
| 135 | "about $299, $552, $749, $1,011, and **$3,639**… gap… about **$3,000** a year" | **$4,829**; gap 4829 − 552 = **$4,277** | body |
| 141 | image alt: "…to **$3,639** for daily fast food" | $4,829 — **chart image must be regenerated** | alt text |
| 116 | "handing a cheeseburger chain **three grand** a year" | nearly **five grand** | body |

### P3-B `what-30-grams-of-fiber-costs-per-day.md`
| Line | Stale | Correct | Surface |
|---|---|---|---|
| 79 | Day 2 table: canned chickpeas **10.6 g** | **9.7 g** | body table |
| 81 | Day 2 total **31.7 g** | **30.8 g** | body table |
| 21 | faq: "Yes, for about $1.74. Our no-cook day used… half a can of chickpeas…" — verify the gram total quoted in the full answer | Day 2 is now 30.8 g | **EXTRACTION — faq** |
| ~125 | Day 5 table: 1 medium apple **3.9 g** | **3.7 g** (see P1-5) | body table |
| 127 | Day 5 table: canned black beans **12.3 g** | **15.2 g** | body table |
| 129 | Day 5 total **32.1 g** | **34.8 g** | body table |
| 46 | "**Every day lands between 31 and 32.1 grams.**" | range is now **30.8 to 34.8 grams** | body (bolded takeaway) |
| — | Day 2 prose "it still clears 30 grams" | survives at 30.8, but by 0.8 g — re-read before shipping | body |

### P3-C `fiber-per-dollar-cheapest-high-fiber-foods.md` — the flagship article, table is the dataset
| Line | Stale | Correct | Surface |
|---|---|---|---|
| 42 | "links **38 of 53** values to exact USDA records and **4** to close proxies. The remaining **11**…" | **42 exact, 10 proxy, 1 unresolved** | body (methodology block) |
| 64 | `\| 5 \| Popcorn kernels \| 14.5 g \| $0.25 \| 57.7 g \|` | `\| 7 \| Popcorn kernels \| 12.9 g \| $0.25 \| 51.3 g \|` | body table |
| 74 | `\| 15 \| Canned black beans \| 5.6 g \| $0.20 \| 27.9 g \|` | `\| 10 \| … \| 6.9 g \| $0.20 \| 34.4 g \|` | body table |
| 78 | `\| 19 \| Canned chickpeas \| 4.8 g \| $0.22 \| 21.5 g \|` | `\| 19 \| … \| 4.4 g \| $0.22 \| 19.7 g \|` | body table |
| 90 | `\| 31 \| Frozen green beans \| 2.7 g \| $0.24 \| 11.2 g \|` | `\| 31 \| … \| 2.6 g \| $0.24 \| 10.8 g \|` | body table |
| 100 | `\| 41 \| Apples (gala) \| 2.4 g \| $0.28 \| 7.7 g \|` | `\| 42 \| … \| 2.3 g \| $0.28 \| 7.3 g \|` | body table |
| 104 | `\| 45 \| Oranges (navel) \| 2.4 g \| $0.26 \| 6.7 g \|` | `\| 47 \| … \| 2.2 g \| $0.26 \| 6.2 g \|` | body table |
| 122 | **RANK CLAIM** "The recorded row lands at **number 5**, but its 14.5-gram value describes air-popped popcorn… the 57.7-gram result cannot support a rank" | Popcorn now ranks **7** and is a disclosed proxy at 51.3; the entire "unresolved lead" paragraph is obsolete | body (bolded takeaway) |
| — | all rank numbers 5-15 and 41-47 shift (barley 6→5, navy 7→6, chickpeas dry 10→11, brown lentils 11→12, chia 12→13, bran flakes 13→14, flaxseed 14→15, kale 42→41, russet 46→45, raisins 47→46) | re-emit whole table | body table |

### P3-D `best-high-fiber-foods-ranked-by-fiber-content.md` — density table, needs re-sort
| Line | Stale | Correct | Note |
|---|---|---|---|
| 44 | Popcorn kernels **14.5 g** / "Not resolved" | **12.9 g** / proxy FDC 167959 | position unchanged (still between navy 15.3 and bulgur 12.5) |
| 61 | Canned black beans **5.6 g** / "Not resolved" | **6.9 g** / proxy FDC 175188 | **moves up 3**: now sits between quinoa 7.0 and avocado 6.7 |
| 65 | Canned chickpeas **4.8 g** / "Not resolved" | **4.4 g** / exact FDC 175206 | **moves down 1**: below frozen green peas 4.5 |
| 78 | Frozen green beans **2.7 g** / "Not resolved" | **2.6 g** / exact FDC 169962 | joins the 2.6 cluster |
| 82 | Apples (gala) **2.4 g** / "Not resolved" | **2.3 g** / exact FDC 168204 | **moves below blueberries 2.4** |
| 83 | Oranges (navel) **2.4 g** / "Not resolved" | **2.2 g** / exact FDC 169917 | **moves below apples 2.3** |
| ~59 | Frozen shelled edamame **5.2 g** "Frozen, prepared" + FDC 168411 | now **unresolved** — the FDC link and form must be removed | status inversion |
| various | "Not resolved · see CSV reason" on dry roasted peanuts, peanut butter, frozen broccoli florets, canned pumpkin, yellow onions | all now **proxy** with FDC IDs (174262, 174266, 169968, 168450, 170000) | status |
| ~86 | footer: "**38** rows have an exact match, **4** use a linked FDC proxy…" | **42 exact, 10 proxy, 1 unresolved** | body |

### P3-E `one-dollar-fiber-what-it-buys.md` — **rank inversion, whole framing breaks**
Canned black beans went from **last (15/15)** to **10th of 15**; whole flaxseed at 28.5 is now the last row.

| Line | Stale | Correct | Surface |
|---|---|---|---|
| 3 | excerpt: "…and **27.9g** as canned black beans. Here's what $1 buys across 15 foods." | **34.4 g**, and it is no longer the low anchor | **EXTRACTION — excerpt** |
| 13 | faq: "Even t[he bottom]…" — re-read; the bottom of the list is now flaxseed at 28.5 | rewrite | **EXTRACTION — faq** |
| 17 | faq: "Canned black beans **finished last** on this list at **27.9** grams… but last place here still means…" | **34.4 g**, finished **10th of 15**; last place is now whole flaxseed at 28.5 | **EXTRACTION — faq** |
| 21 | faq: "12 exact USDA matches, 1 close proxy, and **2 unresolved** rows. Popcorn is unresolved because…" | **12 exact, 3 proxy, 0 unresolved**; popcorn is a disclosed proxy | **EXTRACTION — faq** |
| 24 | "One dollar buys 77.8 grams… and **27.9 grams** if you spend it on canned black beans. That's the full range" | range low end is now **28.5 g** (flaxseed); black beans is 34.4 | body (lede) |
| 34 | table `\| 5* \| Popcorn kernels — unresolved form match \| 57.7 g recorded, not verified \|` | `\| 7 \| Popcorn kernels \| 51.3 g \|` (proxy, disclosed) | body table |
| 43 | source-audit footer "12 exact, 1 proxy, 2 unresolved… 57.7 g/$ is a recorded but unverified result" | **12 / 3 / 0**; 51.3 g/$ | body |
| 47 | "Rounding out the 15: bran flakes at 30.1, whole flaxseed at 28.5, and canned black beans at **27.9**" | canned black beans is no longer in the bottom three | body |
| 63 | **RANK CLAIM** "Canned black beans **finished fifteenth out of 15**, and they still deliver **27.9** grams" | **10th of 15** at **34.4 g** — sentence's whole point is gone | body |

### P3-F `high-fiber-snacks-per-dollar.md`
| Line | Stale | Correct | Surface |
|---|---|---|---|
| 13 | faq[0]: "The table records popcorn kernels at **57.7**, but that row is unresolved: its **14.5-gram** fiber value is for air-popped… We do not treat 57.7 as a verified winner." | Popcorn is now a disclosed **proxy at 51.3 g/$ (12.9 g/100 g)** and is still rank 1 in this subset — the "carrots lead among exact rows" framing needs rewriting | **EXTRACTION — faq[0]** |
| 17 | faq: "gala apples **7.7**" | **7.3** | **EXTRACTION — faq** |
| 24 | same popcorn paragraph in the lede | as above | body (lede) |
| 30 | table `\| 1* \| Popcorn kernels — unresolved form match \| 57.7 g recorded, not verified \|` | `\| 1 \| Popcorn kernels \| 51.3 g \|` | body table |
| 38 | `\| 9 \| Apples (gala) \| 7.7 g \|` | **7.3 g** | body table |
| 41 | footer "6 exact, 0 proxies, **4 unresolved**… 57.7 g/$ is a recorded but unverified result" | **7 exact, 3 proxy, 0 unresolved**; 51.3 | body |
| 47 | "the nutrition match used for the recorded **57.7-gram** result describes air-popped popcorn" | rewrite around 51.3 and the dry-matter conversion | body |
| 59 | "gala apples **7.7**" | **7.3** | body |

### P3-G `grains-fiber-per-dollar-ranked.md`
| Line | Stale | Correct | Surface |
|---|---|---|---|
| 13 | faq[0]: "The recorded popcorn result of **57.7** is unresolved…" | **51.3**, proxy; barley at 57.1 now genuinely outranks it | **EXTRACTION — faq[0]** |
| 15 | faq: "this dataset cannot verify **57.7** grams of fiber per dollar for kernels" | now a disclosed proxy at **51.3** | **EXTRACTION — faq** |
| 24 | lede: "The recorded popcorn result of **57.7** is unresolved" | **51.3** | body (lede) |
| 31 | table `\| 2* \| Popcorn kernels — unresolved form match \| 57.7 g recorded, not verified \|` | popcorn drops to **3**, barley takes **2** at 57.1; value **51.3** | body table + **RANK MOVE** |
| 42 | footer "9 exact, 1 proxy, **1 unresolved**… Popcorn's **14.5** g/100 g value… so **57.7** g/$ is recorded but unverified" | **9 exact, 2 proxy, 0 unresolved**; 12.9; 51.3 | body |
| 50 | "the recorded **57.7-gram** result is not source-resolved… Pearled barley, at 57.1, is the **next** exact-source result" | popcorn is now 51.3 and *below* barley — "next" is inverted | body + **RANK CLAIM** |
| 19, 26 | "barley and popcorn technically beat them [oats]" | still true (51.3 > 35.8) — verify only | body |

### P3-H `popcorn-vs-almonds-fiber-cost.md` — title-level obsolescence
The article exists to say the comparison **cannot be made**. It can now: popcorn 51.3 g/$ vs almonds 8.8 g/$.

| Line | Stale | Correct | Surface |
|---|---|---|---|
| 2 | title: "Popcorn vs Almonds: **Can We Verify** Which Fiber Is Cheaper?" | the premise is obsolete | **EXTRACTION — title** |
| 3 | excerpt: "The recorded **57.7g** popcorn result is **unresolved** because its nutrition and priced forms do not match" | **51.3 g**, disclosed proxy | **EXTRACTION — excerpt** |
| 12-13 | faq[0]: "Our current data **cannot verify** the per-dollar winner. USDA lists air-popped popcorn at **14.5**… the recorded **57.7-gram** popcorn result should not be compared" | it can now be compared; 12.9 kernel-basis, 51.3 g/$ | **EXTRACTION — faq[0]** |
| 15 | faq: "We cannot calculate that… multiplying **14.5** grams per 100 grams by [the bag]" | the dry-matter conversion is exactly this calculation | **EXTRACTION — faq** |
| 21 | faq: "at **14.5** grams of fiber per 100 grams it may help you hit a daily fiber target" | this one refers to air-popped popcorn and **is still correct** (FDC 167959 = 14.5) — do not change | **verify only** |
| 24 | "The popcorn row records **57.7**, but it pairs a USDA value…" | 51.3 | body |
| 28 | comparison table: "**57.7 g recorded, not verified**" vs "8.8 g" | **51.3 g** (proxy) | body table |
| 29 | table: "**14.5 g** for air-popped popcorn, not kernels" vs "12.5 g" | **12.9 g** kernel basis | body table |
| 34 | source-audit footer: "The popcorn row is unresolved because its 14.5 g/100 g value describes air-popped…" | now proxy; rewrite | body |
| 38 | "The two popcorn inputs describe different forms" — the article's core argument | superseded by the dry-matter reconciliation | body |
| 44 | **RANK CLAIM** "preserves popcorn's published **fifth-place** observation" | popcorn is now rank **7** | body |

### P3-I `canned-beans-vs-dried-beans-nutrition.md`
| Line | Stale | Correct | Surface |
|---|---|---|---|
| 26 | faq: "On the canned side, canned black beans led at **27.9** grams [of fiber per dollar]" | **34.4** | **EXTRACTION — faq** |
| 37 | table row Black beans / Canned: fiber **5.6 g**, fiber/$ **27.9 g** | **6.9 g**, **34.4 g** | body table |
| 39 | table row Chickpeas / Canned: fiber **4.8 g**, fiber/$ **21.5 g** | **4.4 g**, **19.7 g** | body table |
| 70 | "On fiber the pattern holds: dry p[into]…" — the dry-vs-canned fiber multiple changes (dry black beans 58.1 vs canned 34.4 is now 1.7×, was 2.1×) | recompute the stated multiple | body |

### P3-J `how-much-protein-in-a-can-of-beans.md` — per-can fiber totals
439 g can × fiber/100 g. Black beans **439 × 6.9/100 = 30.3 g** (was 24.6). Chickpeas **439 × 4.4/100 = 19.3 g** (was 21.1). Kidney beans 18.9 g unchanged.

| Line | Stale | Correct | Surface |
|---|---|---|---|
| 22 | faq: "canned black beans carried the most in our data at about **24.6 grams** per can, close to the FDA's 28 gram fiber Daily Value. Canned chickpeas came in at **21.1**…" | **30.3 g**, which now **exceeds** the 28 g DV; chickpeas **19.3 g** | **EXTRACTION — faq** |
| 33-36 | "Fiber per can" table column | black **30.3**, chickpeas **19.3**, kidney 18.9 | body table |
| 51 | "Between **18.9 and 24.6** grams" | "Between **18.9 and 30.3** grams" | body |
| 53 | "A can of black beans at **24.6** grams sits at about **88 percent** of the FDA's 28 gram fiber Daily Value" | **30.3 g**, about **108 percent** — the claim flips from "close to" to "over" | body |

### P3-K `how-much-is-a-can-of-beans.md`
| Line | Stale | Correct | Surface |
|---|---|---|---|
| 24 | faq: "canned black beans were both the cheapest can at $0.88 and the best value at 30.1 g protein and **27.9 grams of fiber** per dollar" | **34.4** | **EXTRACTION — faq** |
| 65 | "About 26.5 grams of protein and **24.6 grams of fiber**… **88 percent** of the 28 gram fiber DV" | **30.3 g**, **108 percent** | body |
| 73 | "most fiber per dollar at **27.9** grams. That's a clean sweep" | **34.4** (sweep still holds) | body |

### P3-L `do-you-have-to-cook-canned-beans.md`
| Line | Stale | Correct |
|---|---|---|
| 35 | Black beans row: fiber/$ **27.9 g** | **34.4 g** |
| 37 | Chickpeas row: fiber/$ **21.5 g** | **19.7 g** |
| 59 | "That same can holds roughly **24.6 grams** of fiber, **close to** the whole 28 gram Daily Value" | **30.3 g**, now **above** the DV |

### P3-M `nutritional-value-of-beans-compared.md`
| Line | Stale | Correct |
|---|---|---|
| 42 | Black beans / Canned fiber **5.6 g** | **6.9 g** |
| 44 | Chickpeas / Canned fiber **4.8 g** | **4.4 g** |

### P3-N `produce-fiber-per-dollar-ranked.md`
| Line | Stale | Correct | Surface |
|---|---|---|---|
| 17 | faq: "Avocados second among fruits at 10.4, then pears at 8.0 and gala apples at **7.7**" | **7.3** | **EXTRACTION — faq** |
| 35 | `\| 6 \| Frozen green beans \| 11.2 g \|` | **10.8 g** (rank 6 holds) | body table |
| 41 | `\| 12 \| Apples (gala) \| 7.7 g \|` | apples fall to **13** at **7.3 g**; **chopped kale at 7.5 takes slot 12** — apples drop out of the displayed top 12 | body table + **RANK MOVE** |
| 65 | "Pears come in at 8.0 grams per dollar and gala apples at **7.7**" | **7.3** | body |
| — | oranges (navel) move 16 → 17 in the full 22-row ranking (below russet at 6.6) | if the article states a full-list position | **RANK MOVE** |

### P3-O `breakfast-staples-per-dollar.md`
| Line | Stale | Correct | Surface |
|---|---|---|---|
| 3 | excerpt: "…eggs 34.4, **gala apples just 7.7**" | **7.3** | **EXTRACTION — excerpt** |
| 22 | faq: "Bananas deliver 11.6 and gala apples **7.7**, the bottom of our ranking" | **7.3** (still bottom) | **EXTRACTION — faq** |
| 25 | "The worst deal on the same list is gala apples at **7.7** grams" | **7.3** | body |
| 39 | table `\| Apples (gala) \| not scored \| 7.7 g \| 7.7 g \|` | **7.3 g / 7.3 g** | body table |
| 67 | "gala apples **7.7** at $1.28 a pound" | **7.3** | body |

### P3-P TVP articles
| File:line | Stale | Correct | Surface |
|---|---|---|---|
| `foods-highest-in-protein-per-100-grams.md:3` | excerpt: "the TVP row led at **50.0 g** of protein per 100 g, but its label provenance **remains unresolved**" | **52.17 g**, now a disclosed manufacturer-label proxy | **EXTRACTION — excerpt** |
| `foods-highest-in-protein-per-100-grams.md:18` | faq[0]: "led at **50.0** grams per 100 grams, but we **could not verify** that figure against the current manufacturer label, which works out to about 52.2" | the label value **is** the source now: 52.17 | **EXTRACTION — faq[0]** |
| `foods-highest-in-protein-per-100-grams.md:20` | faq: "the **unresolved** TVP row is first at the recorded **50.0** g" | **52.17 g**, proxy | **EXTRACTION — faq** |
| `foods-highest-in-protein-per-100-grams.md:26` | faq: **RANK CLAIM** "leads the recorded density column at **50.0** g per 100 g but **ranks 32nd** on protein per dollar at **22.5** g per dollar" | **52.17 g**; **ranks 31st**; **23.4 g/$** | **EXTRACTION — faq** |
| `foods-highest-in-protein-per-100-grams.md:29` | lede: "the TVP row led at **50.0** grams… That number is not currently verified" | 52.17; verified against the label | body (lede) |
| `foods-highest-in-protein-per-100-grams.md:35` | table: "TVP \| **50.0 g** \| Not resolved \| … · unresolved mismatch" | **52.17 g** \| manufacturer-label proxy | body table |
| `foods-highest-in-protein-per-100-grams.md:89` | "led at **50.0** grams, with a large asterisk… We could not e[stablish]…" | rewrite | body |
| `protein-per-dollar-cheapest-protein-sources.md:42` | "**36 of 49** exact… **5** proxies. The remaining **8**…" | **39 exact, 10 proxy, 0 unresolved** | body |
| `protein-per-dollar-cheapest-protein-sources.md:91` | `\| 32 \| TVP \| 50.0 g \| $2.23 \| 22.5 g \|` | `\| 31 \| TVP \| 52.17 g \| $2.23 \| 23.4 g \|`, and canned kidney beans (line 90) moves **31 → 32** | body table + **RANK MOVE** |
| `plant-protein-per-dollar-ranked.md:45` | footer "13 exact, 0 proxies, **5 unresolved**" | **13 exact, 5 proxy, 0 unresolved** | body |
| `plant-protein-per-dollar-ranked.md:47` | "the **unresolved** TVP row at a recorded **22.5** grams per dollar, canned chickpeas at 22.0…" | **23.4**, proxy; TVP now sits **above** canned kidney beans | body + **RANK MOVE** |
| `plant-protein-per-dollar-ranked.md:59` | "The unresolved TVP row lands at a recorded **22.5**… its underlying **50.0**…" | 23.4 / 52.17 | body |
| `plant-protein-per-dollar-ranked.md:41` | `\| 12 \| Canned kidney beans \| 23.4 g \|` | TVP (23.4351) now takes 12, kidney beans (23.3835) 13 | body table + **RANK MOVE** |
| `protein-per-dollar-adjusted-for-quality.md:76` | `\| 22 \| TVP (soy) \| 22.5 \| 0.90 \| 20.2 \|` | `\| 22 \| TVP (soy) \| 23.4 \| 0.90 \| 21.1 \|` — rank 22 holds | body table |
| `tofu-vs-chicken-protein-cost.md:18` | faq: "TVP… at **22.5** grams of protein per dollar, **nearly matching** chicken breast at 24.5" | **23.4** | **EXTRACTION — faq** |
| `tofu-vs-chicken-protein-cost.md:51` | "TVP… delivered **22.5** grams of protein per dollar, nearly level with chicken" | **23.4** | body |
| `high-protein-on-a-budget-complete-guide.md:30` | "**36 exact** USDA…" (49-food audit) | **39 exact, 10 proxy, 0 unresolved** | body |
| `high-protein-on-a-budget-complete-guide.md:133` | "TVP at **22.5**, which is just defatted soy flour" | **23.4**; also the "just defatted soy flour" gloss no longer matches the provenance note, which explicitly declines to cite FDC 174275 | body |
| `which-foods-are-complete-proteins.md:40` | `\| Soy (tofu, TVP) \| 0.90 \| none listed \| 13.6 to **22.5** g \|` | 13.6 to **23.4** g | body table |
| `eggs-vs-everything-protein-value.md:43` | footer "36 exact, 5 proxies, **8 unresolved**" | **39 / 10 / 0** | body |

### P3-Q Frozen green beans
| File:line | Stale | Correct | Surface |
|---|---|---|---|
| `frozen-vs-fresh-vegetables-fiber-cost.md:53` | "Frozen green beans \| 32 oz bag, $2.18 \| **11.2 g**" | **10.8 g** | body table |
| `frozen-vs-fresh-vegetables-fiber-cost.md:14` | faq: "The next[ best]…" — verify whether green beans is named with a number | check | **EXTRACTION — faq** |
| `how-to-cook-frozen-vegetables-without-the-mush.md:67` | "frozen green peas 17.6 and frozen green beans **11.2**, against 6.1 for fresh broccoli crowns" | **10.8** | body |
| `can-you-eat-rice-and-beans-everyday.md:72` | "frozen green peas 17.6 grams… and frozen green beans **11.2**" | **10.8** | body |
| `how-long-do-frozen-vegetables-last-in-the-freezer.md:74` | "frozen green peas delivered 17.6 grams of fiber per[ dollar]…" — verify whether green beans follows with 11.2 | check | body |

### P3-R Meal-math derivatives
| File:line | Stale | Correct | Surface |
|---|---|---|---|
| `cheap-dinner-ideas-cost-per-serving.md:23` | faq: "pasta with black beans hit 27.1 g of protein with **21.5 g of fiber** for $0.70" | 100 g ww spaghetti (9.2) + 220 g canned black beans (15.18) = **24.4 g** | **EXTRACTION — faq** |
| `cheap-dinner-ideas-cost-per-serving.md:42` | table: Pasta with black beans … \| 27.1 g \| **21.5 g** | **24.4 g** | body table |
| `cheap-lunch-ideas-cost-per-box.md:27` | faq: "The earlier **57.7-gram** popcorn calculation is **excluded** because it paired air-popped nutrition data with the price of unpopped kernels" | popcorn is no longer excluded; 51.3 | **EXTRACTION — faq** |
| `cheap-lunch-ideas-cost-per-box.md:46` | source-audit footer: "The popcorn-kernel fiber calculation is excluded…" | rewrite | body |
| `cheap-lunch-ideas-cost-per-box.md:52` | "Half a can gives 13.3 g of protein and **12.3 grams of fiber** for about $0.44" | **15.2 g** | body |
| `how-to-eat-more-fiber-on-a-budget-complete-guide.md:61` | table: "Popcorn kernels — unresolved form match \| **57.7 g recorded, not verified**" | **51.3 g** (proxy) | body table |
| `how-to-eat-more-fiber-on-a-budget-complete-guide.md:87` | day table: "Popcorn, three tablespoons of kernels (30 g) \| **4.4**" | 30 × 12.9/100 = **3.9 g**. Day total 36.7 still rounds to the stated "~37" — **total survives** | body table |
| `how-to-eat-more-fiber-on-a-budget-complete-guide.md:136` | "The table's **57.7-gram** popcorn result is unresolved because its nutrition value and priced form do not match" | 51.3, proxy | body |
| `how-to-eat-more-fiber-on-a-budget-complete-guide.md:15` | faq: "air-popped popcorn as a snack (**about 4 grams**)… adds up to roughly 37 grams" | 3.9 g still reads as "about 4"; total 36.7 still "roughly 37" — **verify only, no change needed** | **EXTRACTION — faq** |
| `how-to-eat-more-fiber-on-a-budget-complete-guide.md:138` | "the [popcorn against almonds] page explains why the current source audit **cannot support a per-dollar winner**" | it can now | body |
| `how-to-save-money-on-groceries-at-walmart.md:42` | "Canned black beans \| 15.5 oz can \| $0.88 \| 30.1 g \| **27.9 g**" | **34.4 g** | body table |
| `whole-wheat-flour-vs-quinoa-fiber-cost.md:17` | faq: "The table records popcorn kernels at **57.7**, but that result is un[resolved]" | **51.3**, proxy; barley 57.1 now outranks it | **EXTRACTION — faq** |
| `whole-wheat-flour-vs-quinoa-fiber-cost.md:34` | footer: "popcorn is unresolved: its **14.5** g/100 g value is fo[r air-popped]" | 12.9, proxy | body |
| `whole-wheat-flour-vs-quinoa-fiber-cost.md:63` | table: "Popcorn kernels — unresolved form match \| 2 lb bag, $2.28 \| **57.7 g recorded, not verified**" | **51.3 g** | body table |
| `best-high-fiber-fruits-for-weight-loss-list.md:40` | **TIE CLAIM** "…bananas at 2.6, and **apples and oranges tied at 2.4**" | apples **2.3**, oranges **2.2** — no longer tied, and both now sit below bananas separately | body |

---

## 4. Rank and ordering claims that a numeric search would miss

Collected separately because none of these contain a value that changed.

1. `fiber-per-dollar-cheapest-high-fiber-foods.md:122` — "The recorded row lands at **number 5**" (popcorn). Now **7**.
2. `popcorn-vs-almonds-fiber-cost.md:44` — "popcorn's published **fifth-place** observation". Now **seventh**.
3. `one-dollar-fiber-what-it-buys.md:63` — "Canned black beans **finished fifteenth out of 15**". Now **10th of 15**; last place is whole flaxseed.
4. `one-dollar-fiber-what-it-buys.md:17` — "**finished last** on this list". Same inversion. **EXTRACTION — faq**.
5. `grains-fiber-per-dollar-ranked.md:31,50` — popcorn shown at **2\*** with barley described as "the **next** exact-source result". Barley now ranks above popcorn; "next" is backwards.
6. `foods-highest-in-protein-per-100-grams.md:26` — "**ranks 32nd** on protein per dollar" (TVP). Now **31st**. **EXTRACTION — faq**.
7. `protein-per-dollar-cheapest-protein-sources.md:90-91` — the 31/32 rows swap (kidney beans down, TVP up).
8. `plant-protein-per-dollar-ranked.md:41,47` — canned kidney beans at 12 and TVP below it; TVP now goes above.
9. `produce-fiber-per-dollar-ranked.md:41` — apples occupy displayed slot **12**; they now fall to **13** and drop out of the shown top-12, with chopped kale taking the slot.
10. `best-high-fiber-fruits-for-weight-loss-list.md:40` — apples/oranges **tie** at 2.4 is broken.
11. `best-high-fiber-foods-ranked-by-fiber-content.md` — three rows re-sort in the density table (canned black beans up 3, canned chickpeas down 1, oranges below apples).
12. `how-much-protein-in-a-can-of-beans.md:43` — "They lead on protein per can, on **fiber per can**, and on protein per dollar" — still true, and the margin widens. **Verify only.**
13. `high-fiber-snacks-per-dollar.md:30` — popcorn holds rank **1** in the snacks subset at 51.3. **Verify only, no rank change.**
14. `grains-fiber-per-dollar-ranked.md:40,56` — quinoa "**dead last out of 11**" at 10.6. **Unaffected.**
15. `protein-per-dollar-cheapest-protein-sources.md:36` — "Bacon finishes **49th out of 49**". **Unaffected.**
16. `eggs-vs-everything-protein-value.md:71` and `how-much-protein-in-two-eggs.md:24,55` — eggs "**19th of 49**". **Unaffected** (the TVP/kidney swap is entirely below rank 30).
17. `how-much-protein-in-peanut-butter.md:46` — peanut butter "**10th out of 49**". **Unaffected.**
18. `how-much-protein-in-oatmeal.md:24,63` — oats "**14th of the 49**". **Unaffected.**

---

## 5. Coincidental matches ruled out (do NOT change these)

Searching on bare numbers produces heavy noise. These were checked and are **correct as written**:

- **`22.5`** — raw chicken breast protein per 100 g (FDC 171077). Appears in `chicken-thighs-vs-breast-protein-cost.md`, `lentils-vs-chicken-breast-protein-cost.md`, `tofu-vs-chicken-protein-cost.md`, `protein-per-serving-beans-chicken-tofu-compared.md`, `what-50-grams-of-protein-costs-per-day.md:90`, `protein-per-dollar-cheapest-protein-sources.md:89,146`. Unrelated to TVP.
- **`22.5`** — oat bran fiber per dollar (`fiber-per-dollar-cheapest-high-fiber-foods.md:77`, `grains-fiber-per-dollar-ranked.md:37`). Unchanged row.
- **`5.6`** — 20% of the 28 g fiber Daily Value, the FDA "excellent source" threshold (`good-source-of-fiber-label-meaning.md:18,34,57`, `high-fiber-yogurt-parfait-for-breakfast.md:57`, `fiber-protein-daily-values-explained.md:23`). Nothing to do with canned black beans.
- **`5.6`** — Wendy's Dave's Single protein per dollar (`fast-food-protein-per-dollar-ranked.md:54`). The fastfood CSV was not changed.
- **`2.7`** — the dry-vs-canned **protein** price multiple, used in ~12 articles. Protein values did not change; this multiple is intact.
- **`4.8`** — baked potato chips fiber, artichoke hearts, the quinoa/flour price ratio. All unrelated.
- **`14.5`** — air-popped popcorn's own USDA fiber value (still 14.5 on FDC 167959) in `popcorn-vs-potato-chips-fiber-comparison.md:29` and `healthy-alternatives-potato-chips-snacking.md`; and "14.5 oz can diced tomatoes" in four recipes.
- **`7.7`** — whole milk protein per cup (244 g × 3.15/100), used across the breakfast-protein articles; and a Tailwind flex value in `src/pages/index.astro:225`.
- **`6.7`** — avocado fiber per 100 g (FDC 171705), unchanged.
- **`2.4`** — blueberries fiber per 100 g (FDC 171711), unchanged; and cooked instant grits.
- **`10.6`** — quinoa fiber per dollar, unchanged.
- **`11.2`** — frozen edamame **protein** per 100 g (FDC 168410), unchanged.
- **`21.5`** — quinoa protein per dollar, unchanged.
- **`3.79 / 3.19 / 2.99`** — outside `what-50-grams-of-protein-costs-per-day.md`, the only other hit is an unrelated package price in `is-driving-to-cheaper-grocery-store-worth-it.md:60`.
- **`fastfood-protein-per-dollar-2026.csv`** was **not** modified; the chain landing pages (`mcdonalds-protein-per-dollar.astro` etc.) and `fast-food-protein-per-dollar-ranked.md` read from it and already show 5.35 / 3.99 / 3.89. They are correct; it was the day-cost CSV that had drifted away from them.
- `public/data/content-registry.json`, `dataset-provenance.json`, `pin-destinations-flat.json` — scanned for every old and new value and every status string. **Zero hits.** Nothing to change.

---

## 6. What I could not check, and why

1. **Chart images.** Six referenced JPGs encode numbers that changed and cannot be inspected as data. They need regeneration, and their alt text is already listed above:
   `/images/what-50-grams-of-protein-*.jpg` (two charts: the $9.97 day and the $3,639 year), `/images/protein-per-dollar-groceries-vs-drivethru.jpg`, `/images/produce-fiber-per-dollar-ranked-chart.jpg`, `/images/fiber-budget-day-breakdown.jpg`, `/images/fiber-on-a-budget-value-chart.jpg`. I can read the alt strings but not the pixels.
2. **`good-source-of-fiber-label-meaning.md:83`** — "A can of black beans has about **8 grams** of fiber per half-cup serving." A 130 g half-cup at the new 6.9 g/100 g is 9.0 g, at the old 5.6 it was 7.3 g. I could not determine whether this sentence sources from our dataset or from a label, so I have **not** classified it as stale. Verify before touching.
3. **`how-much-protein-for-breakfast.md:80`** — "Half a can of black beans brings a serious contribution alongside…" — no number is stated, so nothing is provably wrong, but the surrounding fiber framing was written against 12.3 g and now understates by 3 g.
4. **Rendered JSON-LD.** I inspected the source of `faq`/`quickAnswer`/`excerpt` frontmatter but did not render the site, so I cannot confirm which of these actually reach `FAQPage` output at build time. `src/pages/[slug].astro` is the renderer; the surfaces are marked on that assumption.
5. **`experiments/`, `reports/`, `kinetic-video-bundle/`** were excluded from the search. They are not published surfaces, but if any of them is later promoted, re-run the sweep against them.
6. **Two judgment calls flagged by the independent audit remain open and are not remediation items** — whether popcorn should be `proxy` with `nutrition_source_id = FDC 167959` when 12.9 does not appear on that record, and whether the TVP rank flip over canned kidney beans (a 0.05 g/$ margin against a ±2 g/100 g label rounding band) should stand. **If either is reversed, most of P3-C/F/G/H and all of P3-P must be re-derived from the reverted values.** Do not start the article phase until those two are settled.

---

## 7. Suggested order of operations

1. Settle the two open judgment calls in §6.6. Everything downstream depends on them.
2. Fix the derived CSVs: P1-1 through P1-7 (including the missed apple row in `fiber-day-cost`).
3. Fix `datapackage.json`: P0-2 checksum, P0-3 schema text. Recompute **all** resource hashes on LF-normalised bytes after step 2.
4. Regenerate `api-index-v1.json` (`node scripts/build-api-index.mjs`), then run `scripts/verify-data-foundation.mjs`.
5. Fix `src/content/datasets.ts` and the six site pages (P2).
6. Articles (P3) — separate phase, extraction surfaces first: P3-A, P3-E, P3-H, P3-P.
7. Regenerate the six charts in §6.1.
