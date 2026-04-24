# Daily Life Hacks - Project Brief

## Identity & Stack
- **Site:** Daily Life Hacks (daily-life-hacks.com)
- **Stack:** Astro 5 + Tailwind CSS v4, deployed on Cloudflare Pages
- **GitHub:** github.com/moshearviv85/daily-life-hacks
- **Brand color:** `#F29B30` (orange)
- **Content language:** English only, American audience
- **User communication:** Hebrew

## Autonomy
Run tasks end-to-end without stopping for confirmation. Only pause if:
- Destructive action (delete files, drop DB, force push to main)
- External action visible to others (send email, publish to social media, post to Pinterest)
- Genuinely blocked and need information only the user has

## Build & Deploy
- Build: `npm run build` → outputs `dist/`
- Deploy: auto via Cloudflare Pages on push to `main`
- Serverless: `functions/` directory (Cloudflare Pages Functions)
- D1 DB binding name: `DB` (schema in `schema.sql`)

## Cloudflare Env Vars
- `BEEHIIV_API_KEY` (Full Access required)
- `BEEHIIV_PUB_ID` default `99ff482f-ae3d-436b-b0b9-637220faa120`
- `STATS_KEY` (for `/api/stats`)

## Workflow
- Claude Code = project manager, code, infrastructure, data, automation
- Cursor + Gemini = content writing only (articles, pin text). Do not touch site code.
- Gemini instructions go in `INSTRUCTIONS-*.md` files at project root (managerial, not full code)

## How Rules Load (Important)
This project uses `.claude/rules/` for instruction management, not inline in this file.

| File | When Loaded |
|------|-------------|
| `.claude/rules/truth.md` | Every session (always-on) |
| `.claude/rules/content.md` | Every session (always-on) |
| `.claude/rules/articles.md` | When opening `src/data/articles/**` |
| `.claude/rules/pinterest.md` | When opening pin-related files |
| `.claude/rules/video.md` | When opening kinetic-video files |

Rules in these files are binding. Do not duplicate their content here.

## Skills Available
Skills in `.claude/skills/`:
- `write-article` — article creation workflow
- `david-miller-voice` — tone/voice for articles
- `kinetic-video` — video creation (mandatory pre-read for any video work)
- `post-pin` — Pinterest posting (side-effect skill, manual invocation only)

To invoke: `/write-article`, `/kinetic-video`, etc.

## Enforcement Hooks Active
See `.claude/settings.json`. Summary:
- **PreToolUse `content-checker`** — blocks Edit/Write to articles with em-dash, medical claims, supplements
- **PostToolUse `post-tool-state`** — writes tool-call history to `.claude/state.json`
- **Stop `completion-evidence-gate`** — Haiku checks that completion claims are backed by tool evidence
- **InstructionsLoaded `instructions-logger`** — logs rule loads to `.claude/logs/instructions.log`

## Core Pipeline Locations
- Articles: `src/data/articles/{slug}.md`
- Article images (web 16:9): `public/images/{slug}-main.jpg`
- Pin images (3:4, 1000x1500): `public/images/pins/{slug}_v{1-4}.jpg`
- Pin database: `pipeline-data/pins.json`, `pipeline-data/pipeline.db`
- Image scenes: `pipeline-data/image-scenes.json` (100 scenes for variety)
- Content tracker: `pipeline-data/content-tracker.json`

## Scripts
- `scripts/generate-images.py` — web + 4 pin variants per article (Nano Banana Pro, temp 2.0, rate-limited)
- `scripts/1-research.py` → `6-deploy.py` — article pipeline stages
- `scripts/post-pin*.py` — Pinterest posting

## Content Schema
`src/content.config.ts`. Required fields: title, excerpt, category (`nutrition`|`recipes`), tags, image, imageAlt, date. See `.claude/rules/articles.md` for full schema.

## Important Constraints
- Contact form is static (no backend) — do not imply it works
- Beehiiv iframe embed does NOT work; custom form + `/api/subscribe` proxy is the only path that works
- D1 database must be created manually in Cloudflare Dashboard and bound as `DB`
- Original Excel backup at `../diet-website.xlsx`

## History
See `CHANGELOG.md` for completed tasks.

## Pending Work (2026-04-22)
See `.claude/state.json` (auto-maintained) and memory files in `~/.claude/projects/.../memory/` for current pending tasks. Do not duplicate here.
