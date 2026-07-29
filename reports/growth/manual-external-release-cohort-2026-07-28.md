# Manual External Release Cohort 1

Date prepared: 2026-07-28

Status: preparation only

Authority: no external action authorized

## Bottom line

This packet turns the highest-priority manual distribution ideas into seven bounded releases. None is ready for an automatic bulk launch.

| Channel | Decision now | Exact release unit | Blocking gate |
|---|---|---|---|
| Pinterest | Hold, then run an eight-day diagnostic | Eight existing 1000x1500 pins, one per under-covered board | Account cleanup and a same-day queue snapshot |
| Kaggle | Blocked | Food Value Data package v2026.1 | Owner selects a real license and verifies Kaggle's current license field |
| Zenodo | Blocked | Food Value Data package v2026.1 | Owner selects a real license and confirms creator identity |
| Flipboard | Ready after account approval | One public Magazine and six first-party flips | Owner creates or approves the profile and adds third-party curation |
| Data Is Plural | Deferred | Food Value Data submission brief | The newsletter needs to become active and publish a submission route |
| YouTube Shorts and TikTok | Deferred pending a new master | One chart-led fiber-per-dollar short | Existing videos fail the site's claims policy |
| Reddit | Ready after live rule check | One native data post, with no link in the opening post | Owner checks the target community's current rules and posts manually |

The machine-readable source of truth is
`pipeline-data/experiments/manual-external-release-cohort-2026-07-28.json`.
The release ledger is
`pipeline-data/manual-external-release-ledger-2026-07-28.csv`.

## Shared release rules

1. The owner performs every account, publication, upload, contact, and license action.
2. Use only direct canonical URLs. Don't publish an alias, cloaked URL, or redirecting campaign URL.
3. Capture a screenshot or export from the destination plus a landing-page check before a release is marked live.
4. Record the released URL and timestamp in the ledger. An asset isn't live because a draft exists.
5. Evaluate the declared cohort at 7, 30, and 60 days. Don't mix later assets into the result.
6. A removal, moderation warning, broken destination, inaccurate claim, or platform-policy conflict stops that release immediately.

## 1. Pinterest recovery diagnostic

### Why this is gated

The 2026-07-26 diagnostic found an account-level distribution problem, not a click-through problem: historical affiliate spam, off-domain surfaced pins, cloaked redirects, and board mismatches. Adding more pins before confirming account cleanup and the active automated queue would contaminate the test and could produce another burst.

### Exact cohort

Publish at most one cohort pin per day for eight consecutive eligible days. These are existing assets, one from each newly covered board:

| Day | Board | Asset | Canonical destination |
|---|---|---|---|
| 1 | Cheap Meals for Large Families | `public/images/pins/cheap-crockpot-meals-large-families_v5.jpg` | `/cheap-crockpot-meals-large-families/` |
| 2 | High Protein Breakfast Ideas | `public/images/pins/high-protein-vegetarian-breakfast-burritos-you-can-freeze_v1.jpg` | `/high-protein-vegetarian-breakfast-burritos-you-can-freeze/` |
| 3 | High Fiber Snack Ideas | `public/images/pins/grab-and-go-fridge-snack-drawer_v5.jpg` | `/grab-and-go-fridge-snack-drawer/` |
| 4 | High Fiber Breakfast Ideas | `public/images/pins/easy-high-fiber-breakfast-ideas-for-gut-health_v6.jpg` | `/easy-high-fiber-breakfast-ideas-for-gut-health/` |
| 5 | Grocery Budget Tips and Shopping Lists | `public/images/pins/grocery-budget-for-one-person-per-month_v1.jpg` | `/grocery-budget-for-one-person-per-month/` |
| 6 | Sourdough Discard Recipes and Easy Bread | `public/images/pins/how-to-store-homemade-bread_v1.jpg` | `/how-to-store-homemade-bread/` |
| 7 | How to Cook Chicken, Pork and Beef | `public/images/pins/best-way-to-cook-chicken_v1.jpg` | `/best-way-to-cook-chicken/` |
| 8 | Salad Recipes and Homemade Dressings | `public/images/pins/easy-weeknight-fish-tacos-with-cabbage-slaw_v1.jpg` | `/easy-weeknight-fish-tacos-with-cabbage-slaw/` |

The approved titles, descriptions, alt text, and complete UTM URLs are in the JSON packet. Before day 5, re-check the USDA month and figures in the live grocery-budget article. Before day 7, confirm the live chicken article still states the exact cooking and temperature numbers on the pin.

### Owner actions and proof

- Confirm the old affiliate and off-domain pins have been removed or isolated.
- Export the active queue on release day and confirm these eight assets aren't already scheduled.
- Confirm the current daily cap. This eight-pin cohort gets one slot per day and must not create extra volume.
- Save each public pin URL, publication time, board, screenshot, and destination HTTP/canonical check.
- Export Pinterest pin-level impressions, saves, outbound clicks, and source-domain distribution at 7, 30, and 60 days.

### KPI and stop rule

- 7 days: all released pins resolve directly; zero duplicates; zero policy warnings; record impressions and saves without declaring a traffic win.
- 30 days: compare cohort impressions, saves, outbound clicks, and off-domain share with the pre-release baseline.
- 60 days: continue only if the account produces at least 5,000 trailing-30-day impressions by 2026-09-15 or the cohort shows clear qualified referral growth.
- Stop immediately for a policy warning, duplicate scheduling, destination mismatch, or a renewed off-domain spike. If the 2026-09-15 threshold is missed, stop trying to rehabilitate this account and decide between a clean account and reallocating effort.

## 2. Kaggle dataset

### Exact package

Future archive name: `daily-life-hacks-food-value-data-2026.1.zip`

Archive source: `dist-datasets/`

Title: `US Grocery Prices: Protein and Fiber per Dollar (2026)`

Landing URL: `https://www.daily-life-hacks.com/data/?utm_source=kaggle&utm_medium=dataset&utm_campaign=food_value_data_2026_1`

Approved description:

> Twenty-two CSV files compare what US grocery dollars buy in protein, fiber, and practical meal cost. The July 2026 snapshot contains 474 rows, a data dictionary, methodology, source notes, charts, and worked examples. Nutrient values use USDA FoodData Central where tracked. Price inputs use BLS data where tracked and dated national retail listings otherwise. Refuse and edible fractions are documented because a banana peel is not a serving suggestion.

### Owner actions and proof

- Choose and document an explicit license. The current `CITATION.cff` allows reuse with attribution but explicitly says the package isn't under an open license. That is not a platform-ready license decision.
- Verify Kaggle's current license field and terms in the signed-in upload form.
- Create the archive only after the license text, package metadata, and `CITATION.cff` agree.
- Upload manually, verify all 22 CSVs and supporting files, then save the public dataset URL and screenshot.
- Check the UTM landing URL and record Kaggle views, downloads, notebooks, votes, and referred sessions.

### KPI and stop rule

- 7 days: public page, correct license, 22 readable CSVs, and a working tracked landing link.
- 30 days: record views, downloads, notebooks, votes, and referred sessions.
- 60 days: if the page has fewer than 100 views, zero downloads or notebooks, and zero referred sessions after one metadata correction, freeze promotion. Keep the record available, but don't manufacture activity.

## 3. Zenodo dataset record

### Exact record

Future archive name: `daily-life-hacks-food-value-data-2026.1.zip`

Title: `Daily Life Hacks Food Value Data: US Grocery Cost and Nutrient Value (2026.1)`

Resource type: Dataset

Publication date: 2026-07-26

Landing URL: `https://www.daily-life-hacks.com/data/?utm_source=zenodo&utm_medium=repository&utm_campaign=food_value_data_2026_1`

Zenodo's current official help says a published record receives a DataCite DOI. It also says record metadata remains public and is licensed CC0, even when files are restricted. Publishing is therefore a durable metadata and legal action, not a draft-cleanup step.

### Owner actions and proof

- Choose the file license before upload.
- Confirm whether the creator is `Daily Life Hacks`, `David Miller`, or both, and supply the correct affiliation and identifiers.
- Create a draft, verify files and metadata, then publish only after a final owner review.
- Save the DOI, public record URL, deposited archive hash, license screenshot, and tracked landing-link check.

### KPI and stop rule

- 7 days: DOI resolves; files, version, creators, sources, license, and landing URL are correct.
- 30 days: record views, downloads, citations, and referred sessions.
- 60 days: don't delete or churn a DOI record because traffic is low. If there are zero downloads, citations, and referred sessions, stop promotional work and update the record only for a real dataset version.

Official references:

- <https://help.zenodo.org/docs/deposit/>
- <https://help.zenodo.org/docs/deposit/about-records/>
- <https://help.zenodo.org/guides/nih/element5/>

## 4. Flipboard Magazine

### Exact release

Magazine title: `Grocery Math: Food Prices and Nutrition Data`

Approved description:

> What does a dollar actually buy at the grocery store? This magazine collects food-price data, budget meal math, USDA numbers, and practical recipes that survive a Tuesday. The spreadsheets are public because "trust me" isn't a methodology.

Seed it with these six owned stories, each using the exact UTM in the JSON packet:

1. `/fiber-per-dollar-cheapest-high-fiber-foods/`
2. `/protein-per-dollar-cheapest-protein-sources/`
3. `/what-30-grams-of-fiber-costs-per-day/`
4. `/what-50-grams-of-protein-costs-per-day/`
5. `/protein-per-dollar-adjusted-for-quality/`
6. `/usda-thrifty-food-plan-weekly-cost/`

The owner should also add at least three relevant, reputable third-party stories. A Magazine that is only a mirror of our site isn't curation, and it makes the channel harder to evaluate honestly. Do not assume access to Flipboard's publisher or RSS program. This packet uses only the documented self-serve public Magazine workflow.

### Owner actions, KPI, and stop rule

- Create or approve the profile and public Magazine.
- Flip the six exact stories with short captions, add three third-party items, and verify every owned URL resolves directly.
- Proof: public Magazine URL, six public item URLs, Flipboard analytics screenshot/export, and GA4 source/medium sessions.
- 7 days: six owned flips are public and direct; record opens and follows.
- 30 days: target at least 25 owned-article opens or 5 Magazine follows.
- 60 days: target at least 50 qualified site sessions or 10 follows.
- If there are zero owned-article opens after 14 days, check the cover, description, and URLs once. If there are fewer than 10 site sessions and zero follows at 60 days, freeze the Magazine. Don't delete working URLs.

Official references:

- <https://about.flipboard.com/how-to-create-a-magazine/>
- <https://about.flipboard.com/forpublishers/>
- <https://about.flipboard.com/inside-flipboard/creators-guide-to-flipboard/>

## 5. Data Is Plural

### Decision

Defer. The public site currently shows its last edition as 2025-08-27 and doesn't expose a public submission mechanism. A personal-contact hunt isn't a growth system.

Prepared brief for a future public submission route:

> Twenty-two small datasets compare what US grocery dollars buy in protein, fiber, and meal cost. The July 2026 release contains 474 rows plus source notes, a data dictionary, methodology, charts, and worked examples. The project documents price dates, edible fractions, and the difference between a useful comparison and pretending every grocery store charges the same thing.

Future tracked URL:
`https://www.daily-life-hacks.com/data/?utm_source=data_is_plural&utm_medium=newsletter&utm_campaign=food_value_data_2026_1`

Re-open this channel only when a new edition appears within a 60-day window, an explicit public submission route exists, and the owner has selected the dataset license. Do not email or contact anyone from this packet.

Reference: <https://www.data-is-plural.com/>

## 6. YouTube Shorts and TikTok reuse

### Why the existing masters are deferred

The current MP4 candidates contain claims the site's content rules don't allow:

- `dlh-fiber-japan/output-v4-new.mp4`: unhedged health, longevity, and inflammation claims.
- `dlh-healthy-fats/output-v3-new.mp4`: absolute weight and fat claims.
- `dlh-cabbage/output-v5.mp4`: supplement comparison and gut-health claims.
- `dlh-short-01/output-v2.mp4`: unhedged digestion, hunger, and energy claims.

A caption can't repair spoken audio or text burned into a video. These masters must not be uploaded.

### Replacement brief

Source chart: `public/images/fiber-per-dollar-top-20-chart.jpg`

Destination article: `/fiber-per-dollar-cheapest-high-fiber-foods/`

Master: 1080x1920, 25 to 35 seconds, watermark-free, chart-led, no realistic AI people, and only owner-cleared music.

Approved voiceover and on-screen script:

> We priced 53 foods by grams of fiber per dollar. Whole wheat flour came first in this July 2026 snapshot at 77.8 grams per dollar. Dry split peas, pinto beans, black beans, and popcorn kernels filled the next seats. The produce aisle was invited. It just didn't win the spreadsheet. Full CSV and method at daily-life-hacks.com.

Approved title: `We Ranked 53 Foods by Fiber per Dollar`

YouTube tracked URL:
`https://www.daily-life-hacks.com/fiber-per-dollar-cheapest-high-fiber-foods/?utm_source=youtube&utm_medium=shorts&utm_campaign=fiber_dollar_2026_1`

TikTok tracked URL:
`https://www.daily-life-hacks.com/fiber-per-dollar-cheapest-high-fiber-foods/?utm_source=tiktok&utm_medium=short_video&utm_campaign=fiber_dollar_2026_1`

TikTok's current help says a website profile link requires 1,000 followers or a Registered Business Account. The caption must not promise a clickable link until the owner confirms eligibility. If any realistic AI scene is added later, use TikTok's required AI-content disclosure.

### KPI and stop rule

- 7 days: record YouTube Engaged views, viewed-versus-swiped, average percentage viewed, subscribers, and site sessions; record TikTok views, completion, profile visits, follows, and site sessions.
- 30 days: evaluate only after four compliant uploads. YouTube target: median 250 Engaged views and 70% average percentage viewed for a roughly 30-second Short. TikTok target: median 500 views and at least 5 profile visits.
- 60 days: evaluate after eight compliant uploads. Continue only if the cohort produces improving median reach, at least 10 subscribers or follows, or at least 10 qualified site sessions.
- Stop the format if eight compliant uploads have a median below 100 meaningful views and zero subscribers, follows, profile visits, and referred sessions. A weak first upload isn't a verdict.

Official references:

- <https://support.google.com/youtube/answer/15424877?hl=en>
- <https://support.google.com/youtube/answer/10059070?hl=en>
- <https://support.tiktok.com/en/getting-started/setting-up-your-profile/linking-another-social-media-account>
- <https://www.tiktok.com/community-guidelines/en/integrity-authenticity/>

## 7. Reddit native-data post

### Exact release

Target candidate: `r/EatCheapAndHealthy`, subject to a same-day rule check.

Source data: `dist-datasets/data/fiber-per-dollar-2026.csv`

Native chart: `dist-datasets/charts/fiber-per-dollar-top-20-chart.jpg`

Initial post: no site link.

Approved title:

> I priced 53 foods by grams of fiber per dollar. The dry-goods aisle was rude about it.

Approved body:

> Disclosure: I run Daily Life Hacks, and this is from a grocery-price dataset I built.
>
> I compared 53 foods using package price, package weight, edible fraction, and USDA fiber per 100 grams. This was a July 2026 US price snapshot, so it isn't a promise about your store.
>
> | Rank | Food | Fiber per dollar |
> |---:|---|---:|
> | 1 | Whole wheat flour | 77.8 g |
> | 2 | Green split peas, dry | 71.0 g |
> | 3 | Pinto beans, dry | 70.8 g |
> | 4 | Black beans, dry | 58.1 g |
> | 5 | Popcorn kernels | 57.7 g |
>
> The useful part wasn't "beans are cheap." Civilization had that scoop. It was seeing how much package size, edible waste, and the actual shelf price changed the order.
>
> If the community wants it and the rules allow it, I'll add the full CSV and method in a comment. Otherwise, the table can stay here and earn its keep.

If a user asks for the file and the community rules allow it, the owner may post one disclosed reply with:
`https://www.daily-life-hacks.com/fiber-per-dollar-cheapest-high-fiber-foods/?utm_source=reddit&utm_medium=community&utm_campaign=fiber_dollar_native_2026_1&utm_content=reply`

### Owner actions, KPI, and stop rule

- Read the community rules on the posting day. Confirm native chart posts, disclosures, and later links are allowed.
- Confirm the account has normal non-promotional participation. Post manually and respond like a person, not a scheduler.
- Save the public post URL, rule screenshot, post screenshot, moderation state, upvotes, comments, saves if visible, link-request count, and referred sessions.
- 7 days: measure removal state, vote score, substantive comments, data questions, link requests, and referrals. A useful discussion matters more than a raw impression count.
- 30 days: post one new native-data topic only if the first remained up and produced substantive discussion or qualified referral demand.
- 60 days: continue only if two carefully separated native posts survive moderation and produce useful discussion, link requests, or referred sessions.
- Stop immediately for removal, moderator warning, or rule conflict. Never repost the removed item to another community. Two removals or two posts with no substantive response end this format.

Reddit's current spam policy warns against repeated unsolicited engagement and says accounts that primarily share their own business links should contribute thoughtfully and follow each community's rules.

Reference: <https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam>

## Approval gates

The owner can approve channels independently:

| Gate | Owner decision needed | What approval permits |
|---|---|---|
| PIN-1 | Account cleanup complete and queue snapshot reviewed | Manual scheduling of exactly the eight listed pins |
| DATA-1 | Explicit dataset license selected | Update package metadata and create the release archive |
| KAG-1 | Kaggle account and current form reviewed | Manual Kaggle upload of the approved archive |
| ZEN-1 | Creator identity and durable DOI publication approved | Manual Zenodo draft and final publication |
| FLIP-1 | Profile and Magazine creation approved | Manual creation and nine-item seed curation |
| VIDEO-1 | New compliant master rendered and visually reviewed | Native YouTube and TikTok uploads |
| RED-1 | Same-day subreddit rules and account history reviewed | One native post, no initial link |

Data Is Plural has no approval gate because it is deferred until the channel itself changes.
