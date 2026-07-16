# Site content and tools release, 2026-07-16

## Outcome

This release turns the site's strongest topics into a clearer search architecture and adds four practical grocery tools. It does not promise instant traffic. It creates more useful landing pages, stronger internal discovery, measurable tool engagement, and better paths between supporting articles and pillar guides.

## Shipped surfaces

- Expanded `/tools/` into a browsable hub.
- Added a grocery unit price calculator.
- Added a recipe cost calculator.
- Added a weekly grocery budget calculator.
- Kept and promoted the existing fiber-per-dollar calculator.
- Added Tools to primary and footer navigation.
- Added anonymous `tool_engagement` analytics without sending calculator inputs.

## Content architecture

- Registered four pillar guides: fiber, protein, healthy eating on a budget, and meal prep.
- Strengthened all four guides with answer-first sections, useful navigation, contextual links, FAQs, and supporting charts.
- Added contextual internal links to 51 supporting articles.
- Reduced articles with zero body internal links from 29 to 0.
- Updated the cluster mapper, upgrade queue, link injector, and SEO audit so the architecture stays maintainable.

## Conversion fix

The newsletter components shipped raw TypeScript syntax inside inline browser scripts. That caused a production-side JavaScript syntax error on article pages. Both newsletter scripts now run as valid browser JavaScript.

## Evidence

- `node --test tests/tools-hub-pages.test.mjs tests/related-articles-pillars.test.mjs tests/content-clusters-audit.test.mjs`: 15 passed.
- `py -3 -m pytest tests/cli/test_inject_pillar_links.py -q`: 5 passed.
- `npm run build:checked`: passed, 660 pages built, 205 canonical article routes, 19,562 internal anchors checked, and recipe audit clean.
- `git diff --check`: clean.
- Calculator behavior and responsive layouts were checked in a real browser at desktop and mobile widths.

## Measurement

Track this release in three separate layers:

1. Deployment: routes are live, canonical, in the sitemap, and free of runtime errors.
2. Discovery: impressions and indexed pages in Google Search Console and Bing Webmaster Tools over 7, 14, and 30 days.
3. Usefulness: `tool_engagement`, clicks from tools to guides, guide-to-article clicks, and newsletter conversions.

Search traffic should be judged against the pre-release baseline, not by whether rankings move on deployment day.
