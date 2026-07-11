# CP5 — Growth & Pinterest Optimization Plan

**Date:** 2026-07-11  
**Depends on:** CP1–CP4 (routing 301, single publish path, CI, dashboard auth)  
**Owner lens:** Senior Growth Engineer + Technical SEO Lead  
**Status:** Planned — not started

---

## 0. North star

Grow **qualified traffic → email → return visits** without reintroducing soft-duplicate HTML or blind pin volume.

Primary channels:
1. Pinterest (discovery + saves)
2. Google organic (clusters + pillars)
3. Owned: newsletter / lead magnets

Do **not** optimize for raw pin count. Optimize for **click-through quality, save rate, and on-site conversion**.

---

## 1. Priority order (execute in this sequence)

| # | Stream | Why first | Horizon |
|---|--------|-----------|---------|
| **A** | Pinterest quality loop | Already have inventory + analytics; fastest feedback | CP5.1–5.2 |
| **B** | On-page SEO + internal linking | Compounds every existing URL | CP5.3 |
| **C** | Pillar pages + content clusters | Structural SEO; depends on linking map | CP5.4 |
| **D** | Lead magnets + newsletter | Monetizes / retains traffic once volume rises | CP5.5 |
| **E** | Analytics & experimentation | Instrument before large creative bets | CP5.6 (starts early, expands late) |

Rule: finish validation of each sub-checkpoint before expanding volume.

---

## 2. Stream A — Pinterest strategy (quality > auto)

### Current state
- Auto-poster every 30m, **≤1 pin / run** (keep)
- 4 creatives / article via pipeline; registry gate ≥4 destinations (done)
- Analytics cached in D1 + dashboard Pins tab
- Risk: automation without creative learning = diminishing CTR

### Principles
- Keep automation for **scheduling/posting**; move judgment to **briefs, boards, and creative selection**
- Never recreate HTML aliases for “more links”
- Prefer fewer high-performing formats over more mediocre static pins

### A1 — Creative quality system (CP5.1)
1. Score pins weekly from dashboard analytics (impressions, outbound clicks, saves).
2. Tag winning patterns: title formula, model ID, board, category.
3. Feed winners into `generate_pin_briefs.py` prompt constraints (hard rules + examples).
4. Kill / pause bottom quartile creatives from future scheduling (flag in D1 or CSV).

**Deliverables**
- `docs/pinterest-creative-playbook.md` (title formulas, banned fluff, board map)
- Dashboard: sort/filter by CTR proxy (clicks/impressions)
- Optional script: `scripts/.../score_pin_performance.py` → report JSON

### A2 — Volume discipline (CP5.1)
- Keep `MAX_PINS_PER_RUN = 1` and cooldown
- Prefer **queue curation** (human approve top pins) over dump-all
- Backfill destinations only for articles with <4 pin origins — **batches of ≤10**, verify 301 each batch

### A3 — Video / Idea Pins (CP5.2 — after A1 baseline)
| Format | When | How |
|--------|------|-----|
| Static pins | Default | Current pipeline |
| Kinetic / short video | High-intent recipes + cost hooks | Existing Remotion/`kinetic-video` skill — **manual publish first** |
| Idea Pins / story pins | Only if Pinterest API + brand fit proven | Spike: 5 manual Idea Pins → measure 14d → decide automation |

**Decision gate for Idea Pins:** do not automate until 5 manual tests show ≥ baseline CTR of static top quartile.

### A4 — Board strategy (CP5.2)
- Keep board routing table in dashboard as source of truth
- Auto-create boards **only** with explicit `create=true` flag (already cautious)
- Map category → primary board + 1 overflow board; forbid random boards

---

## 3. Stream B — On-page SEO + content hygiene (CP5.3)

### Goals
- Strengthen relevance signals on existing ~186 canonicals
- Fix thin/duplicate titles, missing FAQ, weak intros

### Work
1. SEO audit pass on top 50 URLs by GSC impressions (task `10-seo-audit` aligned).
2. Enforce article template checklist (already in write-article skill): H1, FAQ, howTo where relevant, imageAlt, internal links.
3. Canonical + breadcrumb already fixed in CP1 — verify in GSC “Page indexing”.
4. Reject any proposal to soft-serve pin HTML again.

### Validation
- No increase in “Duplicate without user-selected canonical” in GSC
- Sample 20 pin destinations: 301 → canonical, `pinterest_hits` logged

---

## 4. Stream C — Clusters, pillars, internal linking (CP5.3–5.4)

### Cluster model
Pick **3 pillars** (aligns with task `05-pillar-articles`):

| Pillar theme (draft) | Example spokes |
|----------------------|----------------|
| High-fiber / gut meals | fiber challenges, bean soups, oats |
| Budget / cost-per-serving | Aldi, $60 week, protein-per-dollar |
| High-protein swaps | eggs, Greek yogurt, turkey, tofu |

### Work
1. Map existing articles → cluster (script or spreadsheet from `src/data/articles`).
2. Write/upgrade 3 pillar pages with hub TOC + spoke links.
3. Pass internal links: spoke→pillar, pillar→top spokes, sibling links (task `04-internal-linking`).
4. Update sitemap priority hints only if already supported — no fake PageRank tricks.

### Validation
- Each spoke has ≥1 contextual link to its pillar
- Pillars appear in nav or a “Guides” index
- GSC queries for pillar head terms trend up over 30–60d (not instant)

---

## 5. Stream D — Lead magnets + newsletter (CP5.5)

### Current
- Kit subscribe via `/api/subscribe`
- At least one lead magnet already shipped (`02-lead-magnet` marked done; second magnet `$60 Week` in recent history)

### Work
1. Audit conversion path: popup / inline / thank-you → Kit tag → welcome email (manual Kit check remains).
2. One magnet per pillar (PDF or checklist) — reuse David Miller voice skill.
3. Segment tags: `fiber`, `budget`, `protein` for future sequences.
4. Measure: subscribe rate per landing article (D1 subscriptions already store source/page).

### Validation
- Thank-you download works on prod
- Weekly new subs not flat while traffic rises
- No double-opt-in friction beyond Kit defaults unless required

---

## 6. Stream E — Analytics & experimentation (CP5.6, start thin in 5.1)

### Instrument now
| Signal | Source | Use |
|--------|--------|-----|
| Pin impressions/clicks/saves | Pinterest analytics D1 | Creative scoring |
| Site pin hits | `pinterest_hits` before 301 | Destination attribution |
| Subs by page | D1 `subscriptions` | Magnet/CTA placement |
| Top pages | Funnel events / dashboard | SEO + internal links |

### Experiments (one at a time)
1. Title formula A/B on new pin briefs only (not rewriting live pins)
2. Board assignment A/B for same creative
3. Magnet CTA placement (mid-article vs end) on one pillar

### Rules
- Document hypothesis + metric + window (14 days min for Pinterest)
- No simultaneous site-wide redesign experiments
- Stop losers; promote winners into playbook

---

## 7. CP5 checkpoints (delivery slices)

### CP5.1 — Pinterest measurement + playbook
- Creative scoring report + dashboard sort
- Playbook doc
- Keep post rate capped
- **Exit:** can name top 10 and bottom 10 pins with reasons

### CP5.2 — Format expansion gate
- 5 manual kinetic/video or Idea Pins
- Board map tightened
- Optional destination backfill ≤10 articles
- **Exit:** go/no-go on Idea Pin automation

### CP5.3 — SEO + linking pass
- Top-50 on-page fixes
- Cluster map + internal link pass 1
- **Exit:** GSC duplicate/pin indexing stable

### CP5.4 — Pillars live
- 3 pillars published + linked
- **Exit:** all spokes linked; pillars in guides index

### CP5.5 — Newsletter conversion
- Magnet-per-pillar or equivalent upgrade
- Kit welcome/tag audit
- **Exit:** clear subscribe funnel documented

### CP5.6 — Experimentation cadence
- Running log in `docs/growth-experiments.md`
- Monthly review ritual
- **Exit:** ≥3 concluded experiments with keep/kill

---

## 8. Explicit non-goals

- Raising auto-post frequency above current safety caps
- Soft-duplicate HTML for Pinterest
- Automating Idea Pins before manual proof
- Big-bang dashboard redesign (only growth-relevant widgets)
- Buying traffic / ads (unless separate budget decision)

---

## 9. Suggested first sprint after approval

1. Export last 90d pin analytics → top/bottom creative patterns  
2. Write `docs/pinterest-creative-playbook.md`  
3. Add CTR sort to Pins analytics table  
4. Draft cluster map CSV for 3 pillars (no article writing yet)  
5. Confirm GSC: sample pin URLs still 301-only  

---

## 10. Dependencies on existing tasks

| Task file | Maps to |
|-----------|---------|
| `13-smart-pins-pipeline` | CP5.1–5.2 |
| `08-instagram-pinterest` | CP5.2 (secondary) |
| `04-internal-linking` | CP5.3 |
| `05-pillar-articles` | CP5.4 |
| `10-seo-audit` | CP5.3 |
| `02-lead-magnet` / email | CP5.5 |
| `12-video-pipeline` | CP5.2 kinetic |
| `03-data-driven-articles` | Supports clusters with unique data hooks |

---

## 11. Immediate ask

Approve **CP5.1** to start (measurement + playbook only).  
Do **not** start Idea Pin automation or pillar writing until CP5.1 exit criteria pass.
