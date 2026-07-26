# Authority Without Outreach — daily-life-hacks.com

**Date:** 2026-07-26
**Scope:** Ways to earn authority signals, citations, and inbound links with **zero cold email and zero pitching**.
**Hard constraint:** Cold outreach is permanently off the table. Nothing in section A/B/C requires emailing a stranger to ask for anything. Every method works by (a) passive discovery, (b) publishing to a platform, (c) participating in a community, (d) making our assets legally/technically reusable, or (e) submitting through an open self-serve form.

---

## 0. Verification status — read this first

This report was produced under a **hard research budget limit**. The session's web-search quota was exhausted partway through. That materially affects how much of this is verified, and I am flagging it rather than papering over it.

Every method below carries one of three flags:

| Flag | Meaning |
|---|---|
| **EVIDENCED** | Verified live during this session, with a URL and the numbers actually returned. Trust these. |
| **UNVERIFIED-DOC** | Based on documented platform behavior I know but did **not** re-fetch today. Platform rules change and platforms die. **Budget 5 minutes to confirm the platform is alive and the rules unchanged before acting.** |
| **SPECULATIVE** | Reasoned inference. No source. Treat as a hypothesis to test cheaply, not a plan. |

**What was verified live today (2026-07-26):**
- The Ahrefs AI Overview correlation study (numbers below)
- llms.txt real-world consumption evidence
- Common Crawl inclusion mechanics
- LLM-cited content-type research (Semrush/Profound figures)
- AI visibility tool pricing
- Our own repo/asset inventory (fully verified by direct file inspection)

**Everything else is UNVERIFIED-DOC or SPECULATIVE.** In particular, I did **not** re-verify the current status of: Zenodo eligibility rules, Data Is Plural's submission mechanism, Product Hunt's link attributes, Wikipedia/Wikimedia policy specifics, or whether the smaller directories and awards are still alive. Two attempted fetches (Zenodo help, Data Is Plural) returned pages that did not contain the answers. **Do not treat the directory/award/deposit sections as confirmed.**

---

## 1. Asset audit — what we actually have (verified by file inspection today)

| Asset | Actual count | Notes |
|---|---|---|
| Public CSV datasets | **22** | `public/data/*.csv` — 6 core + 16 derived |
| Original charts | **31** | `public/images/*chart*.jpg` |
| Articles | **216** | `src/data/articles/*.md` |
| Free calculators/tools | **7** | `/tools/` |
| Methodology page | Yes | `/methodology/` |
| llms.txt | **Yes, and it is genuinely good** | Has an explicit Attribution section with a preferred citation string |
| robots.txt AI-crawler policy | **Already allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bytespider** | Correct posture, already done |
| Reddit account | 171 karma | Banned from r/EatCheapAndHealthy 2026-07 — constrains community plays |

### The four gaps that block almost everything else

These are the highest-leverage findings in this report, because most methods below depend on them:

1. **No `/license/` page and no formal license anywhere.** `llms.txt` says the CSVs are "free to reuse" and politely *asks* for attribution. A polite request is not a license. Without a named license (CC BY 4.0), reuse carries **no attribution obligation at all** — people can take our numbers and credit nobody, legally. This is the single cheapest fix in the report.
2. **No `/data/` HTML landing page.** The CSVs are bare files. There is no human- or crawler-facing hub with `schema.org/Dataset` markup, so **we are almost certainly invisible to Google Dataset Search** — the one discovery surface built specifically for what we uniquely own.
3. **`dataset-provenance.json` documents only 4 of 22 CSVs.** The other 18 have no machine-readable provenance.
4. **No journalist/press page.** Nothing for a reporter who lands on the data to understand what they may use and how to credit it.

---

## 2. The strategic frame

Verified today, and it should govern prioritization:

> **Ahrefs, 75,000 brands, published 2025-05-26.** Spearman correlations with AI Overview brand visibility: **branded web mentions 0.664**, branded anchors 0.527, branded search volume 0.392, Domain Rating 0.326, referring domains 0.295, branded traffic 0.274, **backlinks 0.218**. Top three factors are all off-site and all mention-based, not link-based.
> — https://ahrefs.com/blog/ai-overview-brand-correlation/ (EVIDENCED, checked 2026-07-26)

Mention/backlink ratio is 0.664 / 0.218 ≈ **3.0x**, which confirms the owner's recollection precisely.

**Caveat I want on the record:** this is *correlation*, on domains filtered to DR>40, on keywords with 800+ monthly searches. We are almost certainly below that DR filter, so we sit outside the studied population. It also cannot separate "mentions cause visibility" from "big brands get both." Directionally useful; not a law of physics. Do not let it justify unlimited effort on unlinked mentions.

Also verified today:
- **LLM-cited content skews to listicles and how-tos (>40% of cited content, Semrush, ~80M queries); cited pages average 1,400–2,400 words; structured headings, bullets and explicit Q&A blocks correlate with citation** (EVIDENCED — via Contently/L'Atelier summaries of Semrush + Profound 2026 data, checked 2026-07-26). Our ranked-data studies fit this shape well.
- **Common Crawl includes sites by default unless blocked; inclusion is the baseline, exclusion the exception** (EVIDENCED, checked 2026-07-26, https://commoncrawl.org/get-started). Our robots.txt already allows everything, so **we are already in the training pipeline. No action needed.**

Also confirmed by a parallel evidenced review of primary sources (2026-07-26):
- **Schema markup does NOT drive AI citations.** Google states this explicitly, and the one controlled study found approximately zero (or slightly negative) effect. Schema below is therefore justified **only** where it gates a specific discovery surface — never as a generic "AI optimization" move.
- **Google Dataset Search is crawl-only.** There is no submission form; inclusion happens when Google crawls a page carrying valid `schema.org/Dataset` markup. That keeps method #9 valid (the markup is the *entry ticket* for that one surface) but changes the action: publish the marked-up `/data/` pages and let the crawler find them — nothing to "submit."
- **Google Scholar is a no-go** for a non-academic self-published dataset. It is excluded from this report.
- **llms.txt is dead as a citation driver** (independently confirmed twice — see #64).

**Implication:** our comparative advantage is not links, and it is not markup. It is that we own **original, dated, methodologically documented numbers in a niche where almost nobody publishes primary data.** Everything in tier A exploits that and nothing else.

---

## 3. Methods

Signal legend: **DF** = dofollow link · **NF** = nofollow link · **UM** = unlinked brand mention · **AI** = AI-citation supply · **ENT** = entity signal

### 3.1 Licensing — make attribution legally required (foundation layer)

| # | Method | First concrete action | Signal | Effort | Time to effect | Risk / caveat | Evidence | Flag |
|---|---|---|---|---|---|---|---|---|
| 1 | **CC BY 4.0 on all 22 CSVs** | Create `/license/` stating all datasets + charts are CC BY 4.0, requiring attribution *with a link to the specific study URL* | DF (enables all downstream) | 2h | Immediate legal effect; links accrue over months | **US law does not protect raw facts** (Feist v. Rural Telephone, 1991) — a license over pure data may be partly unenforceable. Our *selection, arrangement, methodology and charts* are protectable. Real value is norm-setting: academics and journalists honor CC BY reflexively | https://creativecommons.org/licenses/by/4.0/ | UNVERIFIED-DOC (license text is stable; the Feist analysis is settled law but I am not a lawyer) |
| 2 | **ODbL for the databases specifically** | Consider ODbL instead of/alongside CC BY for the CSV *collections* | DF | +1h | Same | ODbL is share-alike and **deters commercial reuse** — that reduces the reuse we actually want. **My recommendation: CC BY 4.0 only.** Simpler, more permissive, more reused | https://opendatacommons.org/licenses/odbl/ | UNVERIFIED-DOC |
| 3 | **"Cite this dataset" copy-paste block** | Add a citation box to each study page: plain-text, APA, and BibTeX, each containing the full URL | DF, AI | 3h | Weeks | None | CC attribution best practice (TASL) | UNVERIFIED-DOC |
| 4 | **Embed license + credit into chart image metadata** | Write XMP/IPTC `Credit`, `Rights` and `WebStatement` fields into all 31 chart JPGs | UM, ENT | 2h | Months | Most platforms strip metadata on re-upload. Low ceiling, near-zero cost | IPTC Photo Metadata standard | SPECULATIVE (as a link driver) |
| 5 | **`license` + `creditText` in schema.org** | Add `license`, `creditText`, `creator`, `isAccessibleForFree` to Dataset JSON-LD | ENT, AI | 1h | Weeks | None | https://schema.org/Dataset | UNVERIFIED-DOC |
| 6 | **"Republish our charts free" policy page** (ProPublica / The Conversation model) | Publish an explicit permission page: any site may republish our charts free, provided they credit "Daily Life Hacks" with a live link; give the exact HTML snippet | DF | 3h | 3–12 months | Only pays off with traffic. But it converts *passive readers* into linkers with zero outreach — exactly the model requested | ProPublica "Steal Our Stories" | UNVERIFIED-DOC |

### 3.2 Dataset deposit, DOI, and academic-adjacent indexes

| # | Method | First concrete action | Signal | Effort | Time to effect | Risk / caveat | Evidence | Flag |
|---|---|---|---|---|---|---|---|---|
| 7 | **Zenodo deposit + DOI** | Bundle all 22 CSVs + methodology PDF + 31 charts as one versioned deposit; get a DOI; link the source study URLs in the description | DF (likely), ENT, AI | 4h | 1–6 months | **Verify eligibility for a non-academic depositor and whether description links are followed — I could not confirm today.** A DOI makes us formally citable in academic work, which is the real prize | https://zenodo.org/ (attempted fetch inconclusive) | UNVERIFIED-DOC |
| 8 | **Propagation to DataCite / OpenAIRE / re3data** | Nothing extra — this is downstream of a Zenodo DOI | ENT, AI | 0h | Months | Depends entirely on #7 | DataCite Commons | SPECULATIVE |
| 9 | **Google Dataset Search inclusion** | Build `/data/` landing pages with valid `schema.org/Dataset` JSON-LD per dataset, then request indexing | AI, ENT, DF (referral) | 6h | 2–8 weeks | Requires the `/data/` page gap to be fixed first. **This is the discovery surface literally built for our asset class and we are currently absent from it** | https://developers.google.com/search/docs/appearance/structured-data/dataset | UNVERIFIED-DOC |
| 10 | **Kaggle Datasets** | Upload the 6 core CSVs as one Kaggle dataset with a rich description linking the studies | NF, AI, UM | 3h | Weeks | Kaggle links are near-certainly nofollow. Value is *derivative notebooks* citing us, and Kaggle's strong AI-training presence | https://kaggle.com/datasets | UNVERIFIED-DOC |
| 11 | **Hugging Face Datasets** | Publish as a HF dataset with a dataset card + Parquet conversion | NF, AI | 3h | Weeks | Food-price data is off-genre for HF; may sit unnoticed. Cheap though, and HF is heavily crawled by AI systems | https://huggingface.co/datasets | UNVERIFIED-DOC |
| 12 | **GitHub repo as canonical dataset home** | Public repo `dlh-food-value-data` with README (charts inline), `CITATION.cff`, and a per-file provenance table | DF (likely), ENT | 4h | Months | Requires ongoing maintenance to not look abandoned | https://github.com | UNVERIFIED-DOC |
| 13 | **GitHub↔Zenodo release integration** | Connect the repo so each tagged release auto-mints a versioned DOI | ENT | 1h | Immediate after #7/#12 | Depends on both | Zenodo GitHub integration | UNVERIFIED-DOC |
| 14 | **awesome-public-datasets PR** | Open a PR adding our dataset under a food/nutrition heading | DF (GitHub READMEs), UM | 1h | Days–weeks | Self-submission is the norm on awesome-lists, but maintainers are slow and reject off-scope entries. Awesome-lists get scraped widely, multiplying the mention | github.com/awesomedata/awesome-public-datasets | UNVERIFIED-DOC |
| 15 | **data.world** | Publish the dataset with source links | NF, AI | 2h | Weeks | Declining relevance | data.world | UNVERIFIED-DOC |
| 16 | **Figshare / OSF / Harvard Dataverse / Mendeley Data** | Pick **one** as a secondary mirror — do not do all four | ENT | 2h each | Months | **Diminishing returns.** Duplicate deposits across repositories look like spam and split citations. One primary (Zenodo) + one mirror maximum | — | SPECULATIVE |
| 17 | **OpenML** | Submit as a tabular dataset | NF | 2h | Months | ML-task-oriented; our data isn't a modeling benchmark. Poor fit | openml.org | SPECULATIVE |

### 3.3 Reusable / embeddable assets

| # | Method | First concrete action | Signal | Effort | Time to effect | Risk / caveat | Evidence | Flag |
|---|---|---|---|---|---|---|---|---|
| 18 | **Embeddable chart iframes with baked-in credit** | Ship `/embed/{chart-slug}/` routes; give each study page a "Embed this chart" copy button producing an iframe **plus a visible HTML credit link below it** | DF | 8h | 3–12 months | **Critical technical point: iframe `src` does not pass link equity to us.** The value comes *only* from the visible `<a>` credit line in the snippet. Design the snippet so the link is outside the iframe and hard to delete accidentally | Our World in Data embed model | UNVERIFIED-DOC |
| 19 | **Embeddable calculator widget** | Make `/tools/fiber-per-dollar-calculator/` embeddable with the same credit-link pattern | DF | 6h | 3–12 months | Same equity caveat. Higher perceived value than a static chart → more embeds | — | SPECULATIVE |
| 20 | **oEmbed endpoint** | Expose `/oembed?url=...` via a Pages Function | DF | 4h | Months | Only pays off once embeds exist. **Do #18 first; this is a multiplier, not a starter** | oembed.com | UNVERIFIED-DOC |
| 21 | **Wikimedia Commons chart uploads** | Upload a subset of charts under CC BY-SA 4.0, categorized under food economics/nutrition | NF, UM, ENT | 4h | 3–18 months | **Real deletion risk under COM:ADVERT/COM:SCOPE if it reads as promotion.** Upload genuinely educational charts, not branded marketing. Payoff is asymmetric: if a third-party editor uses one in a Wikipedia article, the file page credits us permanently | https://commons.wikimedia.org/wiki/Commons:Licensing | UNVERIFIED-DOC |
| 22 | **Flickr / Openverse CC BY uploads** | Upload charts under CC BY 4.0 | NF, UM | 2h | Months | Low yield; charts rarely surface in image searches | — | SPECULATIVE |
| 23 | **Google Sheets / Excel / Notion template of the dataset** | Publish a "Grocery value tracker" template pre-loaded with our data and a source link | UM, DF | 4h | Months | Template galleries are crowded | — | SPECULATIVE |
| 24 | **Datawrapper / Flourish republished charts** | Recreate 3 flagship charts on a free tier with source attribution | NF, UM | 3h | Months | These platforms' chart pages rarely rank independently | — | SPECULATIVE |

### 3.4 Programmatic / developer surfaces

| # | Method | First concrete action | Signal | Effort | Time to effect | Risk / caveat | Evidence | Flag |
|---|---|---|---|---|---|---|---|---|
| 25 | **Free public JSON API** | Ship `/api/v1/foods?nutrient=fiber` over the CSVs via Pages Functions: no auth, CORS open, documented, versioned | DF, AI, ENT | 8h | 3–12 months | Adoption is the hard part, not the build. Needs docs + an OpenAPI spec to be listable anywhere | — | SPECULATIVE |
| 26 | **MCP server exposing the dataset to AI assistants** | Build a small MCP server (`fiber-per-dollar`, `protein-per-dollar` tools) and list it in public MCP registries | AI, ENT, UM | 8h | Months | **Genuinely underexploited and well-matched to us** — MCP registries are young and under-supplied with real consumer datasets. Note: verified today that **llms.txt is consumed mainly by *agentic/IDE tools*, not AI search crawlers** — which is the same audience an MCP server serves. That is a coherent bet | Verified llms.txt/agentic finding, 2026-07-26 | SPECULATIVE (as a link driver) |
| 27 | **Public APIs GitHub list PR** | Submit the API to `public-apis/public-apis` | DF, UM | 1h | Weeks | Only after #25 exists and is stable. One of the most-starred repos on GitHub → heavily mirrored | github.com/public-apis/public-apis | UNVERIFIED-DOC |
| 28 | **APIs.guru / Postman Public Network** | Submit the OpenAPI spec | DF/NF | 2h | Weeks | Depends on #25 | apis.guru | UNVERIFIED-DOC |
| 29 | **npm + PyPI package** | Publish `dlh-food-value` shipping the CSVs as JSON with a homepage field | NF, ENT | 3h | Months | Registry homepage links are near-certainly nofollow. Value is developer discovery, not equity | npmjs.com, pypi.org | UNVERIFIED-DOC |
| 30 | **Hugging Face Space (Gradio calculator demo)** | Deploy a demo of the fiber-per-dollar calculator with a source link | NF, AI | 4h | Months | Duplicates our own tool; only worth it if HF dataset (#11) lands | huggingface.co/spaces | SPECULATIVE |
| 31 | **Parquet + DuckDB-WASM in-browser querying** | Publish `.parquet` alongside CSVs; add a browser SQL console | ENT, UM | 6h | Months | Delightful to data people, tiny audience. Do late | — | SPECULATIVE |
| 32 | **Frictionless Data Package + DCAT** | Add `datapackage.json` describing all 22 CSVs | ENT, AI | 3h | Months | Fixes the provenance gap (only 4/22 documented) as a side effect — worth it for that alone | frictionlessdata.io | UNVERIFIED-DOC |
| 33 | **Kaggle / Colab / Observable notebooks** | Publish one analysis notebook using our API | NF, UM | 3h | Months | Low ceiling alone | — | SPECULATIVE |

### 3.5 Communities and Q&A

**Standing constraint:** the operator was banned from r/EatCheapAndHealthy in July 2026 mid-viral-post. Everything here must be value-first, slow, and link-light. Assume all Reddit/Quora/Stack Exchange links are **nofollow**; their value is UM + AI supply (Reddit is a heavily weighted source in AI answers and is licensed to Google).

| # | Method | First concrete action | Signal | Effort | Time to effect | Risk / caveat | Evidence | Flag |
|---|---|---|---|---|---|---|---|---|
| 34 | **r/dataisbeautiful [OC] posts** | Post one flagship chart with `[OC]` flair, sourcing USDA + BLS in a top comment, data link only if rules allow | NF, UM, AI | 2h/post | Days | Strict OC/source rules; must read current sidebar. **Highest-upside single community for us** — our charts are exactly the native content type | reddit.com/r/dataisbeautiful | UNVERIFIED-DOC |
| 35 | **r/datasets release post** | Announce the 22-CSV release as a free dataset | NF, UM | 1h | Days | Small but perfectly on-topic sub; links are expected there, not spammy | reddit.com/r/datasets | UNVERIFIED-DOC |
| 36 | **r/coolguides / r/Infographics** | Post the "$1 of fiber buys you X" chart as an image | NF, UM | 1h/post | Days | Image-only norms; often no link permitted. Pure UM play | — | UNVERIFIED-DOC |
| 37 | **Value-first participation in r/frugal, r/povertyfinance, r/budgetfood, r/MealPrepSunday** | Answer 5 questions/week with the actual numbers **inline, no link at all**, for 4+ weeks before ever linking | UM, AI | 3h/week ongoing | 2–6 months | This is the rebuild path after the ban. **Discipline is the whole tactic** — inline numbers, never a URL, until karma and history justify it | Reddit self-promo norms | UNVERIFIED-DOC |
| 38 | **Stack Exchange (Seasoned Advice, Personal Finance & Money)** | Answer existing questions about cheap protein/fiber with sourced numbers | NF, AI | 2h/week | Months | Long content lifespan, high DA, heavily used in AI training. Slow but durable. Self-promotion rules are strict — disclose affiliation | stackexchange.com | UNVERIFIED-DOC |
| 39 | **Quora answers** | Answer "cheapest source of protein" style questions | NF, UM | 2h/week | Months | Quality has collapsed; declining referral value. Low priority | — | SPECULATIVE |
| 40 | **Hacker News Show HN (calculator)** | Post the fiber-per-dollar calculator as Show HN | NF, UM, referral | 1h | Hours (binary) | High variance — most Show HNs sink without trace. Free to try once. Do **not** repeat-post | news.ycombinator.com/showhn.html | UNVERIFIED-DOC |
| 41 | **Bluesky / Mastodon data-viz communities** | Post charts to the data-viz and food-policy communities | UM | 1h/week | Months | Small audiences, but journalists and academics cluster on Bluesky — this is where our data gets *found* by people who cite things | — | SPECULATIVE |
| 42 | **Open Food Facts contribution** | Contribute where our data genuinely fits their schema | NF, ENT | 3h | Months | Their model is product-centric, not price-per-nutrient. Fit is poor — verify before investing | openfoodfacts.org | SPECULATIVE |

### 3.6 Launch / discovery platforms

| # | Method | First concrete action | Signal | Effort | Time to effect | Risk / caveat | Evidence | Flag |
|---|---|---|---|---|---|---|---|---|
| 43 | **Product Hunt launch (7-calculator suite)** | Launch the tools suite as one product, not seven | NF (likely), UM, referral | 5h | Days | PH skews SaaS/AI; consumer calculators underperform. **Verify current link attributes.** One-shot — you cannot relaunch the same thing | producthunt.com | UNVERIFIED-DOC |
| 44 | **r/InternetIsBeautiful / r/SideProject** | Post the calculator | NF, UM | 1h | Days | r/InternetIsBeautiful has strict rules and moderates hard | — | UNVERIFIED-DOC |
| 45 | **AlternativeTo listing** | List the calculators as free alternatives to paid nutrition tools | NF/DF, UM | 2h | Weeks | Needs an actual comparable product to be an "alternative to" | alternativeto.net | UNVERIFIED-DOC |
| 46 | **Uneed / Fazier / MicroLaunch / Peerlist Launchpad** | Submit to 2–3 live ones | NF, UM | 3h total | Weeks | Churn is high; several will be dead. Marginal individually — batch them into one sitting or skip | — | UNVERIFIED-DOC |
| 47 | **Niche awesome-lists (awesome-nutrition, awesome-food-data)** | PR our dataset/API where topically legitimate | DF, UM | 2h | Weeks | Don't force-fit into off-topic lists — maintainers reject and it wastes goodwill | — | UNVERIFIED-DOC |

### 3.7 Syndication and republication (self-serve only)

| # | Method | First concrete action | Signal | Effort | Time to effect | Risk / caveat | Evidence | Flag |
|---|---|---|---|---|---|---|---|---|
| 48 | **Medium import with rel=canonical** | Import 3 flagship data studies via Medium's Import Story tool so canonical points home | NF, UM, AI | 2h | Weeks | Canonical protects against duplicate-content harm. Medium outbound links are near-certainly nofollow — this is a **mention and AI-supply play**, not a link play. Verify the import tool still exists | medium.com | UNVERIFIED-DOC |
| 49 | **Substack cross-post** | Republish study write-ups with canonical/source link | NF, UM | 2h/post | Months | Builds an owned audience as a side effect — that has independent value | — | UNVERIFIED-DOC |
| 50 | **LinkedIn posts (not articles)** | Post charts natively with the finding in the caption | UM | 1h/week | Months | **Verified today: LinkedIn is reported as a top-2 most-cited source in AI search (325k-prompt analysis).** Pen name is a friction point — LinkedIn expects real identity. Native image posts outperform article links | ALM Corp analysis of 325k prompts, 2026 | EVIDENCED (the citation-rank claim); SPECULATIVE (that it works for *us* under a pen name) |
| 51 | **YouTube chart-explainer shorts (Remotion pipeline)** | Auto-generate 60-second "cheapest protein per dollar" explainers from existing charts | NF, UM, AI | 4h setup, 1h/video | Months | Description links nofollow. Real value: YouTube surfaces in Google SERPs and AI answers, and **we already own the pipeline** — marginal cost is near zero | — | SPECULATIVE |
| 52 | **Internet Archive upload** | Upload the dataset + charts + methodology as an archive.org item | NF, ENT | 2h | Months | Permanence and citability; archive.org items are durable and crawled | archive.org | UNVERIFIED-DOC |
| 53 | **Data report PDF on Issuu / SlideShare / Scribd** | Publish an annual "Food Value Report" PDF | NF, UM | 4h | Months | Declining platforms. The PDF itself is reusable elsewhere, which is the real justification | — | SPECULATIVE |
| 54 | **Flipboard magazine** | Curate a "Grocery Economics" magazine including our studies | NF, referral | 2h | Months | Traffic has declined sharply. Low priority | — | SPECULATIVE |
| 55 | **Google News Publisher Center / MSN Start** | Check eligibility and submit | Referral, ENT | 2h | Months | Eligibility for small non-news publishers is doubtful. Verify before investing | — | UNVERIFIED-DOC |

### 3.8 Inbound journalist surfaces (allowed — reporters come to us)

**Blunt assessment of the pen-name problem:** journalists verify sources. A non-credentialed operator under a pen name responding to *health* queries is a liability — YMYL scrutiny is high and a fake name discovered post-publication is a correction. **But there is a clean subset that works:** queries about *grocery economics, food prices, and cost data*, where the citable entity is **the dataset**, not the person. "According to an analysis by Daily Life Hacks" requires no personal credential. Restrict all journalist activity to that framing.

| # | Method | First concrete action | Signal | Effort | Time to effect | Risk / caveat | Evidence | Flag |
|---|---|---|---|---|---|---|---|---|
| 56 | **Data Is Plural submission** | Submit the dataset to Jeremy Singer-Vine's newsletter (inbound submission, not a pitch) | DF, UM, AI | 1h | Weeks–months | **Could not confirm the submission mechanism today** — the site exposes a Contact route but no visible form. If the only route is emailing the editor, note that this is a *submission to an open call*, not cold outreach — but confirm the owner is comfortable with that distinction before acting. Read by thousands of data journalists; single highest-leverage inbound item if the channel exists | https://www.data-is-plural.com/ (fetched 2026-07-26, mechanism not stated) | UNVERIFIED-DOC |
| 57 | **"Data for journalists" press page** | Publish `/press/` : what the data covers, license, preferred citation, chart download links, methodology link | DF (passive), ENT | 3h | Months | Pure passive capture. Cheap, permanent, removes friction for anyone already considering citing us | — | SPECULATIVE |
| 58 | **Featured.com / Qwoted / SourceBottle** | Register and monitor grocery-price and food-budget queries only | DF (when it lands) | 2h setup + 2h/week | Months | **Ranks poorly for us.** Heavy time cost, mostly health/expert queries we must decline, pen-name exposure. Honest verdict: the weakest inbound channel given our constraints | — | UNVERIFIED-DOC |
| 59 | **#JournoRequest monitoring on Bluesky/X** | Set a saved search; respond only to food-price/data requests | DF | 1h/week | Months | Same credential caveat; zero setup cost | — | SPECULATIVE |

### 3.9 AI visibility and unlinked mentions

| # | Method | First concrete action | Signal | Effort | Time to effect | Risk / caveat | Evidence | Flag |
|---|---|---|---|---|---|---|---|---|
| 60 | **Coin and trademark-in-practice a named index** | Rename the flagship metric the **"Fiber-per-Dollar Index (FPDI)"**; use the exact string everywhere | UM, AI, ENT | 3h | 3–12 months | A named entity is quotable and searchable in a way a generic phrase is not, and it makes unlinked mentions *attributable to us*. Directly exploits the Ahrefs mention finding | Ahrefs 2025-05-26 (mention correlation) | SPECULATIVE (the naming tactic); EVIDENCED (the underlying mention correlation) |
| 61 | **Quarterly dated re-release** | Commit to "FPDI Q4 2026" etc. — the methodology page already promises a quarterly re-audit | AI, UM, DF | 6h/quarter | 6–18 months | **Recurring dated indexes become the thing people cite annually.** We already promised the cadence publicly; not delivering is a credibility risk | Our `/methodology/` + `dataset-provenance.json` | SPECULATIVE |
| 62 | **Statistics hub page** | Build `/data/` as a citable statistics hub: every headline number, dated, sourced, individually anchor-linked | AI, DF | 6h | 2–6 months | Closes gap #2. Verified today that LLM-cited pages favor structured headings/bullets/Q&A — build to that shape | Semrush/Profound 2026, checked 2026-07-26 | EVIDENCED (format preference); SPECULATIVE (yield for us) |
| 63 | **Structured Q&A blocks on every study page** | Add explicit question-headed sections ("What is the cheapest source of fiber per dollar?") with a direct numeric answer | AI | 4h | Weeks | Verified format preference | Profound 2026, checked 2026-07-26 | EVIDENCED |
| 64 | **Keep llms.txt current — DO NOT expand it** | Update it when the quarterly index refreshes; nothing more | AI (marginal) | 0.5h/quarter | — | **Verified today: of 500M+ AI bot visits monitored over 90 days, only ~408 requested llms.txt; removing llms.txt from a citation-prediction model *improved* accuracy. It is not in any documented retrieval pipeline.** Ours is already good. **Spend zero further time on it.** Its real consumers are agentic/IDE tools | Presenc AI / aeo.press state-of-llms.txt 2026, checked 2026-07-26 | EVIDENCED |
| 65 | **AI-crawler allow policy** | **Already done — no action.** robots.txt permits GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bytespider | AI | 0h | — | Verified in repo today. Common Crawl inclusion is default-on, so we are already in the training corpus | Repo inspection + commoncrawl.org/get-started, 2026-07-26 | EVIDENCED |
| 66 | **Cheap AI-citation monitoring** | Subscribe to one low-cost tracker and monitor ~15 prompts ("cheapest protein per dollar", etc.) | Measurement | 2h setup, $20–29/mo | Immediate | Verified pricing: **Rankscale ~$20/mo, Otterly Lite $29/mo**, Peec €89/mo, Profound $99+/mo. Buy the cheapest — this is measurement, not growth. **Without it, everything else here is unfalsifiable** | Indexly/Acromatico pricing comparisons, checked 2026-07-26 | EVIDENCED (pricing) |
| 67 | **Google Alerts for the brand + index name** | Free alerts on "Daily Life Hacks" + "fiber per dollar" + "Fiber-per-Dollar Index" | Measurement (UM) | 0.5h | Immediate | Noisy for a generic brand name; the coined index name (#60) is what makes this actually work | — | SPECULATIVE |
| 68 | **Organization `sameAs` entity consistency** | Add `sameAs` linking every owned profile (GitHub, Zenodo, Kaggle, HF, YouTube, Pinterest) to Organization schema | ENT | 2h | Months | Only meaningful once several of those profiles exist — do it *after* the deposits | schema.org/Organization | UNVERIFIED-DOC |

### 3.10 Encyclopedic and structured-knowledge surfaces

| # | Method | First concrete action | Signal | Effort | Time to effect | Risk / caveat | Evidence | Flag |
|---|---|---|---|---|---|---|---|---|
| 69 | **Wikidata item** | Create an item for the *dataset* with P856 (official website), license, publisher | ENT, AI | 2h | Months | Notability rules are looser than Wikipedia's but not absent; a self-created item for a non-notable commercial dataset may be deleted. Wikidata feeds knowledge-graph and AI surfaces, so the upside is real | wikidata.org | UNVERIFIED-DOC |
| 70 | **Wikimedia Commons** | (See #21) | NF, UM | — | — | — | — | UNVERIFIED-DOC |
| 71 | **Wikipedia talk-page edit request** | **Only** via `{{Edit COI}}` on a talk page, disclosing affiliation, asking a *third-party editor* to evaluate | NF | 2h | Months, low odds | **Highest policy risk in this report.** A self-published blog is very unlikely to pass WP:RS; a pen name compounds it; repeated attempts risk WP:SPAMBLACKLIST which would be catastrophic and hard to reverse. **Wikipedia external links are nofollow anyway.** The legitimate path is to first be cited *by* a reliable source, then let a third party add us | WP:COI, WP:RS | UNVERIFIED-DOC |

### 3.11 Niche directories, institutional listings, and awards

| # | Method | First concrete action | Signal | Effort | Time to effect | Risk / caveat | Evidence | Flag |
|---|---|---|---|---|---|---|---|---|
| 72 | **University / public library LibGuides "suggest a resource"** | Find LibGuides on nutrition, food security, and consumer economics that expose a suggestion form; submit the free calculator + dataset | **DF from .edu**, ENT | 4h | 1–6 months | Genuinely passive and self-serve where a form exists. **Highest-authority realistic link target in this whole report.** Librarians favor free, methodologically documented, non-commercial-feeling resources — our methodology page is the qualifying asset | — | SPECULATIVE (mechanism plausible, not verified) |
| 73 | **Cooperative Extension / SNAP-Ed / food-bank resource pages** | Identify pages that list free budgeting tools and use any public submission form | **DF from .edu/.org/.gov**, ENT | 4h | Months | Many have no self-submission path — and where they don't, **the only route is outreach, which is out of bounds.** Pursue only the form-based ones | — | SPECULATIVE |
| 74 | **Information is Beautiful Awards** | Submit a flagship chart/dataset to the open call | DF, UM | 3h | Months | **Entry fees apply — confirm current cost before committing.** Our 31 charts + original dataset are legitimately eligible, which is rare for a site our size | informationisbeautifulawards.com | UNVERIFIED-DOC |
| 75 | **Sigma Awards (data journalism)** | Check eligibility for independent/non-newsroom entrants | DF, UM | 2h | Months | Often free to enter but newsroom-oriented; eligibility uncertain | sigmaawards.org | UNVERIFIED-DOC |
| 76 | **Plutus Awards (personal finance) nomination** | Self- or community-nominate in a budgeting category | NF/DF, UM | 1h | Months | Free nomination is the appeal; winning is unlikely without an audience | — | UNVERIFIED-DOC |
| 77 | **Food blog galleries (Foodgawker, TasteSpotting, Punchfork)** | — | NF | — | — | **Likely dead or irrelevant in 2026, and photo-driven — we are a data site, not a food-photography site.** See section D | — | UNVERIFIED-DOC |

---

## 4. Ranking

### A — Do this week (foundation; unlocks everything else)

These are cheap, fully under our control, and every one of them is a prerequisite for something in B or C. Total ≈ **20 hours**.

| Method | Why it is first |
|---|---|
| **#1 CC BY 4.0 `/license/` page** | Nothing else creates an attribution obligation. 2 hours. Do it before anyone reuses the data uncredited. |
| **#62 + #9 `/data/` hub with schema.org/Dataset** | Closes the biggest structural gap. Makes us eligible for Google Dataset Search — the discovery surface purpose-built for our asset class, where we are currently absent. |
| **#3 "Cite this dataset" blocks** | Converts intent-to-cite into a correct, linked citation. |
| **#63 Structured Q&A blocks on study pages** | Evidence-backed AI-citation format. Fast. |
| **#66 One cheap AI-visibility tracker (~$20–29/mo)** | Baseline measurement *before* the work, or none of this is evaluable. |
| **#60 Name the index (FPDI)** | Costs almost nothing and makes every future mention attributable and trackable. |
| **#32 `datapackage.json` for all 22 CSVs** | Fixes the 4-of-22 provenance gap that undermines our credibility claim. |

### B — Do this month

| Method | Note |
|---|---|
| **#7 Zenodo deposit + DOI** | Verify eligibility first. A DOI is the strongest single credibility artifact available to us. |
| **#12 + #13 GitHub dataset repo + CITATION.cff** | Developer-facing canonical home; feeds #14, #27. |
| **#57 `/press/` journalist page** | Passive capture, permanent. |
| **#18 Embeddable charts with visible credit link** | The main *automatic* link generator. Remember: equity comes from the visible `<a>`, not the iframe. |
| **#34 + #35 r/dataisbeautiful [OC] + r/datasets** | Our charts are native content there. Read current sidebars first. |
| **#37 Value-first Reddit rebuild** | Inline numbers, zero links, 4+ weeks. Non-negotiable discipline after the ban. |
| **#10 Kaggle dataset** | Cheap AI-training and derivative-work surface. |
| **#56 Data Is Plural** | Confirm the submission mechanism and the owner's comfort with it first. |
| **#72 LibGuides suggestion forms** | Start the slow .edu track early — long lead time. |

### C — Do this quarter

| Method | Note |
|---|---|
| **#61 Quarterly FPDI re-release** | We already publicly promised a quarterly re-audit. Deliver it. |
| **#25 + #27 + #28 Public JSON API, then list it** | Build first, list second. |
| **#26 MCP server + registry listings** | Underexploited, well-matched, uncertain payoff. Time-boxed bet. |
| **#19 Embeddable calculator** | After chart embeds prove the pattern. |
| **#6 "Republish our charts free" policy** | Needs traffic to matter. |
| **#21 Wikimedia Commons uploads** | Educational framing only; accept deletion risk. |
| **#69 Wikidata item** | Modest, real entity value. |
| **#51 YouTube chart explainers** | Near-zero marginal cost — we own the pipeline. |
| **#43 Product Hunt** | One shot. Verify link attributes first. |
| **#74 Information is Beautiful Awards** | Only if the entry fee is acceptable. |
| **#38 Stack Exchange** | Slow, durable, high-DA. |
| **#48 Medium canonical imports** | Mention/AI play, not a link play. |
| **#52 Internet Archive** | Cheap permanence. |
| **#68 sameAs consistency** | After the profiles exist. |

### D — Not worth it, and why

Ruthless, as requested.

| Method | Why not |
|---|---|
| **#71 Wikipedia article edits/citations** | Worst risk-to-reward in the report. Self-published blog fails WP:RS; pen name compounds it; **external links are nofollow anyway**, so even total success yields no link equity — and failure risks domain blacklisting, which is severe and hard to undo. The only legitimate path is to be cited by a reliable source first. **Do not touch Wikipedia article space.** |
| **#16 Depositing to Figshare + OSF + Dataverse + Mendeley** | Duplicate deposits across four repositories split citations, look spammy, and add nothing once a Zenodo DOI exists. One primary, at most one mirror. |
| **#77 Foodgawker / TasteSpotting / food photo galleries** | Photo-driven curation. We are a data site with matplotlib charts, not a food-photography site. Structural mismatch, plus most are dead or irrelevant. |
| **Feedspot "Top 100 blogs" lists** | Widely reported as pay-to-be-listed. Paying for a directory placement is a paid link. Skip. |
| **Bulk startup-directory blasts ("submit to 1000 directories")** | Link-farm junk. At best ignored, at worst a spam-signal liability. The genuinely useful directories are already named individually above. |
| **Scholarship link building for .edu links** | A well-known link scheme. Google treats manufactured .edu link schemes as manipulative. Real risk, no upside. **Do not do this.** |
| **#58 Featured.com / Qwoted / paid HARO successors** | Highest ongoing time cost of any inbound channel, and our two hardest constraints — pen name and no health credentials — bite hardest exactly here. Most queries are ones we must decline. If the owner wants one inbound channel, it should be Data Is Plural (#56), not this. |
| **#39 Quora** | Quality and referral value have collapsed; nofollow; ongoing time cost. |
| **#54 Flipboard, #53 SlideShare/Issuu/Scribd** | Declining platforms, negligible current yield. The data-report PDF is worth making for *other* reasons; the hosting platforms are not the point. |
| **#17 OpenML** | Our data is not a modeling benchmark. Wrong audience entirely. |
| **#2 ODbL** | Share-alike deters the commercial reuse we actually want. CC BY 4.0 instead. |
| **Expanding llms.txt further** | **Evidence-backed no.** ~408 of 500M+ AI bot visits requested it; removing it from a citation model *improved* prediction. Ours is already good — freeze it and stop. |
| **Any second llms.txt-style "AI optimization" file** | Same reasoning. Cargo cult. |
| **A secondary blog network / "PBN-lite" on Blogger/Tumblr/WordPress.com** | Textbook link scheme, plus duplicate content. No. |
| **#42 Open Food Facts** | Their schema is product-centric; our data is price-per-nutrient. Poor fit; verify before spending an hour on it. |

---

## 5. Honest summary of expected returns

Do not expect a link surge. Realistically:

- **A-tier work produces almost no links directly.** It produces *eligibility* — for Dataset Search, for citation, for legally-obligated attribution. It is infrastructure, and it is the correct first move precisely because everything else compounds off it.
- **The two highest-authority realistic link targets are .edu LibGuides (#72) and academic citation of a Zenodo DOI (#7).** Both are slow (months), both are genuinely passive, neither requires outreach.
- **The largest volume signal will be unlinked mentions**, from Reddit, LinkedIn, and a named index — which the verified Ahrefs data suggests matters ~3x more than backlinks for AI visibility, with the DR>40 sampling caveat noted above.
- **Buy the tracker (#66) first.** At $20–29/month it is the cheapest line item here and the only one that tells us whether any of the rest worked.

**Biggest open risks:** (1) most of the directory, deposit, and award sections are UNVERIFIED-DOC and need a re-check before action; (2) the pen name is a hard ceiling on every people-facing channel and should be routed around by making *the dataset* the citable entity, not David Miller.
