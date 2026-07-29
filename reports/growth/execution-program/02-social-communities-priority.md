# Social Platforms and Communities Execution Triage

**Scope:** every entry in `pipeline-data/traffic-methods.json` whose category is `Social platforms` or `Communities & forums`.

**Date:** 2026-07-28
**Mode:** planning only. No account actions, posts, pins, D1 changes, site edits, commits, pushes, or deploys were performed.

## Count reconciliation

| Source category | Expected | Audited | Difference |
|---|---:|---:|---:|
| Social platforms | 80 | 80 | 0 |
| Communities & forums | 66 | 66 | 0 |
| **Total** | **146** | **146** | **0** |

Every source row appears exactly once in `02-social-communities-triage.csv`. Index rows were retained for reconciliation and rejected as non-executable duplicates.

## Decision counts

| Decision | Count | Meaning |
|---|---:|---|
| EXECUTE_NOW | 14 | Internal setup, governance, or reusable preparation that can start without an audience |
| MANUAL_EXTERNAL | 18 | Worth testing now but requires a human account action and current platform-rule check |
| DEPENDENCY | 30 | Viable only after a named account, audience, eligibility, permission, or safety gate |
| QUEUE | 41 | Revisit after the first measured 30-day channel tests |
| REJECT | 43 | Dead, mythical, off-audience, policy-dangerous, duplicate index, or negative expected return |
| **Total** | **146** | |

Rejected rows by source flag: DEAD=27, MYTH=12, SITUATIONAL=4. A source flag was not treated as an automatic command: a few `SITUATIONAL` rows are rejected where the site's credential, audience, or domain history makes the risk unacceptable.

## Non-negotiable dependencies and safety gates

1. **Pinterest recovery gate:** run clean distribution measurement before increasing volume. Record impressions and outbound clicks, not saves alone.
2. **Reddit/domain gate:** do not re-enter a banned subreddit, evade a ban, seed votes, use alternate accounts, or self-link while the domain is filtered. Check every contribution logged out.
3. **Community rules gate:** archive current rules before contributing. Respect per-community age, karma, contribution, disclosure, and link requirements.
4. **Credential gate:** keep food-community contributions on costs, labels, and sourced data. Do not give medical advice or enter condition communities under an uncredentialed pen name.
5. **Human-action gate:** agents may research, prepare, validate, and measure. A human owner must perform account creation, joining, posting, commenting, messaging, or automation authorization.
6. **Measurement gate:** every external test needs a unique UTM or a measurable profile/referral path, a live artifact, a seven-day reading, and a 30-day decision.
7. **Freeze rule:** after any removal, warning, or ban, stop link-bearing promotion for 14 days and audit before resuming.

## Highest-impact first 15 tasks, in execution order

| # | Task | Decision | Owner | Exit proof |
|---:|---|---|---|---|
| 1 | Cadence discipline and the freeze rule | EXECUTE_NOW | Growth operations agent | Completed checklist or live artifact plus UTM/referral analytics at 7 and 30 days |
| 2 | The N-posts-before-linking rule, per platform | EXECUTE_NOW | Growth operations agent | Completed checklist or live artifact plus UTM/referral analytics at 7 and 30 days |
| 3 | Pinterest account rehabilitation after spam-pin removal | MANUAL_EXTERNAL | Owner / human community manager | Pin URL/screenshot; destination and UTM verified; 7/30-day impressions, outbound clicks, saves, and no policy warning |
| 4 | Boards as SEO assets (board titles, descriptions, keyword architecture) | MANUAL_EXTERNAL | Owner / human community manager | Completed checklist or live artifact plus UTM/referral analytics at 7 and 30 days |
| 5 | Pinterest standard pins (static image + outbound link) | MANUAL_EXTERNAL | Owner / human community manager | Pin URL/screenshot; destination and UTM verified; 7/30-day impressions, outbound clicks, saves, and no policy warning |
| 6 | Pinterest video pins | MANUAL_EXTERNAL | Owner / human community manager | Pin URL/screenshot; destination and UTM verified; 7/30-day impressions, outbound clicks, saves, and no policy warning |
| 7 | Repurposing one asset across N platforms | EXECUTE_NOW | Growth operations agent | Completed checklist or live artifact plus UTM/referral analytics at 7 and 30 days |
| 8 | Profile optimization as a search asset | MANUAL_EXTERNAL | Owner / human community manager | Completed checklist or live artifact plus UTM/referral analytics at 7 and 30 days |
| 9 | Link-in-bio strategy (single rotating link vs. link menu) | EXECUTE_NOW | Growth operations agent | Completed checklist or live artifact plus UTM/referral analytics at 7 and 30 days |
| 10 | YouTube Shorts | MANUAL_EXTERNAL | Owner / human community manager | Live post URL/screenshot; profile link verified; 7/30-day views, profile visits, outbound sessions, and no removal |
| 11 | TikTok short-form video (standard FYP video) | MANUAL_EXTERNAL | Owner / human community manager | Live post URL/screenshot; profile link verified; 7/30-day views, profile visits, outbound sessions, and no removal |
| 12 | TikTok Search / TikTok SEO (captions, on-screen text, spoken keywords) | EXECUTE_NOW | Content repurposing agent + owner publish approval | Live post URL/screenshot; profile link verified; 7/30-day views, profile visits, outbound sessions, and no removal |
| 13 | Subreddit selection and tiering | EXECUTE_NOW | Community research agent + owner action | Rule snapshot; live logged-out URL; removal status; profile/organic sessions; no link if disallowed |
| 14 | [OC] original-content data posts | DEPENDENCY | Growth operations agent | Completed checklist or live artifact plus UTM/referral analytics at 7 and 30 days |
| 15 | YouTube comments as a tactic | MANUAL_EXTERNAL | Owner / human community manager | Live post URL/screenshot; profile link verified; 7/30-day views, profile visits, outbound sessions, and no removal |

### How this sequence reaches execution

- **Tasks 1-2** install the safety system before anyone touches an account.
- **Tasks 3-6** recover and test Pinterest using the account and assets already in scope.
- **Tasks 7-9** create one reusable distribution package and make every profile click land on the exact matching article.
- **Tasks 10-12** test the existing vertical assets on YouTube and TikTok without commissioning new production first.
- **Tasks 13-14** prepare Reddit's safest useful path: native original data, full value in-platform, and no self-link until the domain/account gates pass.
- **Task 15** tests the best risk-adjusted comment channel with unique, link-free, data-bearing YouTube comments and profile-based attribution.

## Explicit deferrals and rejections

- **Follower-gated surfaces** such as Instagram Stories, broadcast channels, WhatsApp, Telegram, and private community products are deferred until an audience exists. Creating an empty channel is not acquisition.
- **High-production surfaces** such as YouTube long form and owned Facebook Groups remain queued until low-cost reuse tests prove a topic can earn clicks.
- **Regional/language mismatches** such as VK, Naver, and RedNote are rejected for a US English site.
- **Dead discovery mechanisms** such as Facebook Page link posts, Instagram hashtag growth, group-board reach, legacy bookmarking sites, Yahoo Answers, and Vimeo-as-discovery are rejected.
- **Manipulation tactics** such as bought engagement, follow/unfollow, engagement pods, aged accounts, sock puppets, seeded questions, and ban evasion are rejected because they risk permanent account/domain enforcement and corrupt measurement.
- **Credential-risk communities** are rejected where an uncredentialed brand would be perceived as offering condition-specific advice.

The CSV is the row-level source of truth. No method was silently omitted: each has a decision, reason, owner, prerequisite, proof requirement, KPI, and phase.
