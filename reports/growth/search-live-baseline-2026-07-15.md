# Search Growth Live Baseline - 2026-07-15

This report records the live Google Search Console and Bing Webmaster state before the growth-recovery release. It separates shipped work from search outcomes so later reviews can compare the same cohorts and windows.

## Executive verdict

- The live site is crawlable and has no Google manual action or security issue.
- Google impressions show an early weekly recovery, but clicks remain at zero and indexing is incomplete.
- Bing search visibility is small but improving. Bing AI citations show a strong, concentrated signal around the budget-fiber pillar.
- External authority is effectively absent in both engines.
- The current IndexNow feed is noisy and stale: it contains mostly Cloudflare-submitted assets, not a clean changed-page release feed.

## Google Search Console

Performance data was last updated about four hours before the audit and ran through 2026-07-12.

| Window | Current | Previous | Verdict |
|---|---:|---:|---|
| 7-day impressions | 37 | 11 | Up 236%, but still tiny |
| 7-day clicks | 0 | 0 | No traffic outcome |
| 7-day average position | 67.1 | 74.4 | Improved by 7.3 positions |
| 28-day impressions | 126 | 86 | Up 46.5% |
| 28-day clicks | 0 | 1 | Worse outcome |
| 28-day average position | 67.1 | 57.9 | Worse by 9.2 positions |

Top recent page gains included the yogurt parfait, bran muffins, salad-dressing storage, quick-soak beans, cauliflower crust, and the rewritten peppermint-ginger article. None produced a click in the seven-day comparison.

### Indexing

The Page Indexing report was last updated 2026-07-10. When filtered to the submitted sitemap:

- Indexed: 100
- Not indexed: 90
- Discovered, currently not indexed: 74
- Crawled, currently not indexed: 13
- Not found: 2
- Alternative canonical: 1
- Submitted pages excluded by `noindex`: 0

The sitemap itself was successful, last read on 2026-07-08, and reported 214 discovered pages.

URL Inspection samples:

- `/one-dollar-fiber-what-it-buys/`: not in the Google index at audit time; the live test passed and said the page can be indexed.
- `/canned-vs-dry-beans-cost/`: discovered but not indexed, with no referring page detected.
- `/gut-health-tea-peppermint-ginger/`: indexed successfully with valid HTTPS and breadcrumb enhancement.

### Authority and safety

- External links recognized by GSC: 2, both from Pinterest and both pointing to the homepage.
- Internal links recognized by GSC: 484, with only a very small number attributed to article URLs in the visible summary.
- Manual actions: none.
- Security issues: none.

## Bing Webmaster Tools

| Window | Current | Previous | Verdict |
|---|---:|---:|---|
| 7-day search impressions | 25 | n/a | Small discovery signal |
| 7-day search clicks | 0 | n/a | No traffic outcome |
| 30-day search impressions | 94 | 76 | Up 23.7% |
| 30-day search clicks | 1 | 0 | One verified search click |
| 30-day CTR | 1.06% | 0% | Too little volume for a stable conclusion |
| 3-month search impressions | 211 | n/a | Still very small |
| 3-month search clicks | 3 | n/a | Verified but minimal |

Bing URL Inspection reported `/one-dollar-fiber-what-it-buys/` as indexed successfully with no SEO/GEO issues.

### Bing AI performance

- Seven-day citations: 106.
- Three-month citations: 190.
- Average cited pages: 1.
- `/how-to-eat-more-fiber-on-a-budget-complete-guide/`: 93 citations in the seven-day page report.
- `/high-fiber-gluten-free-bread-recipe-v2/`: 6 citations.
- `/how-to-revive-wilted-lettuce-and-greens/`: 4 citations.
- `/what-30-grams-of-fiber-costs-per-day/`: 3 citations.

The leading grounding query was `cheapest ways to add fiber to diet`, with 29 citations and a 46.03% citation share in the sampled report.

### Bing index and discovery

- Site Explorer: 255 indexed URLs, 48 warnings, 45 excluded, and 0 errors.
- Known URLs: 348.
- Sitemap status: Processing.
- Sitemap last crawl: 2026-05-15.
- Sitemap discovered URLs: 300.
- Backlinks report: no data available.
- Top recommendation: the site does not have enough inbound links from high-quality domains.

### IndexNow

- Submitted URLs: about 3.7K.
- Indexed URLs attributed to IndexNow: 0.
- Crawled URLs attributed to IndexNow: 9.
- URLs submitted in the last four hours: 0.
- Latest visible submissions: 2026-07-04.
- Visible submissions were primarily optimized image assets and `robots.txt`, with source shown as Cloudflare.

## Release success gates

The recovery release is not a growth success merely because it builds or deploys. Review the same live surfaces at 7, 14, and 30 days.

1. Every newly released study has at least three contextual inbound article links.
2. Changed canonical HTML URLs are submitted once through the controlled IndexNow release path; assets and redirects are excluded.
3. At least 80% of the monitored Google cohort is indexed within 21 days.
4. Google records two consecutive weekly impression increases and at least one organic click from the monitored cohort.
5. Bing search impressions exceed the 94-impression 30-day baseline and retain at least one click.
6. The outreach ledger records sent pitches and earned links separately. Drafts do not count as distribution.
7. Human sessions are measured by source. Raw D1 pageviews do not count as acquisition proof.
