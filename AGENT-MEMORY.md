# Agent Memory
## Updated: 2026-04-15 | Full audit session

---

## Strategic Direction
- Site = digital asset + authority brand → traffic → email list → affiliate monetization
- Content pillars: `recipes` = traffic | `nutrition` = authority | `tips` = monetization bridge
- No medical claims, no YMYL framing, no detox language (see CLAUDE.md for full rules)
- Email: Kit (ConvertKit) — Beehiiv deprecated
- First dollar target: **2026-05-15** via Amazon Associates affiliate links

## Workflow Decision (locked 2026-04-15)
- **Claude Code** = all code, infrastructure, data management
- **Cursor + Gemini** = article writing ONLY — never touches code again
- Agent skills (agent-0 through agent-8) = shelved, may become Claude Code subagents later
- David Miller Voice = `.cursor/skills/david-miller-voice/SKILL.md` — preserve always

---

## VERIFIED SITE STATE

### Live on Cloudflare (as of last deploy)
- **76–77 articles** visible | ~28 nutrition | ~30 recipes | ~19 tips
- **78 web images** (`*-main.jpg`) committed | **317 pin images** committed
- All articles have web images — no missing coverage

### Local Only (NOT pushed to GitHub)
- **48 web images** for the 49-article batch
- **87 pin images** for the 49-article batch

### The 49-Article Batch
- Source of truth: `pipeline-data/production-sheet.csv` (50 rows, 1 already live)
- Each row: full article markdown + pin copy v1–v5 + image filenames
- Images already generated locally, waiting to be pushed

---

## SYSTEMS

### Image Generation
| Script | Model | Output |
|--------|-------|--------|
| `scripts/generate-site-media.py` | Imagen 4 Ultra | Web images (main 16:9, ingredients, video 9:16) |
| `scripts/generate-pinterest-pins.py` | Nano Banana Pro | 5 pin variants per article (portrait 3:4) |
Both read from `pipeline-data/production-sheet.csv`. Skip if file already exists.

### Article Publishing (built 2026-04-14/15 — NOT yet activated)
- `publish-articles.yml` = GitHub Actions, daily 07:00 UTC
- `scripts/publish-articles.py` = fetches PENDING from D1, checks image on GitHub, commits 1/day
- D1 table: `articles_schedule` (in schema.sql)
- **To activate — 3 steps:**
  1. Create `articles_schedule` table in Cloudflare D1 (run schema.sql migration)
  2. POST `production-sheet.csv` to `/api/articles-upload?key=STATS_KEY`
  3. Push 48 web images + 87 pin images to GitHub

### Pinterest Auto-Poster (active)
- `post-pins.yml` = GitHub Actions every 30 min
- `scripts/post-pins.py` = posts from D1 `pins_schedule` table
- Publer no longer used

### Infrastructure
- Cloudflare Pages + D1 (`dlh-subscriptions`) + GitHub Actions
- Dashboard at `/dashboard` (password-protected, build-time + live data)
- `package.json` has `deploy:prod` + `release:prod` scripts

---

## CURRENT PRIORITIES

1. **Archive** — clean pipeline-data + scripts (in progress this session)
2. **Activate article publishing** — 3 steps above
3. **Push images** — 48 web + 87 pin images to GitHub
4. **First affiliate dollar** — Amazon Associates + 3–5 articles with links
5. **Email** — Kit welcome automation (0 real subscribers currently)

---

## KEY FILES
- `pipeline-data/production-sheet.csv` — master file for next 50 articles
- `pipeline-data/image-scenes.json` — used by image scripts (keep)
- `pipeline-data/pins.json` — used by dashboard at build time (keep)
- `.cursor/skills/david-miller-voice/SKILL.md` — voice guide (never touch)
- `schema.sql` — D1 schema (all tables)
- `scripts/post-pins.py` — Pinterest auto-poster
- `scripts/publish-articles.py` — article auto-publisher

---

## KNOWN GAPS
- `articles_schedule` D1 table: probably not created yet in Cloudflare (schema.sql was updated locally)
- Search bar in Header: exists in UI, does nothing
- Kit welcome email: not built
- 0 real external email subscribers
