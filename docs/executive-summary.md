# Daily Life Hacks — Executive Summary
### Digital Asset Prospectus · April 2026

---

## 1. Business Overview

**Daily Life Hacks** (`daily-life-hacks.com`) is a food and wellness content brand built for the American audience. It covers practical everyday nutrition, easy home-cooking recipes, and kitchen tips with a consistent, distinct editorial voice.

The site is built as a long-term content asset, not an ad-farm or quick-flip project. The goal is to accumulate search authority, own a direct subscriber audience, and monetize deliberately through affiliate partnerships without compromising editorial integrity.

**Primary niche:** healthy eating, high-fiber nutrition, practical recipes, kitchen knowledge  
**Target audience:** American adults 25–55 who cook at home, care about eating well, and have no patience for medical lectures or wellness theater  
**Brand promise:** practical, honest, zero guilt, zero drama

---

## 2. The Brand Voice — David Miller

The site operates under a fictional editorial persona, **David Miller**, a home cook and practical nutrition writer. The voice is codified in a dedicated skill file (`.cursor/skills/david-miller-voice/SKILL.md`) and enforced across all content and UI copy.

### Voice Characteristics

- Practical, direct, and useful — no padding, no empty filler
- Human and conversational with a dry, slightly cynical edge
- Anti-hype, anti-drama, anti-guilt
- Zero lecturing, zero medical theater
- Contractions always used naturally (it's, don't, won't, they're)
- No em dashes, no emojis, no AI-giveaway phrases

### Why This Matters for a Buyer

The David Miller voice is the site's strongest differentiator. In a niche saturated with identical AI-generated wellness content, a consistent human-sounding persona with defined rules is an asset that can be protected, trained into any writing tool, and extended to email, social, and video. The voice exists as a documented skill file that can be handed off and replicated exactly.

---

## 3. Technical Infrastructure

### Stack

| Layer | Technology |
|---|---|
| Framework | Astro 5 + Tailwind CSS v4 |
| Hosting | Cloudflare Pages (auto-deploy on GitHub push) |
| Functions | Cloudflare Pages Functions (`functions/` directory) |
| Database | Cloudflare D1 (`dlh-subscriptions`) |
| Repository | GitHub (`moshearviv85/daily-life-hacks`) |
| Domain | `daily-life-hacks.com` |

### Key Technical Features

**Smart Router (`functions/[[path]].js`)**  
A Cloudflare Workers-based edge router that maps Pinterest UTM variant slugs (e.g. `/air-fryer-salmon-v2`) to canonical article URLs. Every pin variant has a clean trackable URL without creating duplicate pages. This is critical for Pinterest attribution tracking.

**Scheduled Content Reveal**  
Articles have a `publishAt` frontmatter field. A `release.ts` helper and client-side `FreshToday` component handle daily scheduled content release without requiring a server re-deploy. Articles go live at their UTC publish date automatically.

**Full JSON-LD Schema**  
Every article has either an `Article` or `Recipe` JSON-LD block. Recipe pages include full structured data: ingredients, steps, nutrition, prep/cook times. BreadcrumbList schema is on all pages.

**SEO Foundations**  
- `robots.txt` configured, `sitemap.xml` auto-generated
- `meta robots: index, follow, max-image-preview:large, max-snippet:-1`
- OG/Twitter card meta on all pages
- Pinterest Rich Pin meta tags on article images
- Canonical tags on all pages
- Width/height on all images, `fetchpriority="high"` on hero images, lazy loading on the rest

**Newsletter & Email Capture**  
- Footer form + modal popup (page-aware text varies by category)
- Custom Cloudflare Pages Function proxy to Kit (ConvertKit) API with Beehiiv fallback
- Full per-signup tracking: source (footer/popup), page path, referrer, category, email segment
- D1 database logs every signup with full context fields
- Kit custom fields and tags set at capture: `source`, `page`, `base_slug`, `variant_slug`, `category`, `email_segment`
- `/thank-you` page post-signup

**Analytics & Events**  
- Protected stats endpoint (`/api/stats?key=SECRET`) — subscriber counts, by source, by day
- `funnel_events` table in D1 for custom event tracking
- Article rating widget (GET/POST) with D1 backend

**Quality Gate (`scripts/quality-gate.py`)**  
Automated content auditor that scans articles for banned medical claims, forbidden phrases, em dashes, emojis, and AI clichés before publishing.

---

## 4. Content Asset Inventory

*As of April 2026*

| Asset Type | Count |
|---|---|
| Published articles (live on site) | **66** |
| Articles in production pipeline (drafts) | **59** |
| Total articles (published + pipeline) | **125** |
| Web hero images (`slug-main.jpg`) | **77** |
| Pinterest pin images (`slug_v1–v5.jpg`) | **302** |
| Ingredient images for video (`slug-ingredients.jpg`) | In production |
| Vertical video background images (`slug-video.jpg`) | In production |

### Category Breakdown (Published)

| Category | Count | Purpose |
|---|---|---|
| Recipes | 23 | Traffic engine |
| Nutrition | 25 | Authority engine |
| Tips | 18 | Monetization bridge |
| **Total** | **66** | |

### Content Pipeline State

- **59 articles** are written, edited, and quality-checked in `pipeline-data/drafts/`
- All drafts passed through Agent 3 (quality gate) — no medical claims, no AI clichés, no banned phrases
- 50 of these drafts are fully topics-ready with Pinterest metadata generated
- Image generation is in progress: site media (Imagen 4 Ultra) + Pinterest pins (Nano Banana Pro)
- Publisher queue (Agent 6) will schedule these from `publishAt: 2026-04-14` forward, one per day

### Content Quality Standards (Non-Negotiable Rules)

- No YMYL / medical treatment claims
- No "cures", "treats", "heals", "detox", "cleanses"
- No hormone-balance or supplement therapy content
- Hedged health language: "may support", "could help", "is thought to"
- Recipe accuracy: realistic quantities, tested cooking times and temperatures, accurate calories
- Minimum article length: 750–900 words, structured with H2/H3 hierarchy and FAQ section

---

## 5. Pinterest Distribution

Pinterest is the primary organic traffic driver at this stage of the site's growth. The Pinterest strategy is sophisticated and fully systematized.

### Pinterest Account Setup

- **3 active boards:**
  - `High Fiber Dinner and Gut Health Recipes`
  - `Healthy Breakfast, Smoothies and Snacks`
  - `Gut Health Tips and Nutrition Charts`
- **API access:** Standard Pinterest API access confirmed (OAuth authenticated)

### Pin Architecture

Each article has **5 Pinterest pin variants** pointing to the same page, each with:
- Different image (distinct visual style per variant)
- Different pin title and hook angle
- Unique UTM-tracked URL: `daily-life-hacks.com/{slug}?utm_content=v1` through `v5`
- Staggered publish schedule: v1 on article publish day +1, v2 on +2, v3 on +3, etc.

The 5 hook styles per article:
1. **Curiosity / Question** — "Why Most People Get This Wrong…"
2. **Result / Benefit** — "The Exact Method That…"
3. **Number / List** — "5 Ways To…"
4. **Urgency / Time** — "30-Minute Version That Actually Works"
5. **Ingredient Focus** — "The 3 Ingredients That Make This…"

### Pin Image Production System

Two-model pipeline for all visual assets:

**Imagen 4 Ultra** (Google) — textless aesthetic photography:
- `{slug}-main.jpg` — 16:9 landscape, finished dish, blog post hero
- `{slug}-ingredients.jpg` — 16:9 landscape, raw ingredients spread, same visual scene as main (consistency hack)
- `{slug}-video.jpg` — 9:16 portrait, cinematic background for Kinetic Video shorts

**Nano Banana Pro** (Google Gemini) — text-overlay promotional images:
- `{slug}_v1.jpg` through `{slug}_v5.jpg` — 3:4 portrait Pinterest pins with title text baked in
- 5 distinct visual styles: bright/clean, dark/moody, flat-lay overhead, close-up macro, rustic lifestyle

**Image variety mechanism:** 100 pre-defined scenes (`pipeline-data/image-scenes.json`) are randomly assigned to prevent repetitive compositions. Temperature set to max for variety.

### Publer / Scheduling

- **154 pins** currently scheduled in Publer at 5 pins per day
- Automated rebuild script: `scripts/build-publer-final.py` regenerates the full scheduled CSV from registry data
- Rescheduling script: `scripts/reschedule-publer-final.py` re-dates the entire runway in one command
- Pinterest API queue file (`pipeline-data/pinterest-api-queue.csv`) is in place for direct API scheduling (replacing Publer dependency in the future)

---

## 6. Email / Audience System

### Current State

- **Platform:** Kit (ConvertKit) as primary, Beehiiv as fallback
- **Capture:** Footer form + modal popup on every article page
- **Tracking:** Full source/page/segment data captured per subscriber
- **Segmentation:** 6 category-based email segments defined and mapped to Kit tags
- **Thank-you page:** Live at `/thank-you` with on-brand copy
- **Post-signup automation:** First welcome flow pending build in Kit UI

### Kit Configuration

| Element | Detail |
|---|---|
| API access | Verified and working |
| Custom fields | source, page, base_slug, variant_slug, category, email_segment |
| Tags | recipes, nutrition, tips, source-footer, source-popup, 6 segment tags |
| Forms | Creator Profile (9195643), Creator Network (9195667) |
| Welcome email | Pending — next build priority |

### Email Strategy Direction

The long-term email architecture is segmented nurture by category:
- Recipe subscribers → meal-prep sequences → affiliate kitchen tools
- Nutrition subscribers → food swap guides → affiliate supplements (hedged)
- Tips subscribers → kitchen systems → affiliate products

Current priority: build the first universal welcome email and confirm live end-to-end signup flow in production.

---

## 7. Content Production Pipeline (Agent System)

The site operates an 8-agent modular AI content pipeline built inside Cursor IDE. Each agent has a dedicated `SKILL.md` file and handles exactly one stage. Agents do not share context windows and communicate only through data files.

| Agent | Role | Input | Output |
|---|---|---|---|
| Agent 0 — Auditor | Scans all project files, builds master state | All content directories | `master-state.json` |
| Agent 1 — Topic Generator | Generates new non-duplicate topics | master-state, existing slugs | `proposed-topics-batch.md` |
| Agent 2 — Article Writer | Writes full articles per topic | topic list, voice guidelines | `pipeline-data/drafts/{slug}.md` |
| Agent 3 — Quality Gate (Punisher) | Scans and fixes violations | draft files, rules | Fixed draft files |
| Agent 4 — Metadata Generator | Creates 5 Pinterest copy variants per article | draft files | `pinterest-copy-batch.json` |
| Agent 5 — Image Generator | Prepares tracker, provides terminal command | tracker + drafts | Shell command for both image scripts |
| Agent 6 — Publisher | Moves drafts to live site, assigns dates, builds Pinterest CSV | all pipeline data | Live articles + pinterest-api-queue.csv |
| Agent 7 — Finisher | Resolves backlog, commits and pushes all assets to GitHub | finisher-backlog.md | Clean repo, pushed to remote |
| Agent 8 — Inspector | QA audit of production readiness including Git tracking | live site + git status | Audit report |

### Pipeline Data Files

| File | Purpose |
|---|---|
| `pipeline-data/master-state.json` | Central source of truth for all article states |
| `pipeline-data/content-tracker.json` | Image generation status per article |
| `pipeline-data/content-registry.json` | Full content registry with pin variants and scheduling |
| `public/data/content-registry.json` | Public copy served by the CDN |
| `pipeline-data/pinterest-copy-batch.json` | 5-variant Pinterest copy per article |
| `pipeline-data/pinterest-api-queue.csv` | Direct Pinterest API scheduling queue |
| `pipeline-data/finisher-backlog.md` | Pending tasks for Agent 7 |
| `pipeline-data/agents-changelog.md` | Full audit log of agent actions |
| `pipeline-data/offers.json` | Affiliate offer definitions |
| `pipeline-data/affiliate-framework.json` | Category-to-offer monetization mapping |
| `pipeline-data/email-segments.json` | Email segment definitions |

---

## 8. Monetization Strategy

### Current (In Progress)

- **Organic traffic via Pinterest** is the primary traffic driver being established
- **Email list building** is live — subscribers captured with full segmentation context
- First affiliate framework is mapped in `pipeline-data/affiliate-framework.json`

### Monetization Roadmap

**Phase 1 — Audience Trust (Current)**  
Build Pinterest traffic and email list. No monetization pressure. Establish authority.

**Phase 2 — Soft Affiliate (3–6 months)**  
- Tips category: kitchen tool recommendations (knives, pans, air fryers, cast iron)
- Recipes category: ingredient subscriptions, meal kit partnerships
- Nutrition category: food delivery services, supplement brands (carefully hedged)
- In-content links, dedicated "what I use" resource pages

**Phase 3 — Direct Products (6–12 months)**  
- PDF lead magnets (meal plan, shopping guide) — already planned, structure exists
- Email course sequences (7-day fiber guide, 14-day protein starter)
- Sponsored content partnerships with food brands at fair editorial rates

### Revenue Levers Available to a Buyer

1. Mediavine / Raptive display ads (once traffic threshold hit — typically 50K sessions/month)
2. Amazon Associates affiliate links in recipe ingredients and kitchen tips
3. Kit-based email automation sequences to affiliate offers
4. Direct brand deals (recipes + nutrition authority is a natural fit for food brands)
5. Digital product sales through the existing email capture infrastructure

---

## 9. SEO and Content Growth Plan

### Current Content Depth

- **66 live articles** covering high-fiber foods, gut health nutrition, practical recipes, kitchen tips
- Every article has full JSON-LD schema, OG metadata, breadcrumb schema
- Recipe articles have complete Recipe schema (ingredients, steps, nutrition info, times)
- All articles are structured with FAQ sections (5 questions each) for Featured Snippet targeting

### Planned Batch

- **60 new articles** approved and in production (`pipeline-data/content-batch-60.json`)
- Category split: 20 recipes + 20 nutrition + 20 tips
- Scheduling starts April 12, 2026, one article per day
- Topics diversified beyond fiber — protein, healthy fats, breakfast energy, kitchen systems
- Total projected library after batch: **125+ articles**

### Content Differentiation Strategy

- Anti-AI detection rules baked into every article (human-sounding sentence burstiness, no banned phrases, personal-sounding anecdotes, deliberate imperfection)
- Content is not just "lists of healthy foods" — it solves real cooking problems with specific techniques
- Recipes have tested quantities, realistic cook times, accurate calories (not generic ranges)
- Nutrition articles use hedged but trustworthy language — no miracle claims, no fear-mongering

---

## 10. Video / Short-Form Content (In Development)

A Kinetic Video production system is in place (`.cursor/skills/kinetic-video/SKILL.md`) to convert articles into YouTube Shorts, TikTok, and Instagram Reels. This is a planned growth channel.

Each article now generates a `{slug}-video.jpg` (9:16 vertical, Imagen 4) as the background for the kinetic typography animation. The video production workflow uses a React-based animation bundle and Claude Code for scripting.

This distribution channel is in early development but the infrastructure and assets are being pre-generated alongside the content pipeline.

---

## 11. What Has Been Built vs. What Is Still Planned

### Built and Operational

- [x] Full Astro + Cloudflare Pages production site, live and auto-deploying
- [x] 66 published articles with images, schema, and SEO
- [x] Pinterest presence with 3 boards, 154+ scheduled pins
- [x] Smart Router for UTM variant tracking at the edge
- [x] 8-agent AI content pipeline (topics → writing → QA → metadata → images → publish)
- [x] Dual image generation pipeline (Imagen 4 for site, Nano Banana for Pinterest)
- [x] Newsletter capture with full segmentation (footer + popup)
- [x] Kit email platform integrated with custom fields and tags
- [x] D1 database with subscriber tracking, event tracking, and article ratings
- [x] Quality gate script enforcing brand, legal, and anti-AI standards
- [x] Daily scheduled content reveal (FreshToday component)
- [x] Thank-you page
- [x] David Miller voice documented and enforced by skill file

### In Active Development

- [ ] 59 draft articles moving through image generation and publishing queue
- [ ] First Kit welcome email automation
- [ ] Video background images (`-video.jpg`) generating per article
- [ ] Pinterest API direct scheduling (replacing Publer dependency)

### Planned (Infrastructure Ready)

- [ ] PDF lead magnet (meal plan) — capture infrastructure exists, content pending
- [ ] Email nurture sequences per segment — segments defined, copy pending
- [ ] Affiliate link integration in existing articles
- [ ] Site search (search bar in Header exists, functionality not yet wired)
- [ ] YouTube Shorts / TikTok channel via Kinetic Video pipeline
- [ ] Mediavine / Raptive display ad integration at traffic milestone

---

## 12. Asset Summary for a Buyer

| Category | Details |
|---|---|
| Live URL | `https://www.daily-life-hacks.com` |
| Platform | Astro 5 + Cloudflare Pages (zero server costs) |
| GitHub repo | `github.com/moshearviv85/daily-life-hacks` |
| Cloudflare account | Connected, D1 database, Pages Functions, Workers |
| Published articles | 66 (23 recipes, 25 nutrition, 18 tips) |
| Draft articles (pipeline) | 59 (written, QA-passed, ready for images + publish) |
| Pin images | 302 Pinterest images (5 variants × 60+ articles) |
| Web images | 77 hero images + ingredient images in production |
| Pinterest boards | 3 (active) |
| Scheduled pins | 154+ in Publer queue |
| Email platform | Kit (ConvertKit) — integrated, segmented, active |
| Email subscribers | Growing |
| Brand voice | David Miller — fully documented, transferable |
| AI content pipeline | 8 agents, fully documented in `.cursor/skills/` |
| Image generation | Fully automated (Imagen 4 + Nano Banana Pro) |
| Monetization | Affiliate framework mapped, no live deals yet |
| Domain | Included |
| All IP | Included (code, content, images, pipeline, voice docs) |

---

*Document prepared April 2026. Data reflects verified production state of the project.*
