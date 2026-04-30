# SEO & AEO Strategy - Daily Life Hacks

> This file is the single source of truth for our SEO/AEO work.
> Every new Claude session should start by reading this file.
> Working directory: `C:/Users/offic/Desktop/dlh-seo` (git worktree on branch `seo-aeo-experiments`)
> Main site directory: `C:/Users/offic/Desktop/dlh-fresh` (branch `main`)

## Status: Phase 1 Audit DONE, Phase 2 IN PROGRESS (2026-04-30)

## NEXT SESSION TODO (Phase 2 - AEO Infrastructure)

Three tasks, approved by Moshe, ready to implement:

### 1. Create `public/llms.txt`
- Does not exist yet. Must create from scratch.
- Format: plain text describing site purpose, key URLs, content topics.
- Reference: https://llmstxt.org/
- Helps AI engines (ChatGPT, Perplexity, Claude) understand and cite our site.

### 2. Update `public/robots.txt`
- Current file allows all crawlers (`User-agent: *`) but doesn't explicitly name AI bots.
- Add explicit Allow rules for: GPTBot, Google-Extended, ClaudeBot, PerplexityBot, Bytespider.
- Current content:
  ```
  User-agent: *
  Allow: /
  Disallow: /admin/
  Disallow: /.git/
  Disallow: /node_modules/
  Sitemap: https://www.daily-life-hacks.com/sitemap-index.xml
  ```

### 3. Add structured data to About page (`src/pages/about.astro`)
- Page EXISTS but has no schema.org structured data.
- Add: Organization, AboutPage, and Person schema (entity anchor for EEAT).
- Important for YMYL niche - Google wants to know who's behind health content.
- Read about.astro first to understand current content before adding schema.

## Background

Inspired by the Agensi.io case study: a site that grew from 5 to 1,000+ weekly clicks
using data-driven content strategy and AEO (Answer Engine Optimization).
We're adapting this approach for our nutrition/recipes niche (YMYL vertical).

## Our Niche Constraints

- YMYL (Your Money Your Life) - Google is stricter on health/nutrition content
- No medical claims, no supplements, food-first only (see `.claude/rules/content.md`)
- Content must be warm/conversational, not clinical (David Miller voice)
- Pinterest is our primary social channel

## Phase 1: Audit Results (2026-04-30)

### Structured Data - GOOD
- Homepage (`src/pages/index.astro`): Organization schema (name, url, logo, sameAs, contactPoint)
- Article pages (`src/pages/[slug].astro`): Article OR Recipe schema + BreadcrumbList
- Recipe schema: full (ingredients, steps, nutrition, times, yield)
- FAQPage schema: present on ALL 150 articles (conditional on `article.data.faq`)
- Client-side AggregateRating schema (dynamic)

### What's Missing
| Item | Status | Impact |
|------|--------|--------|
| `llms.txt` | MISSING | High - AEO |
| `robots.txt` AI crawlers | Not explicit | Medium |
| About page schema | MISSING | High - EEAT for YMYL |
| WebSite + SearchAction schema on homepage | MISSING | Medium |
| `dateModified` always equals `datePublished` | Cosmetic | Low |

### What's Good (don't touch)
- FAQ schema on all 150 articles
- Recipe schema (full)
- BreadcrumbList on all article pages
- Organization schema on homepage

### GSC Status
- Site registered 2026-04-30 (domain property: daily-life-hacks.com)
- Data collection started - will take 2-3 days for first data, weeks for meaningful analysis
- GSC fetch script ready at `seo/fetch_gsc.py` (needs re-auth: delete `seo/credentials/token.json` first)
- OAuth credentials in `seo/.env` (gitignored)
- Python must be run with: `/c/Users/offic/AppData/Local/Programs/Python/Python312/python.exe`
  (the default `python` command resolves to Windows Store python which lacks the packages)

## Phase Plan

### Phase 1: Audit - DONE
- [x] Audit current structured data
- [x] Audit robots.txt and crawlability for AI engines
- [x] Check if we have llms.txt
- [ ] Audit Core Web Vitals (deferred - do after AEO infra)
- [ ] Export and analyze GSC data (waiting for data to accumulate)

### Phase 2: AEO Infrastructure - IN PROGRESS
- [ ] Create `public/llms.txt`
- [ ] Update `public/robots.txt` with AI crawler rules
- [ ] Add structured data to About page
- [ ] Add WebSite + SearchAction schema to homepage
- [ ] Verify all structured data with Google Rich Results Test

### Phase 3: Content Structure Optimization
- [ ] Add Quick Answer blocks to top articles
- [ ] Restructure H2 headings as questions where natural
- [ ] Add comparison tables where relevant
- [ ] Improve internal linking strategy
- [ ] Optimize title tags for CTR

### Phase 4: Monitoring & Iteration
- [ ] Set up weekly GSC data review process
- [ ] Track AEO referrals (ChatGPT, Perplexity, Gemini traffic)
- [ ] Measure structured data impact
- [ ] A/B title tag changes

## Decision Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-04-29 | Work on branch `seo-aeo-experiments` in worktree `dlh-seo` | Isolate from production |
| 2026-04-29 | Adapt Agensi strategy for YMYL niche | Not all tactics transfer |
| 2026-04-30 | Register site in Google Search Console | Needed for data-driven SEO |
| 2026-04-30 | Prioritize llms.txt + robots.txt + About schema | Highest impact, lowest risk |

## What Worked / What Didn't

| Change | Date | Result | Keep/Revert |
|--------|------|--------|-------------|
| | | | |

## Files in This Directory

- `STRATEGY.md` - This file. Read first every session.
- `playbook.md` - Technical implementation details for each change.
- `fetch_gsc.py` - Script to pull Google Search Console data.
- `.env` - Google OAuth credentials (gitignored).
- `credentials/` - OAuth tokens (gitignored).
- `data/` - GSC exports, analytics data, keyword research.
- `reports/` - Audit reports and analysis.
