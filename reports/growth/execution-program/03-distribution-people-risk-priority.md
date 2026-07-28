# Distribution, People, and Risk Triage

Date: 2026-07-28
Scope: every entry in `pipeline-data/traffic-methods.json` whose category is Distribution surfaces, People & partnerships, or Hacks, myths & folklore.
Mode: planning only. No outreach, account creation, submissions, production edits, D1 writes, commits, pushes, or deployment were performed.

## Bottom line

All **281 of 281** scoped source records were reconciled into the companion CSV. Nothing was silently omitted. Legitimate methods were assigned to an execution phase, a dependency, or a manual-external lane. Dead, mythical, unsafe, manipulative, paid-link, and black-hat methods were explicitly rejected with a row-level reason.

The program starts with owned assets that can earn discovery repeatedly: statistics pages, original studies, licensed datasets, a public repository, Dataset Search eligibility, dataset distribution, useful tools, safe embeds, an updated leaderboard, unanswered-question content, and calendar-driven newsjacking. Outreach and account-dependent distribution remain visible as MANUAL_EXTERNAL, not hidden or falsely described as completed.

## Reconciliation

### Source category counts

| Category | Rows |
|---|---:|
| Distribution surfaces | 85 |
| Hacks, myths & folklore | 123 |
| People & partnerships | 73 |
| **Total** | **281** |

### Decision counts

| Decision | Rows |
|---|---:|
| DEPENDENCY | 32 |
| EXECUTE_NOW | 28 |
| MANUAL_EXTERNAL | 81 |
| QUEUE | 14 |
| REJECT | 126 |
| **Total** | **281** |

### Phase counts

| Phase | Rows |
|---|---:|
| NEVER | 126 |
| P1_0_30D | 19 |
| P1_MANUAL_0_30D | 13 |
| P2_31_60D | 9 |
| P2_DEPENDENCY_31_60D | 32 |
| P2_MANUAL_31_60D | 68 |
| P3_QUEUE_61_90D | 14 |
| **Total** | **281** |

### Rejected rows by source flag

| Source flag | Rejected rows |
|---|---:|
| BLOCKED-BY-CONSTRAINT | 4 |
| DANGEROUS | 42 |
| DEAD | 28 |
| MYTH | 31 |
| SITUATIONAL | 18 |
| WORKS | 3 |
| **Total rejected** | **126** |

## Why methods were rejected

- **Unsafe or black-hat:** PBNs, link farms, bought or rented links, expired-domain redirects, tiered links, parasite SEO, hidden text, cloaking, spun/scraped/translated spam, doorway pages, automated spam, and hacked-site links were rejected because they create manual-action, deindexing, security, legal, or brand risk.
- **Manipulated engagement:** vote rings, traffic exchanges, safelists, CTR/dwell-time bots, engagement pods, follow/unfollow automation, fake reviews, and aged social accounts were rejected because they violate platform integrity rules and do not create qualified readers.
- **Dead channels:** obsolete directories, dead aggregators, signature/comment-link tactics, RSS directory submission, and discontinued services were rejected because there is no active audience or reliable referral path.
- **Myths:** keyword-density rules, LSI keywords, minimum word counts, generic posting-time formulas, meta-keywords, and similar folklore were rejected because the claimed mechanism is unsupported.
- **Wrong fit or no organic case:** paid newsletter networks, buying another website, mass AI-directory submission, and private-site submission to government open-data catalogs were rejected because they are paid acquisition, capital acquisition, irrelevant, or ineligible rather than organic promotion.
- **Wikipedia:** self-placement was rejected, not the possibility of being cited. An independent citation is an earned outcome and must not be manufactured.
- **Paid press-release SEO:** wire syndication was rejected because duplicated nofollow copies are not an editorial link strategy. Genuine press outreach stays in the manual-external lane.

Each rejected CSV row names the specific method and its specific failure mode. The rejection is therefore auditable and reversible if the underlying channel materially changes.

## Dependencies that must be cleared

1. **Data package:** validated CSV files, data dictionaries, methodology, stable study URLs, and an explicit reuse license.
2. **Measurement:** UTM convention, analytics events for tools/downloads, Search Console and Bing cohorts, and a 30-day outcome template.
3. **Tool/embed standard:** useful output, accessible mobile UI, safe attribution, copy-paste embed code, performance review, and abuse controls.
4. **Manual distribution authority:** account ownership and explicit approval before creating accounts, submitting, posting, pitching, or joining external platforms.
5. **Newsletter readiness:** clear promise, working subscription flow, baseline subscriber cohort, and enough recurring material before referral or recommendation programs.
6. **Audio readiness:** owned feed, repeatable format, host/profile assets, and at least three finished episodes before podcast-directory submission.
7. **Translation readiness:** demonstrated demand, native editorial QA, hreflang/canonical plan, and capacity to maintain translated pages.
8. **Partnership readiness:** qualified target list, approved message, relationship owner, destination URL, tracking, and a non-spam follow-up limit.

## Highest-impact first 15 tasks

The order below balances expected organic upside, reuse across later methods, prerequisites unlocked, and measurability. MANUAL_EXTERNAL means a human must approve and perform the external action. It does not mean the task was skipped.

| Order | Task | Decision | Impact | Effort | Phase | Required proof |
|---:|---|---|---|---|---|---|
| 1 | C1. The statistics page strategy | EXECUTE_NOW | High | M | P1_0_30D | Live public asset, source/license/methodology links, analytics event, Search Console/Bing inclusion evidence, and 30-day cohort report. |
| 2 | C2. Original research / data study as link bait | EXECUTE_NOW | High | L | P1_0_30D | Live artifact or logged experiment, baseline, tagged traffic, and 30-day outcome report. |
| 3 | C5. Open dataset with an attribution-requiring license | EXECUTE_NOW | Medium-High | M | P1_0_30D | Live public asset, source/license/methodology links, analytics event, Search Console/Bing inclusion evidence, and 30-day cohort report. |
| 4 | GitHub repo for the datasets + code | EXECUTE_NOW | Medium-High | L | P1_0_30D | Live public asset, source/license/methodology links, analytics event, Search Console/Bing inclusion evidence, and 30-day cohort report. |
| 5 | Google Dataset Search | EXECUTE_NOW | Medium-High | S | P1_0_30D | Live public asset, source/license/methodology links, analytics event, Search Console/Bing inclusion evidence, and 30-day cohort report. |
| 6 | Kaggle Datasets | MANUAL_EXTERNAL | High | S | P1_MANUAL_0_30D | Submission/outreach log, destination URL, date, response/status, UTM link, and referral analytics screenshot/export. |
| 7 | Zenodo (CERN) | MANUAL_EXTERNAL | Medium-High | S | P1_MANUAL_0_30D | Submission/outreach log, destination URL, date, response/status, UTM link, and referral analytics screenshot/export. |
| 8 | C9. Free tools and calculators as citation magnets | EXECUTE_NOW | High | L | P1_0_30D | Live public asset, source/license/methodology links, analytics event, Search Console/Bing inclusion evidence, and 30-day cohort report. |
| 9 | E3. Giving away a free tool that creators use and credit | EXECUTE_NOW | Medium | L | P2_31_60D | Live public asset, source/license/methodology links, analytics event, Search Console/Bing inclusion evidence, and 30-day cohort report. |
| 10 | H3. "Powered by" attribution and embeddable badges | EXECUTE_NOW | Medium-High | M | P1_0_30D | Live artifact or logged experiment, baseline, tagged traffic, and 30-day outcome report. |
| 11 | The public leaderboard / always-updated ranking | EXECUTE_NOW | High | M | P1_0_30D | Live public asset, source/license/methodology links, analytics event, Search Console/Bing inclusion evidence, and 30-day cohort report. |
| 12 | Answer the question that has no good answer yet | EXECUTE_NOW | High | L | P1_0_30D | Live artifact or logged experiment, baseline, tagged traffic, and 30-day outcome report. |
| 13 | Newsjacking | EXECUTE_NOW | High | M | P1_0_30D | Live artifact or logged experiment, baseline, tagged traffic, and 30-day outcome report. |
| 14 | Flipboard (Magazines + feed ingest) | MANUAL_EXTERNAL | Medium-High | XS | P1_MANUAL_0_30D | Submission/outreach log, destination URL, date, response/status, UTM link, and referral analytics screenshot/export. |
| 15 | Data Is Plural (Jeremy Singer-Vine's newsletter) | MANUAL_EXTERNAL | High | XS | P1_MANUAL_0_30D | Submission/outreach log, destination URL, date, response/status, UTM link, and referral analytics screenshot/export. |

## End-to-end execution gates

1. **Baseline:** freeze URL cohorts and record current clicks, impressions, referring domains, dataset downloads, tool events, and newsletter conversions.
2. **Foundation:** finish license, methodology, data dictionary, canonical URLs, attribution language, analytics events, and UTM rules.
3. **Owned assets:** publish or upgrade the statistics hub, original studies, open datasets, tools, embeds, leaderboard, and unanswered-question pages.
4. **Technical validation:** run repository validation/build checks and verify every live asset, canonical, structured-data output, feed, download, and event.
5. **Manual distribution packet:** prepare channel-specific copy and screenshots, then request approval for each external account, submission, post, or outreach batch.
6. **Controlled release:** release one trackable cohort at a time. Do not mix multiple channels into one unmeasurable launch.
7. **Measurement:** check operational proof immediately, indexing/acceptance after the platform's normal lag, and traffic/links at 7, 30, and 60 days.
8. **Decision:** scale only methods with qualified sessions, links, citations, subscribers, or repeatable reach. Stop methods that deliver only vanity impressions.
9. **Refresh:** update datasets, statistics, and leaderboards on a published cadence so citations do not decay.
10. **Audit trail:** retain every execution, queue, dependency, manual-external, and rejection decision. No method disappears without a reason.

## Files

- Source: `pipeline-data/traffic-methods.json`
- Full row-level triage: `reports/growth/execution-program/03-distribution-people-risk-triage.csv`
- Priority and reconciliation report: `reports/growth/execution-program/03-distribution-people-risk-priority.md`
