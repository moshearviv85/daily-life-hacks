# SEO & AEO Strategy - Daily Life Hacks

> This file is the single source of truth for our SEO/AEO work.
> Every new Claude session should start by reading this file.

## Status: Phase 0 - Infrastructure Created (2026-04-29)

## Background

Inspired by the Agensi.io case study: a site that grew from 5 to 1,000+ weekly clicks
using data-driven content strategy and AEO (Answer Engine Optimization).
We're adapting this approach for our nutrition/recipes niche (YMYL vertical).

## Our Niche Constraints

- YMYL (Your Money Your Life) - Google is stricter on health/nutrition content
- No medical claims, no supplements, food-first only (see `.claude/rules/content.md`)
- Content must be warm/conversational, not clinical (David Miller voice)
- Pinterest is our primary social channel

## Phase Plan

### Phase 1: Audit (NEXT)
- [ ] Export and analyze Google Search Console data
- [ ] Audit current structured data (what schema do we have today?)
- [ ] Audit Core Web Vitals (current LCP, CLS, FID scores)
- [ ] Audit robots.txt and crawlability for AI engines
- [ ] Check if we have llms.txt
- [ ] Identify keyword gaps (high impressions, low clicks)
- [ ] Identify unindexed pages
- [ ] Document findings in `seo/reports/audit-2026-04-29.md`

### Phase 2: AEO Infrastructure
- [ ] Create/update llms.txt
- [ ] Update robots.txt to allow AI crawlers
- [ ] Add FAQ schema to article pages
- [ ] Add Organization schema to homepage
- [ ] Add Article schema improvements
- [ ] Add BreadcrumbList schema
- [ ] Verify structured data with Google Rich Results Test

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
| 2026-04-29 | Work on separate branch `seo-aeo-experiments` | Don't affect production until changes are proven |
| 2026-04-29 | Adapt Agensi strategy for YMYL niche | Not all tactics transfer - we need to be careful with health content |

## What Worked / What Didn't

(Will be filled as we test things)

| Change | Date | Result | Keep/Revert |
|--------|------|--------|-------------|
| | | | |

## Files in This Directory

- `STRATEGY.md` - This file. Read first every session.
- `playbook.md` - Technical implementation details for each change.
- `data/` - GSC exports, analytics data, keyword research.
- `reports/` - Audit reports and analysis.
