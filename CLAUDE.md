# Daily Life Hacks - Project Brief

## Identity & Stack
- **Site:** Daily Life Hacks (daily-life-hacks.com)
- **Stack:** Astro 5 + Tailwind CSS v4, deployed on Cloudflare Pages
- **GitHub:** github.com/moshearviv85/daily-life-hacks
- **Brand color:** `#F29B30` (orange)
- **Content language:** English only, American audience
- **User communication:** Hebrew

## Autonomy

**Default = ASK before any state-changing action.** This includes Edit / Write to source files (`*.py`, `*.ts`, `*.js`, `*.tsx`, `*.astro`, `*.sql`, `*.yml`, `*.yaml`, anything under `src/`, `scripts/`, `functions/`), `git commit`, `git push`, `npm install`, `npx wrangler`, sending emails, posting to social media, posting to Pinterest, deleting files, dropping DB, force-push.

You may proceed without asking ONLY when one of the following is true:
- The user explicitly authorized this turn (`go ahead`, `yes do it`, `proceed`, `אישור`, `תבצע`, `תמשיך`, `כן`, `צא לדרך`).
- The user gave a concrete task this turn that names what to change ("write a script that does X", "fix the bug in Y", "תכתוב לי", "תקן את").
- The action is part of an approved SDD plan or active TDD cycle the user already greenlit.
- The action is read-only (Read, Grep, Glob, `git status`, `cat`, `ls`, `wc`).
- The action is a memory or rule edit that the user just asked for.

If the user's last message is a question, a clarification, or casual back-and-forth — DO NOT make code changes. Ask first.

Always pause and ask if: destructive, external, or you genuinely don't have enough information. Even when authorized for one task, do not chain into a second task without checking back.

## Build & Deploy
- Build: `npm run build` → outputs `dist/`
- Deploy: auto via Cloudflare Pages on push to `main`
- Serverless: `functions/` directory (Cloudflare Pages Functions)
- D1 DB binding name: `DB` (schema in `schema.sql`)

## Cloudflare Env Vars
- `KIT_API_KEY` (Kit / ConvertKit API key — required for `/api/subscribe`)
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
- Newsletter signups go through custom form + `/api/subscribe` proxy to Kit (ConvertKit). The form posts JSON; the function calls Kit v4 API server-side
- D1 database must be created manually in Cloudflare Dashboard and bound as `DB`
- Original Excel backup at `../diet-website.xlsx`

## History
See `CHANGELOG.md` for completed tasks.

## Pending Work (2026-04-22)
See `.claude/state.json` (auto-maintained) and memory files in `~/.claude/projects/.../memory/` for current pending tasks. Do not duplicate here.
