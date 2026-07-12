# Growth Experiments Log (CP5.6)

**Cadence:** one active experiment at a time; Pinterest windows ≥14 days; document keep/kill here.

## Rules

1. Hypothesis + primary metric + window before starting.
2. No site-wide redesign A/Bs simultaneous with pin experiments.
3. Promote winners into `docs/pinterest-creative-playbook.md`.
4. Stop losers; do not raise `MAX_PINS_PER_RUN` as a “test.”

---

## Experiment log

### EXP-001 — Title formula: number+dish vs vague “best” lists
| Field | Value |
|-------|-------|
| Status | **Seeded / queued** (from CP5.1 baseline) |
| Hypothesis | New pin briefs using number+dish/time titles get higher CTR than vague “Best …” / comparison titles |
| Metric | Own-domain CTR (clicks÷impressions), pins ≥50 impr |
| Window | 14 days after first post of cohort |
| Cohort | New briefs only — do not rewrite live pins |
| Baseline | Avg CTR ~3.3%; strong ≥6% (`pin-performance-2026-07-12`) |
| Result | _pending_ |
| Decision | _pending_ |

### EXP-002 — Board assignment for same creative
| Field | Value |
|-------|-------|
| Status | **Queued** (after EXP-001) |
| Hypothesis | Keyword-routed specialty boards (fiber / protein / budget) outperform category default for the same title |
| Metric | CTR + saves rate |
| Window | 14 days |
| Notes | Use boards from `docs/pinterest-boards.md`; one creative, two boards max |
| Result | _pending_ |
| Decision | _pending_ |

### EXP-003 — Thank-you / magnet CTA: guides vs PDF-when-ready
| Field | Value |
|-------|-------|
| Status | **Running (soft)** — thank-you now points to pillar guides |
| Hypothesis | Live guide CTAs convert better than broken PDF links; later PDF restore is a separate test |
| Metric | Subscribe→guide click (manual / Clarity) + return visits |
| Window | 14 days post-deploy |
| Result | Soft-fail shipped 2026-07-12; measure after deploy |
| Decision | _pending — keep soft-fail until PDFs exist_ |

### EXP-004 — Idea / kinetic vs static (manual only)
| Field | Value |
|-------|-------|
| Status | **Blocked** — see `docs/idea-pin-automation-gate.md` (NO-GO automation) |
| Hypothesis | Manual kinetic/Idea creatives beat top-quartile static CTR (≥6%) |
| Metric | CTR @14d vs matched static |
| Window | 14 days × 5 manuals |
| Result | _not started_ |
| Decision | Automation stays NO-GO until ≥3/5 pass |

---

## Monthly review ritual

1. Re-run `npm run score:pins` after analytics refresh.
2. Update playbook with new title winners/losers.
3. Mark one experiment keep/kill in this file.
4. Confirm GSC duplicate/pin 301 health (spot-check 10 pin URLs).
