# Growth Targets — daily-life-hacks.com

Set: 2026-07-12. Measured weekly by `scripts/weekly-scorecard.py` (GitHub Action, Monday 06:00 UTC).
Scorecards land in `pipeline-data/scorecards/scorecard-{YYYY-WW}.md`.

## שלבים (Stages)

| שלב | שם | דדליין | משמעות |
|-----|-----|--------|--------|
| Stage 1 | אות חיים | 2026-08-01 | The site registers on every channel — non-zero, measurable signal |
| Stage 2 | מנוע עובד | 2026-09-01 | Growth loops compound: content brings traffic, traffic brings subscribers |
| Stage 3 | סף מוניטיזציה | 2026-11-01 | Mediavine Journey threshold — ad revenue becomes possible |

## טבלת יעדים (Targets Table)

| Metric | Source | Baseline (2026-07-12) | Stage 1 — אות חיים (2026-08-01) | Stage 2 — מנוע עובד (2026-09-01) | Stage 3 — סף מוניטיזציה (2026-11-01) |
|--------|--------|----------------------|--------------------------------|----------------------------------|--------------------------------------|
| Google impressions/day | GSC (manual) | ~5 | 50 | 300 | — |
| Google clicks/day | GSC (manual) | ~0 | 3 | 15 | — |
| Pinterest impressions/month | Pinterest API (auto) | ~0 | 1,000 | 10,000 | — |
| Pinterest outbound clicks/month | Pinterest API (auto) | ~0 | 50 | 300 | — |
| Email subscribers (total) | /api/stats (auto) | ~5 | 25 | 100 | 500 |
| Reddit comment karma | Reddit API (auto) | single-digit (~5) | 50 | — | — |
| AI citations/day | Bing Webmaster (manual) | ~0 | 10 | — | — |
| Sessions/month | Analytics (manual/partial) | ~0 | — | — | 10,000 (Mediavine Journey) |
| Earned backlinks | manual audit | 0 | — | 2 | — |

## הערות (Notes)

- **Baseline** captured 2026-07-12; targets are absolute values, not deltas.
- **% progress** in scorecards = current / Stage-1 target (capped at 100%).
- **GSC and Bing** have no free API path wired up yet — filled manually each week (instructions inside each scorecard).
- **Pinterest** figures are trailing 30-day windows from `user_account/analytics`.
- **Sessions/month** (Stage 3) — until GA/GSC wiring exists, the funnel_events pageview count from `/api/analytics` is the closest automatic proxy (tracked in scorecards as an informational row).
- **Mediavine Journey** requires 10,000 sessions/month — that is the monetization gate for Stage 3.
