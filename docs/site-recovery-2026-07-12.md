# Site Recovery Plan — 2026-07-12

## Verified baseline

This plan starts from live Search Console data and a full local build, not from
an SEO checklist score.

| Signal | Verified state |
|---|---:|
| Google Search impressions, last 3 months | 29 |
| Google Search clicks, last 3 months | 0 |
| Average position | 78.2 |
| URLs discovered in the sitemap by GSC | 190 |
| URLs in the live sitemap | 195 |
| Indexed URLs reported by GSC | 134 |
| Discovered, not crawled | 69 |
| Crawled, not indexed | 44 |
| Internal link occurrences that pass through a redirect | 4,187 |
| Unique internal redirect destinations | 555 |
| Articles in the repository | 186 |
| Generated tag pages | 361 |
| Articles containing repeated filler blocks | 22 |
| Meaningful third-party mentions found in a live web search | 0 |

Baseline gate: `npm run build:checked` passed before recovery work began.

## Diagnosis

There is no single technical indexing collapse. The sitemap, canonical pages,
images, Recipe schema, robots policy, aliases, and production build are working.
The growth system is failing in four places:

1. **Google has very little reason to rank the site yet.** Most pages are new,
   the average position is near page eight, and there is no visible editorial
   authority outside the domain.
2. **Part of the inventory looks mass-produced.** Repeated filler blocks,
   overlapping intent, weak sourcing, and fragmented tags dilute the genuinely
   differentiated data assets.
3. **The internal graph is noisy.** Thousands of links point through redirects,
   most tags barely repeat, and the related-content system pushes all three
   pillars into unrelated pages.
4. **The operating data is not trustworthy.** The on-page audit misreads
   unquoted YAML, its upgrade queue inherits those false positives, and the
   lead-magnet handoff does not deliver the PDF that already exists.

Publishing more generic articles would make all four problems worse.

## Recovery sequence

### Batch A — restore truth, trust, and crawl efficiency

- [x] Link every internal navigation/card/tag/category URL directly to its
      trailing-slash canonical.
- [x] Add a build gate that fails on internal links to non-canonical HTML URLs.
- [x] Add `CollectionPage` and `ItemList` structured data to the three category
      hubs.
- [x] Fix the on-page audit parser, regenerate the report, and rebuild the
      upgrade queue from real frontmatter.
- [x] Deliver the existing 7-day meal-plan PDF on the thank-you page and measure
      the download.
- [x] Make pipeline `dry_run` genuinely side-effect free and guarantee cleanup
      for queued topics after failures.
- [x] Remove the repeated filler blocks from the 22 affected articles.
- [x] Stop the global three-pillar boost in Related Articles.

Exit gate: targeted tests pass, `npm run build:checked` passes, the generated
HTML contains no internal redirect links, and the lead-magnet file/CTA/event are
present in the build.

Batch A proof: commit `5aa183c`; Cloudflare preview workflow run `29179963942`
passed and the preview returned `200` for the homepage, thank-you page, PDF,
Recipes, Contact, and a cleaned article.

### Batch B — consolidate topical authority

1. Freeze generic article production until the inventory validator passes.
2. Add an explicit `cluster` and `parentPillar` to frontmatter. Do not infer
   authority from one-off tags.
3. Use one parent theme: **Healthy Eating on a Budget**, with Fiber per Dollar,
   Protein per Dollar, and Weekly Budget/Shopping as its core branches.
4. Build Meal Prep & Food Storage as the second controlled cluster.
5. Review high-confidence cannibalization pairs with GSC page/query data before
   choosing a winner and a 301 target.
6. Add contextual spoke-to-pillar links and primary-source citations to the
   nutrition inventory in bounded batches.
7. Reduce the tag vocabulary to a controlled set before removing or redirecting
   old tag pages.

Exit gate: every released article belongs to one explicit cluster, links to one
parent, and has no unresolved high-confidence intent duplicate.

### Batch C — earn authority instead of manufacturing volume

The original datasets are the site's strongest moat:

- Fiber per Dollar study and CSV
- Protein per Dollar study and CSV
- What 30 Grams of Fiber Costs per Day
- The calculator and methodology page

Turn those into one outreach campaign at a time:

1. Build a list of journalists, dietitian publications, university extension
   programs, budgeting newsletters, and food-cost reporters whose existing work
   directly overlaps the dataset.
2. Pitch one specific finding, one chart, and the underlying CSV. Do not pitch
   “our useful blog.”
3. Publish a short methodology/correction log that makes the data easy to cite.
4. Repurpose the finding into Reddit/Pinterest only after the source page and
   measurement are ready.

No automated posting or unsolicited outreach is part of this code batch.
External messages require a reviewed target list and message set.

## 30-day scorecard

These are targets, not promises:

| Metric | 30-day target |
|---|---:|
| Non-branded GSC impressions in a rolling 28-day window | 300+ |
| Pages receiving at least one impression | 40+ |
| Pages with an average position in the top 50 | 10+ |
| Earned, relevant editorial links to a data asset | 3+ |
| Internal links that require a redirect | 0 |
| Repeated filler blocks from the known pattern set | 0 |
| Lead-magnet signup-to-download event coverage | measurable end to end |

Review GSC weekly, but make keep/kill decisions on 28-day windows. Indexing and
rank movement lag deploys; build success and URL availability are not traffic
success.

## Proof rules

- Do not call an article batch successful without exact files, validator output,
  build output, and staging/live URL evidence.
- Do not call an SEO fix successful because a local report is green. Confirm the
  generated HTML and the live URL behavior.
- Separate workflow success, per-item success, live success, and traffic success
  in every status report.
- Do not resume broad article production until Batch A is closed and Batch B has
  an explicit cluster map.
