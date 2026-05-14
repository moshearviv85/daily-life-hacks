# Daily Life Hacks - Project Brief

## Identity & Stack
- **Site:** daily-life-hacks.com
- **Stack:** Astro 5 + Tailwind CSS v4, deployed on Cloudflare Pages
- **GitHub:** github.com/moshearviv85/daily-life-hacks
- **Brand color:** `#F29B30` (orange)
- **Content language:** English only, American audience
- **User communication:** Hebrew

## Autonomy

**Default = ASK before any state-changing action.** Includes Edit/Write to source files, `git commit`, `git push`, `npm install`, `npx wrangler`, sending emails, posting to Pinterest, deleting files, dropping DB, force-push.

You may proceed without asking ONLY when:
- The user explicitly authorized this turn (`go ahead`, `yes do it`, `אישור`, `תבצע`, `תמשיך`, `כן`, `צא לדרך`).
- The user gave a concrete task that names what to change ("fix the bug in Y", "תכתוב לי", "תקן את").
- The action is part of an approved plan the user already greenlit.
- The action is read-only (Read, Grep, Glob, `git status`, `ls`).

Always pause and ask if: destructive, external, or you don't have enough information. Don't chain into a second task without checking back.

## Build & Deploy
- Build: `npm run build` → `dist/`
- Deploy: auto via Cloudflare Pages on push to `main`
- Serverless: `functions/` directory (Cloudflare Pages Functions)
- D1 DB binding name: `DB` (schema in `schema.sql`)

## Cloudflare Env Vars
- `KIT_API_KEY` — Kit (ConvertKit) API key for `/api/subscribe`
- `STATS_KEY` — for `/api/stats`

## Skills
Skills in `.claude/skills/`:
- `write-article` — article creation workflow (includes content rules + SEO checklist)
- `david-miller-voice` — brand voice for all site content (includes content hard bans)
- `kinetic-video` — video production with Remotion + ElevenLabs
- `post-pin` — Pinterest posting (manual invocation only)

## Rules
One path-scoped rule in `.claude/rules/`:
- `pinterest.md` — loads when working with pin-related files

## Core Paths
- Articles: `src/data/articles/{slug}.md`
- Article images: `public/images/{slug}-main.jpg`
- Pin images: `public/images/pins/{slug}_v{1-4}.jpg`
- Pipeline scripts: `scripts/NEW_PIPELINE_2026-05-08/`
- Pipeline DB: `pipeline-data/topic-research.sqlite`
- Image scenes: `pipeline-data/image-scenes-curated.json`

## Content Schema
`src/content.config.ts`. Required fields: title, excerpt, category (`nutrition`|`recipes`|`tips`), tags, image, imageAlt, date, author.

## Important Constraints
- Contact form is static (no backend)
- Newsletter: custom form + `/api/subscribe` proxy to Kit v4 API
- D1 must be created manually in Cloudflare Dashboard and bound as `DB`

## Pending Work

Task files live in `docs/tasks/`. **Do NOT read them at session start** — only when the user asks to work on a specific task.

| # | File | Task | Priority |
|---|------|------|----------|
| 1 | `docs/tasks/01-pipeline-completion.md` | Pipeline completion + publish flow | Critical |
| 6 | `docs/tasks/06-automation.md` | System automation | Critical |
| 13 | `docs/tasks/13-smart-pins-pipeline.md` | Smart pins pipeline | Medium-High |
| 2 | `docs/tasks/02-lead-magnet.md` | Lead magnet for email collection | High |
| 4 | `docs/tasks/04-internal-linking.md` | Internal linking | High |
| 5 | `docs/tasks/05-pillar-articles.md` | 3 Pillar articles | Medium-High |
| 11 | `docs/tasks/11-monetization.md` | Monetization strategy | High (planning) |
| 10 | `docs/tasks/10-seo-audit.md` | Final SEO audit | Medium |
| 3 | `docs/tasks/03-data-driven-articles.md` | Data-driven articles | Medium |
| 12 | `docs/tasks/12-video-pipeline.md` | Video production + YouTube | Medium |
| 7 | `docs/tasks/07-inbound-links.md` | Inbound links strategy | Medium |
| 9 | `docs/tasks/09-medium-articles.md` | Medium articles | Medium |
| 8 | `docs/tasks/08-instagram-pinterest.md` | Instagram + Pinterest integration | Low |

## History
See `CHANGELOG.md` for completed tasks.
