# Pinterest Research Cohort — 2026-07-13 (Claude workstream)

Branch: `claude/pinterest-research-cohort-2026-07-13` (worktree `C:\Users\offic\Desktop\dlh-pinterest-cohort`, based on origin/main @ a338540).
Assets under review: the 12 research/data pins from commit `f0f79ed`, not yet in production `pins_schedule`.
Machine-readable results: `pipeline-data/experiments/pinterest-research-cohort-2026-07-13.json`.
Visual contact sheet: `reports/growth/claude-pinterest-cohort-contact-sheet-2026-07-13.html` (open from repo root; images referenced relatively).

## Headline result

**6 selected (2 per article), 6 rejected.** In the first pass only 5 were selectable: all four candidates for the second `what-50-grams-of-protein-costs-per-day` slot failed hard rejection rules, three with defects baked into the image pixels (typos, gibberish AI text, unsupported claim). The owner approved exactly one regeneration, and `protein-days-priced-dry-goods` was rebuilt (gpt-image-2, $0.005) with the corrected headline **"5 Protein Days Priced: From 82 Cents to $9.97"**. The new image passed full-resolution and 236px mobile inspection, manual spelling check, margin check (5.7% left / 2.8% right), and both prices trace to the article (Day 1 $0.82, Day 4 $9.97). Score: **61/70**, above the 56 threshold. It fills slot A of the protein pair, completing the third matched A/B pair.

## Selected cohort (6)

| Pin | Destination | Variant | Score | Why it wins |
|---|---|---|---|---|
| `restaurant-fiber-meal-costs-same` | what-30-grams-of-fiber | B comparison | 62/70 | Cleanest execution of the price-shock frame; receipt actually sums to $14.42; numbers traceable to Days 1/4 |
| `stop-paying-protein-it-costs` | what-50-grams-of-protein | B comparison | 61/70 | Pantry-vs-McDonald's split reads in half a second; $10 vs under-$1 maps to $9.97/$0.82 |
| `beans-98g-protein-per-dollar` | high-protein pillar | A direct number | 60/70 | Three verifiable numbers in the title; the pillar states "chicken drumsticks led at about 50... eggs at 34" verbatim; chalkboard echoes 98/50/34 |
| `protein-days-priced-dry-goods` (regenerated) | what-50-grams-of-protein | A direct number | 61/70 | Five containers = the article's five days, literally; both prices verbatim; clean single-headline composition |
| `only-foods-you-need-high` | high-protein pillar | A/B pair partner (simplicity) | 59/70 | Best-composed image of the batch; legible handwritten week plan with zero AI text errors |
| `build-day-dry-goods-aisle` | what-30-grams-of-fiber | A direct number/method | 56/70 | Constructive how-to counterpart to the restaurant pin; notebook math legible and roughly correct (cooked-cup figures) |

Copy: final titles, keyword-aware descriptions (protein per dollar, cheap protein, 30 grams of fiber, budget meals — no stuffing), and alt text for all six are in the experiment JSON. Notable fixes: removed "The USDA tested 49 foods" false attribution pattern from descriptions; removed a "supplement" mention from the build-day description; every description now names its data source and price date.

### The A/B hypotheses (three complete pairs)

- **Pillar pair:** direct ranking numbers (98/50/34) vs simplicity promise ("only 3 foods") — same destination, tests whether data or ease drives the click.
- **Fiber pair:** constructive how-to ("build your day, 62 cents") vs price shock ("$14.42 vs 62 cents") — same destination, same numbers, opposite emotional frame.
- **Protein pair:** direct number range ("From 82 Cents to $9.97", regenerated) vs drive-thru comparison ("Stop Paying $10") — same destination, tests range-of-outcomes vs us-vs-them framing.

## Original rejections (7; one regenerated and promoted)

| Pin | Score | Hard rule violated |
|---|---|---|
| `get-50g-protein-before-lunch` | 48/70 | **Unsupported claim in image text**: "50g before lunch for under $1" — the article's $0.82 is a full day (52.7g across 4 meals). Best photo of all 12 |
| `protein-days-priced-dry-goods` (original image) | 48/70 | Typo in headline: "Dry **Gogds** Aisle" — **resolved**: image regenerated with owner approval 2026-07-13 and promoted to selected (see above); the original file was replaced in place |
| `you-re-overspending-protein-month` | 42/70 | "$30/Month" appears nowhere in the destination article (grep verified); calculator shows "3000"; raw chicken foreground |
| `grams-fiber-actually-costs-receipts` | 40/70 | Typo in headline: "(The **Reciepts**)"; receipt subtotal $15.55 matches no day in the article; gibberish calculator keys |
| `protein-price-gap-no-one` | 38/70 | Receipts are full-frame AI gibberish ("BUN IFOOD", "RESTAMD B CRNCS"); great title, unusable image |
| `protein-per-dollar-ranking-foods` | 35/70 | 49-card grid is AI text soup ("KAROTI", "CINEEOPS", "CHIEKY BREAST", 4x LENTILS); unreadable on mobile, gibberish zoomed |
| `day-fiber-priced-per-meal` | 33/70 | Ten garbled number cards ("6/6", "223", "2.57") mapping to nothing in the article |

**Pattern worth recording:** every rejection except one is an *in-image text* failure. The generator reliably produces beautiful food still-lifes and reliably mangles any text beyond ~6 words. Future briefs should put ALL numbers/claims in the headline zone only (short, large) and specify "no receipts, no labels, no cards with text" in the scene.

## Validation results

- Production destinations: all three return **200** (checked 2026-07-13).
- Images: all 12 exist on disk, all portrait (1000x1500 / 848x1264 / 832x1248).
- Number traceability (selected 6): 98/50/34 g-per-dollar verbatim in pillar body; $0.62 and $14.42 = Day 1 / Day 4 fiber-day totals; $9.97/$0.82 = Day 4 / Day 1 protein-day totals; 12x and 23x ratios stated in the articles.
- Duplicate title/message pairs: none among the 6 selected (two comparison variants share a *frame* but target different articles with different numbers).
- Selected count: **6, 2 per article** — complete after the approved regeneration.
- Regenerated image: portrait 1024x1536; spelling manually verified at full resolution; readable at 236px mobile preview; headline margins 5.7% left / 2.8% right; no receipts, labels, menus, text cards, or microtext.
- `git diff --check`: clean.
- D1: untouched. Pinterest: nothing published. main: untouched. Nothing committed (per brief).

## Handoff notes

1. The regenerated image replaced `public/images/pins/protein-days-priced-dry-goods.jpg` in place — same slug, so the existing pin-destinations routing from f0f79ed still applies; no sync/derive needed for routing.
2. **Title sync required at upload time:** the local `pin_briefs` table still holds the OLD title for this slug. Before running `generate_pinterest_csv.py`, update the brief's title/description/alt to the final values in the experiment JSON, or the queue would pair the new image with the old title.
3. Owner gallery gate still applies before any queue upload, per standing rule.
