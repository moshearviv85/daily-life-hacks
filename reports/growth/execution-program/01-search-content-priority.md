# Search and Content Execution Triage

Date: 2026-07-28
Source: `pipeline-data/traffic-methods.json`
Scope: every row in `Search engines` and `Content & virality`

## Count reconciliation

- Source file: 601 total research rows.
- Search engines: 99.
- Content & virality: 75.
- Audited here: 174.
- Reconciliation: 99 + 75 = 174; no scoped row was omitted.

Decision totals:

| Decision | Count |
|---|---:|
| EXECUTE_NOW | 57 |
| QUEUE | 16 |
| DEPENDENCY | 34 |
| MANUAL_EXTERNAL | 12 |
| REJECT | 55 |
| **Total** | **174** |

Source flag totals:

- DEAD: 28
- MYTH: 17
- SITUATIONAL: 64
- WORKS: 65

Phase totals:

- NOT_SCHEDULED: 55
- PHASE_1_FOUNDATION: 22
- PHASE_2_ASSET_EXECUTION: 35
- PHASE_3_EXTERNAL: 12
- PHASE_3_QUEUE: 16
- PHASE_4_AFTER_DEPENDENCY: 34

## Decision policy

- **EXECUTE_NOW** means the method either repairs a search prerequisite or can exploit assets the site already owns. It still requires a scoped implementation brief and proof.
- **QUEUE** means credible, retained, and sequenced after the first two phases.
- **DEPENDENCY** means valid only after a measurable gate exists. It isn't being dismissed.
- **MANUAL_EXTERNAL** means a third-party account, community action, editorial outreach, or public placement requires an authorized human operator.
- **REJECT** means dead, mythical, dangerous, brand-mismatched, or a non-method report artifact. Every rejection has a row-specific reason in the CSV.

## Highest-impact first 15 tasks

These are in execution order. Items 1-6 establish crawl, quality, trust, and a citable data surface before scaling new assets.

| Order | Task | Owner | Proof required | KPI |
|---:|---|---|---|---|
| 1 | A2. Technical SEO baseline (indexability, canonicals, sitemap, robots) | Engineering/technical SEO | Automated build/schema tests plus live rendered markup, status, canonical, and search-console/indexing evidence. | Valid indexed URLs, eligible enhancements, crawl latency, impressions, and clicks. |
| 2 | A8. Index bloat pruning / content pruning | SEO/content lead | Exact changed URL cohort, link/content diff, green build, live verification, then 28/56-day search comparison. | Indexed-query count, non-brand impressions, average position, organic clicks, and orphan-depth reduction. |
| 3 | A5. Internal linking (contextual, in-prose) | SEO/content lead | Exact changed URL cohort, link/content diff, green build, live verification, then 28/56-day search comparison. | Indexed-query count, non-brand impressions, average position, organic clicks, and orphan-depth reduction. |
| 4 | A11. E-E-A-T signals (author identity, credentials, sourcing, About/Contact) | SEO/content lead | Template/content diff, editorial QA, live page, and controlled CTR/engagement comparison where volume permits. | SERP/social CTR, scroll depth, shares, saves, assisted clicks, and return visits. |
| 5 | A12. Original data / statistics as a ranking and link asset | SEO/content lead | Published dataset/methodology, reproducibility check, live page, and tracked citations/referring domains. | Dataset downloads, citations, referring domains, non-brand impressions, and qualified sessions. |
| 6 | C6. Google Dataset Search | Engineering/technical SEO | Automated build/schema tests plus live rendered markup, status, canonical, and search-console/indexing evidence. | Valid indexed URLs, eligible enhancements, crawl latency, impressions, and clicks. |
| 7 | A4. Topic clusters / pillar-and-spoke architecture | SEO/content lead | Exact changed URL cohort, link/content diff, green build, live verification, then 28/56-day search comparison. | Indexed-query count, non-brand impressions, average position, organic clicks, and orphan-depth reduction. |
| 8 | Comparison pages (X vs Y) | Growth program lead | Before/after artifact plus dated analytics evidence on a fixed URL or asset cohort. | Qualified organic sessions and conversions attributable to the fixed cohort. |
| 9 | Free calculator as an SEO asset | Product engineering | Functional tests, mobile/accessibility QA, live tool, event telemetry, and user-completion evidence. | Tool starts, completion rate, shares, email opt-ins, returning users, links, and organic landing sessions. |
| 10 | Public database / searchable directory | Product engineering | Published dataset/methodology, reproducibility check, live page, and tracked citations/referring domains. | Dataset downloads, citations, referring domains, non-brand impressions, and qualified sessions. |
| 11 | B3. Image pack / Google Images results embedded in web SERP | Engineering/technical SEO | Rendered asset QA, unique image checks, live crawlability, image sitemap/markup evidence, and channel impressions. | Image impressions, image clicks, pin outbound clicks, Discover eligibility, and asset CTR. |
| 12 | B9. Recipe rich results | Engineering/technical SEO | Automated build/schema tests plus live rendered markup, status, canonical, and search-console/indexing evidence. | Valid indexed URLs, eligible enhancements, crawl latency, impressions, and clicks. |
| 13 | A3. Long-tail / low-competition query targeting | SEO/content lead | Exact changed URL cohort, link/content diff, green build, live verification, then 28/56-day search comparison. | Indexed-query count, non-brand impressions, average position, organic clicks, and orphan-depth reduction. |
| 14 | Seasonal content calendar (publish 60–90 days early) | Growth program lead | Publication before demand peak, timestamped trend/source evidence, indexed URL, and event-window analytics. | Time-to-publish, event-query impressions, clicks, referrals, shares, and links. |
| 15 | D1. Bing (and by extension Yahoo, DuckDuckGo, AOL, Ecosia-outside-EU) | SEO program lead | Before/after artifact plus dated analytics evidence on a fixed URL or asset cohort. | Qualified organic sessions and conversions attributable to the fixed cohort. |

## Dependencies that must not be skipped

- **A7. Keyword cannibalization fixes (consolidation / merging)**: Do not start until its gate is met. Fixed article inventory, GSC/Bing query export, URL-level quality rubric, and rollback-safe change list.
- **B1. Featured snippet (position zero)**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **B5. Video carousel / video results in web search**: Do not start until its gate is met. Validated format pilot, native-platform creative, account access, cadence capacity, and outbound measurement.
- **B6. Top Stories carousel**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **C2. Google News (News tab + Publisher Center)**: Do not start until its gate is met. 90-day calendar, monitoring trigger, query validation, reusable rapid-response brief, and source-update SLA.
- **C3. Google Web Stories**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **C5. YouTube search (as a search engine, not a social platform)**: Do not start until its gate is met. Validated format pilot, native-platform creative, account access, cadence capacity, and outbound measurement.
- **C7. Google Shopping free listings / Merchant Center**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **D3. DuckDuckGo**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **D4. Yahoo Search**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **D5. Brave Search**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **D6. Ecosia and Qwant (and the Staan / European Search Index)**: Do not start until its gate is met. Reproducible source data, methodology, date/location scope, citations, and a refresh owner.
- **E1. Pinterest search**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **E3. TikTok search**: Do not start until its gate is met. Validated format pilot, native-platform creative, account access, cadence capacity, and outbound measurement.
- **E4. Instagram search**: Do not start until its gate is met. Validated format pilot, native-platform creative, account access, cadence capacity, and outbound measurement.
- **E7. Recipe aggregators and recipe-app search (Yummly, Allrecipes, Food52, Tasty, Punchfork, Copy Me That, Paprika)**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **E8. Google Lens / visual search**: Do not start until its gate is met. Approved visual style, rights-safe source assets, target query/URL mapping, and image metadata standard.
- **F1. Google AI Overviews (AIO)**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **F2. Google AI Mode**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **F5. Microsoft Copilot / Bing Chat**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **F6. Claude, Gemini, Grok, Meta AI and other assistants**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **G6. MSN / Microsoft Start syndication (Partner Hub)**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **H1. Chrome mobile new-tab feed**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **H2. Microsoft Edge new-tab feed / Windows widgets**: Do not start until its gate is met. Validated user job, trusted input data, privacy/accessibility review, and instrumented outcome events.
- **H7. Dia / AI-browser surfaces (the successor question)**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **Survey-based original research**: Do not start until its gate is met. Reproducible source data, methodology, date/location scope, citations, and a refresh owner.
- **Interactive map / geographic data viz**: Do not start until its gate is met. Reproducible source data, methodology, date/location scope, citations, and a refresh owner.
- **Embeddable widget / iframe with attribution link**: Do not start until its gate is met. Validated user job, trusted input data, privacy/accessibility review, and instrumented outcome events.
- **Live dashboard**: Do not start until its gate is met. Reproducible source data, methodology, date/location scope, citations, and a refresh owner.
- **Reactive newsjacking on breaking news**: Do not start until its gate is met. 90-day calendar, monitoring trigger, query validation, reusable rapid-response brief, and source-update SLA.
- **Data → chart → pin → short (the site's specific pipeline)**: Do not start until its gate is met. Reproducible source data, methodology, date/location scope, citations, and a refresh owner.
- **Transcript → article**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **Challenges people join**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.
- **The "state of the industry" report**: Do not start until its gate is met. Named owner, baseline measurement, and a bounded acceptance test.

## Execution rule

The CSV is the complete method register and remains the source of truth for scope. An agent may start an `EXECUTE_NOW` row only after converting it into a bounded brief with exact files/URLs, baseline, acceptance test, rollback path, and owner. No traffic claim is valid from a build, schema pass, or publication alone; the fixed cohort must be measured after release.
