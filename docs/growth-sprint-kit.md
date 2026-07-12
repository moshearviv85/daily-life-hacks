# Growth Sprint Operating Kit (live)

**Mode:** parallel execution. Do not wait for weekly plans.

## Top 7 tasks (start now)

| # | Priority | Task | Owner / how |
|---|----------|------|-------------|
| 1 | P0 | Build upgrade queue from SEO gaps | `npm run upgrade:queue` |
| 2 | P0 | Inject pillar links into top orphans | `npm run upgrade:links -- --limit 20` |
| 3 | P0 | Schema fixes (Article url, step ids, dateModified) | shipped in `[slug].astro` |
| 4 | P0 | Expand batch of 5 thin high-intent articles | agent prompts below |
| 5 | P1 | Pinterest title rewrite pack for weak CTR pins | `docs/pinterest-title-rewrite-pack.md` |
| 6 | P1 | Idea Pin manual 5-pack (NO auto) | same doc + gate |
| 7 | P1 | Reddit scaling drafts (10 posts) | `docs/reddit-scaling.md` |

## Parallel run map

```
Thread A (scripts):   upgrade:queue → upgrade:links --limit 20 → audit:seo-onpage
Thread B (code):      schema / dateModified / step ids  [DONE this sprint]
Thread C (content):   expand articles #1–#5 from queue (one agent per article)
Thread D (pinterest): title rewrite pack + Idea Pin checklist
Thread E (reddit):    10 drafts + posting cadence
```

## Article upgrade agent prompt (copy/paste)

```
You are upgrading ONE Daily Life Hacks article.
Read: .claude/skills/david-miller-voice/SKILL.md and .claude/skills/write-article/SKILL.md

Slug: {SLUG}
Cluster: {CLUSTER}
Pillar to link: /{PILLAR_SLUG}/

Requirements:
1. Expand body to ≥1200 words if currently thin (<800). Keep David Miller voice.
2. Add ≥2 contextual internal links in the body (one MUST be the pillar).
3. Fix imageAlt if missing/generic. Lengthen excerpt to 130–160 chars.
4. Keep FAQ. No supplements, no medical YMYL overreach, no em dashes, no AI fluff.
5. Set frontmatter dateModified: YYYY-MM-DD (today).
6. Do not invent USDA numbers; reuse existing site studies with links when citing data.
7. Output: edit the markdown file only. No new images unless asked.
```

## Batch commands

```bash
npm run upgrade:queue
npm run upgrade:links -- --dry-run --limit 20
npm run upgrade:links -- --limit 20
npm run audit:seo-onpage
npm run build:checked
```

## Success evidence for a content batch

- Exact file list changed
- `npm run build:checked` passes
- Push to main (or staging→promote) with live URL check
- Re-run SEO audit: fewer `no_internal_links` / `thin_body`
