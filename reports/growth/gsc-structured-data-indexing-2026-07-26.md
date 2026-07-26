# GSC structured data and indexing remediation

Date: 2026-07-26

## Executive result

- The `Page with redirect` validation is a false target. Its 26 failed examples are
  intentional no-trailing-slash URLs that return one 301 to the canonical
  trailing-slash page, which returns 200. Those URLs should remain excluded as
  redirects.
- The `Not found (404)` validation exposed seven failed examples. This change
  gives every legitimate legacy URL a one-hop 301 to the closest existing page,
  and returns 410 for the malformed `${p.slug}` URL.
- The one `Redirect error` example now returns a clean one-hop 301 followed by
  200. The report is stale and still shows a crawl from 2026-05-12.
- The Dataset markup had a real implementation problem. `isPartOf` pointed to a
  `WebPage`, which Google does not accept for Dataset rich results, and no
  `license` was supplied. The invalid relationship is removed and all six Dataset
  entries now point to the site's existing data reuse terms.
- The Recipe report is already clear as of 2026-07-24: zero invalid items and
  zero items affected by all listed optional-field warnings. No fake videos,
  step images, or ratings were added.

## Live Search Console evidence

The Page indexing report was last updated on 2026-07-10:

- 132 indexed
- 486 not indexed
- 55 in `Not found (404)`
- 50 in `Page with redirect`
- 1 in `Redirect error`

The failed `Page with redirect` validation began 2026-05-18 and failed
2026-05-23. Its failed examples are current article URLs without a trailing
slash. Live checks on all 50 examples found:

- 46 clean one-hop redirects to a 200 page
- 3 stale examples that currently returned 404 and are remediated in this change
- 1 HTTP apex URL that takes the edge-level HTTP-to-HTTPS hop and then the
  apex-to-www hop before returning 200

The failed `Not found (404)` validation began 2026-06-14 and failed
2026-07-01. Its seven failed URLs were:

| Failed URL | New or confirmed behavior |
| --- | --- |
| `/${p.slug}` | 410 Gone |
| `/nutrition/1/` | 301 to `/nutrition/` |
| `/tag/flavorhacks/` | 301 to `/big-flavor-less-salt-citrus-herbs-umami-swaps/` |
| `/tag/homeorganization[/]` | 301 to `/how-to-organize-a-small-kitchen-on-a-budget/` |
| `/tag/quinoarecipes/` | 301 to `/stuffed-portobello-mushrooms-quinoa-spinach-feta/` |
| `/tag/pizzanight/` | 301 to `/high-fiber-pizza-crust-cauliflower/` |

The same audit found additional known legacy tag URLs that were still returning
404. They now have specific, intent-matched redirects:

- `/tag/chickenbowls/`
- `/tag/healthysnacks/`
- `/tag/meals-large/`
- `/tag/meatlessmonday/`
- `/tag/vegetables/`

`/cdn-cgi/l/email-protection` is crawler-generated noise under Cloudflare's
reserved `/cdn-cgi/` path, not a real site page. It remains an intentional 404
and is not a failed URL in the current validation sample.

## Dataset schema remediation

Changed the Dataset node in `src/pages/[slug].astro`:

- removed `isPartOf: { "@id": webPageId }`
- added `license: https://www.daily-life-hacks.com/methodology/#data-license`

The methodology page now exposes that stable anchor on its existing public-data
reuse section. No new license terms were invented.

Generated-output validation passed for all six Dataset pages:

- `fiber-per-dollar-cheapest-high-fiber-foods`
- `protein-per-dollar-cheapest-protein-sources`
- `what-30-grams-of-fiber-costs-per-day`
- `what-50-grams-of-protein-costs-per-day`
- `protein-per-dollar-adjusted-for-quality`
- `fast-food-protein-per-dollar-ranked`

Each generated page has exactly the expected license URL and no Dataset
`isPartOf` property.

## Recipe warnings

Google's Recipe documentation treats `aggregateRating`, `video`, and per-step
media as recommended enhancements rather than required properties. The live
Recipe report was updated 2026-07-24 and shows zero affected items for every
listed warning. The site already emits a root recipe image, named steps, step
URLs, keywords, ingredients, and instructions.

The rating widget only emits `aggregateRating` after at least five genuine
ratings. That policy remains unchanged. Fabricating ratings or claiming a video
that does not exist would make the markup less trustworthy.

## Validation

- Focused Node suite: 26 passed, 0 failed
- Full `npm run build:checked`: pass
- Generated Dataset JSON-LD checks: 6 of 6 pass
- Methodology license anchor: pass
- `git diff --check`: clean

## Search Console action after production deploy

1. Start a new validation only for `Not found (404)` and the two Dataset issues.
2. Do not restart validation for `Page with redirect`; the remaining examples
   are intentional canonical redirects.
3. Let the existing `Redirect error` validation finish. Its sole example is
   already a clean one-hop redirect to a 200 page.

References:

- https://developers.google.com/search/docs/appearance/structured-data/dataset
- https://developers.google.com/search/docs/appearance/structured-data/recipe
- https://support.google.com/webmasters/answer/9216203
