# Idea Pin / Kinetic Automation Gate (CP5.2)

**Decision: NO-GO for automation** (as of 2026-07-12)

## Why

CP5.1 baseline own-domain CTR is ~**3.3%** (n=66 pins ≥50 impressions). Idea Pin / kinetic automation is blocked until **5 manual** video or Idea Pins beat the **top-quartile static CTR** over a **14-day** window.

Top-quartile proxy from the baseline report: treat **≥6% CTR** as the bar for “strong static.” Manual Idea/kinetic tests must clear that bar (or beat the matched static creative for the same article) before any scheduling code ships.

## Manual test checklist (do these first)

Pick 5 creatives from existing inventory — prefer top CTR static titles from `pipeline-data/reports/pin-performance-2026-07-12.md` and/or finished kinetic projects under `kinetic-video-bundle/projects/`.

For each test:

| # | Field | Value |
|---|--------|-------|
| 1 | Article slug | |
| 2 | Format | Idea Pin / kinetic Short / other |
| 3 | Board (from [pinterest-boards.md](./pinterest-boards.md)) | |
| 4 | Publish date | |
| 5 | Impressions @14d | |
| 6 | Outbound clicks @14d | |
| 7 | CTR @14d | |
| 8 | Matched static CTR (same article) | |
| 9 | Pass? (≥6% or > matched static) | |

Suggested first candidates (manual upload only — no API automation):

1. High-CTR recipe with a clear number/time hook (pizza dough / soup / burrito bowl from playbook winners).
2. Fiber challenge / meal-plan kinetic if assets exist.
3. Budget dish with **concrete cost in title**, not the word “budget” alone.
4. Protein swap with named food (eggs / beans / drumsticks).
5. Storage/freezer how-to (freeze bananas style).

## Automation unlock criteria

All must be true:

1. ≥5 manual tests completed with 14d metrics logged above.
2. ≥3 of 5 pass the CTR bar.
3. Kinetic skill still requires **script + music approval** before production (unchanged).
4. Auto-post rate remains `MAX_PINS_PER_RUN=1` for static; video/Idea would start at **manual queue only**, then a separate capped runner.

Until then: **static pins only** in the auto poster. No Idea Pin API wiring.

## Related

- Playbook: `docs/pinterest-creative-playbook.md`
- Kinetic skill: `.claude/skills/kinetic-video/SKILL.md`
- Boards: `docs/pinterest-boards.md`
