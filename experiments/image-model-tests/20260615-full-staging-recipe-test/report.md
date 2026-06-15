# Full Article + Image Pipeline Test

Date: 2026-06-15
Topic: one pot pasta primavera 20 minutes
Slug: one-pot-pasta-primavera-20-minutes
Category: recipes

## Scope

- Wrote one article from a topic list item.
- Generated one hero image, one mid-article support image, and four pin images.
- Did not publish to Pinterest.
- Did not run D1.
- Did not run promote.
- Did not deploy to main.

## Article Checks

- Article file: `src/data/articles/one-pot-pasta-primavera-20-minutes.md`
- Validator: PASS
- Body words: 1849
- H2 count: 6
- Recipe time: title/excerpt promise 20 minutes; `totalTime` is 20 minutes.
- Banned phrase check: no `future self`, no `your ... will thank you`, no sign-off ending, and no banned AI filler words found in the generated article.
- Autonomy check: the pipeline now blocks short production drafts, mismatched recipe time promises, sign-off/greeting-card lines, and banned AI filler words as tier 1 failures.

## Image Outputs

| Slot | File | Model | Cost | Time | Notes |
|---|---|---:|---:|---:|---|
| Hero | `public/images/one-pot-pasta-primavera-20-minutes-main.jpg` | krea-2-large | $0.060 | 39.0s | Bright, appetizing, real food feel. |
| Support | `public/images/one-pot-pasta-primavera-20-minutes-ingredients.jpg` | nano-banana-2 | $0.080 | 22.0s | Good prep-scene support image. Auto-inserted by page when file exists. |
| Pin 1 | `public/images/pins/one-pot-pasta-primavera-no.jpg` | gpt-image-2 | $0.005 | 34.9s | Text readable. Image strong. Title phrasing is slightly awkward. |
| Pin 2 | `public/images/pins/skip-draining-better-pasta.jpg` | nano-banana-2 | $0.080 | 17.5s | Text readable, strong food photo. |
| Pin 3 | `public/images/pins/minute-pasta-primavera-really.jpg` | krea-2-large | $0.060 | 331.5s | Text readable, good photo, but generation latency spiked hard. |
| Pin 4 | `public/images/pins/one-pot-pasta-prep-cook.jpg` | seedream-v5-lite | $0.035 | 41.3s | Text readable, clean prep composition. |

## Visual QA

- Text readability: pass on all four pins.
- Food/lifestyle realism: pass on hero, support, and all pins.
- Model diversity: pass. The pins do not all look like the same model/composition.
- Pinterest fit: pass overall.
- Failures avoided by script changes: people/hands in pin prompts, graphic/icon/chart prompts, and extra small rendered text inside pin prompts.

## Remaining Notes

- Pin title quality may need a separate deterministic rule or prompt tightening. Example from this run: `One-Pot Pasta Primavera: No dish pile` is readable but not polished.
- Krea produced the best-looking editorial style but had one very slow pin generation in this run.
- The rerun proved the script is autonomous for the issues found here: it failed on `CP-07`, repaired the draft, and only deployed after the validator passed.

## Contact Sheets

- `experiments/image-model-tests/20260615-full-staging-recipe-test/article-images-contact-sheet.jpg`
- `experiments/image-model-tests/20260615-full-staging-recipe-test/pins-contact-sheet.jpg`
