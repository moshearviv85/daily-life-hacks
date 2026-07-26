# Alternative Traffic Surfaces — daily-life-hacks.com

Date: 2026-07-26
Scope: research only. No content written, nothing posted, nothing committed.

---

## 0. Executive answer

The single most important number in this report:

> **Food is the worst-performing vertical in Google Discover.** Raptive, an ad
> network handling roughly **1 billion Discover clicks per year** across its
> creator network, reports the share of Google traffic that arrives via Discover
> by vertical: **News 76%, tech/gaming/sports/travel ~50%, FOOD 2%.**
> — https://raptive.com/blog/why-you-should-be-optimizing-for-google-discover/ (2026-02-11)

Discover was framed in the brief as "the big one for food content." The evidence
says the opposite. Discover is the big one for *news*; for food it is a rounding
error even for established, monetized sites. We should do the Discover hygiene
because it is nearly free and we already satisfy most of it, but we should not
build a strategy on it.

The three surfaces that can actually move us toward five-figure monthly sessions,
ranked, are in section 3.

---

## 1. Comparison table

Traffic figures are **monthly sessions to daily-life-hacks.com**, at a 12-month
horizon, from our current base (132 indexed URLs, ~135 GSC impressions / 1 click
per 28 days, 1,466 Pinterest impressions / 30 days, ~16 email subscribers).

| # | Surface | Realistic monthly ceiling for us (12mo) | Time to first results | Effort | Prerequisites MET | Prerequisites NOT met |
|---|---|---|---|---|---|---|
| 1 | **Pinterest at scale** | **2,000 – 8,000** (at 400k–800k monthly impressions × 0.5–1.5% outbound CTR) | 6–10 weeks to impression growth; 4–6 months to meaningful clicks | High, but mechanical and already automated | Rich Pins verified (`p:domain_verify` live), pin pipeline + auto-poster built, 293 hero images, 31 original charts, 180 articles with pins | Cadence too low (2/day vs 3–5/day 2026 norm); board architecture unaudited; no video/Idea pins; no seasonal calendar |
| 2 | **AI answer engines (AEO)** | **300 – 2,000** direct referrals, plus a branded-search halo | Already happening (41 Bing Copilot citations/day) | Medium; mostly content-shape work | robots.txt allows GPTBot/ClaudeBot/PerplexityBot/Google-Extended; Article/Recipe/FAQ/Breadcrumb/WebPage schema; 7 calculators; original CSVs; `/methodology/` | Dataset schema on only **6 of 16** data studies; no statistics hub page; no branded-query capture; no AI-visibility measurement; llms.txt is decorative (see 4.5) |
| 3 | **Google Discover** | **0 – 300 typical; 300–2,000 if it works; occasional 1,000–20,000 over 3–5 days then gone** | 12h *if already in Discover*; unknown/possibly never from zero | Very low (we are ~90% compliant) | `max-image-preview:large` live; `og:image` on every page; **all 234 heroes ≥1200px**; Article schema; HTTPS; author entity | WebP variants capped at **exactly 1200w**; publishing cadence bursty; `dateModified` on only 143/210 articles; no thin-author-page E-E-A-T depth |
| 4 | **Google Images / visual search** | **50 – 600** | Weeks; tracks normal indexing | Very low | Real `<img>` elements, descriptive `{slug}-main.jpg` filenames, descriptive alt on all 31 charts, WebP + JPEG fallback | **No image sitemap**; charts have no `opt/` variants and no srcset; no 4:3 / 1:1 variants in schema `image` array |
| 5 | **Newsletter / community** | **200 – 1,500** (at 1,500–3,000 subscribers) | 3–6 months to a list that matters | Medium, compounding | Kit integration live, `/api/subscribe` proxy, lead magnet shipped, popup + inline forms | List is ~16; **no RSS feed** so no RSS-to-email automation; Reddit banned from r/EatCheapAndHealthy; no recommendation-network presence |
| 6 | **YouTube Shorts / TikTok** | **50 – 400 site clicks** (audience/brand value is real; *click* value is not) | 3–6 months to algorithmic traction | High (production-heavy) | Remotion pipeline built, ElevenLabs voice, 31 chart assets, budget-food is a live viral trend | No channel exists; no upload cadence; Shorts has no in-player link; TikTok bio-link only |
| 7 | **Flipboard / MSN / Apple News / aggregators** | **0 – 200** | Blocked today | Low effort, low control | Original content, clean canonicals | **No RSS feed at all** — hard blocker; MSN Partner Hub is invite-code only; Apple News not accepting unsolicited applications; Flipboard pivoted to Surf/fediverse |

### The one prerequisite that blocks four rows at once

**We have no RSS feed.** Verified live on 2026-07-26:

```
/rss.xml   -> 404
/feed.xml  -> 404
/index.xml -> 404
/atom.xml  -> 404
/feed      -> 410 Gone      <-- we are actively telling aggregators it is permanently dead
```

`@astrojs/rss` is not in `package.json`. This is roughly two hours of work and it
gates: Flipboard magazines, any future MSN/Apple News application, Feedly,
Kit RSS-to-email campaigns, IFTTT/Zapier auto-posting, and Pinterest bulk
auto-publish. It does **not** help Discover (see 4.1.6). Do it anyway — it is the
cheapest unlock on the board.

The `/feed -> 410` is a live liability and should be the first thing changed.

---

## 2. What "tens of thousands of visits" honestly requires

Stacking the realistic mid-points above gives roughly **3,000–12,000 sessions/month
at 12 months**, with Pinterest supplying more than half. There is no single
surface in this report that gets us to 10k alone from where we stand.

Context for why the classic-organic pessimism in the brief is correct:
small publishers (<10,000 daily page views) saw **60% declines in search referral
traffic over two years**, versus 47% for medium and 22% for large publishers
(Chartbeat data, reported by Axios) —
https://www.axios.com/2026/03/17/chartbeat-search-traffic-ai-chatbots (2026-03-17).

And 68.01% of Google searches ended without any click in early 2026, up from
60.45% in 2024 (Similarweb clickstream panel, Rand Fishkin) —
https://sparktoro.com/blog/in-2026-less-than-one-third-of-google-searches-still-send-a-click/ (2026-06-09).

---

## 3. Ranked recommendation — attack these three first

### #1 — Pinterest at scale

**Why first.** It is the only surface in this report with a demonstrated
five-figure-per-month ceiling for a food site with no backlinks, and it is the
only one where we already own the full production and posting pipeline. The math
is mechanical rather than speculative.

The arithmetic: a healthy organic outbound click rate on Pinterest in 2026 is
**0.2%–1.5%**, with **recipe and home-decor pins over-indexing** at the top of
that band, versus a platform-wide average of 0.2–0.5%
(https://www.webfx.com/blog/social-media/pinterest-marketing-benchmarks/, 2026).

- Today: 1,466 impressions/30d → **3–20 clicks/month**. Effectively zero.
- 100k impressions/month → 500–1,500 sessions.
- 500k impressions/month → 2,500–7,500 sessions.

Pinterest referral is **growing** for food, not declining: in 2026 Pinterest's
referral advantage over Facebook widened to ~41%, with Pinterest sessions
averaging 4m12s on-site versus Facebook's 2m38s
(https://www.pravinzende.co.in/2026/04/pinterest-traffic-strategy-usa-bloggers-2026-guide.html, 2026-04).
Caveat: Pinch of Yum's own channel mix shows Pinterest falling from 6.33% to 3.99%
of traffic between Mar 2024 and Mar 2026
(https://www.foodbloggerpro.com/blog/pinch-of-yums-traffic-trends-2024-vs-2026/, 2026-04-30) —
so Pinterest is a real channel but not a growing *share* for an already-large site.
For us, going from 1,466 impressions is pure headroom regardless.

**What separates 1k/month accounts from 100k+ accounts in 2026:**

- **Cadence.** The old "20+ pins/day" strategy is dead; **3–5 high-quality,
  contextually original pins per day** now outperforms mass production
  (https://postiz.com/blog/pinterest-strategy-2026, 2026). We post 2/day.
- **Fresh over repin.** The 2026 algorithm prioritizes unique imagery over repins
  (https://www.outfy.com/blog/pinterest-algorithm/, 2026).
- **Spacing.** Space pin variants for the same URL roughly a week apart across
  boards, so Pinterest can test each against real search queries, rather than
  dumping all four variants at once (https://postiz.com/blog/pinterest-strategy-2026).
- **Saves, not impressions.** Saves are the highest-value signal; high saves with
  low outbound clicks means the description and CTA are wrong, not the pin.
- **Pinterest is a visual search engine, not a social network** in 2026 — keyword
  research on titles, descriptions, alt text and board names is the lever
  (https://gtrsocials.com/blog/how-to-rank-pins-what-gets-you-seen-in-2026-and-how-the-pinterest-algorithm-works, 2026).
- **Video/Idea pins**: video pins get ~2.5× the engagement of static and Idea pins
  ~9× the saves of standard pins (https://www.outfy.com/blog/pinterest-algorithm/) —
  but standard outbound-link pins remain the click driver. Use Idea pins for reach,
  standard pins for traffic.

**Next actions.**
1. Raise cadence from 2/day to 4/day and hold it for 90 days. The queue already
   holds 160 PENDING pins; the constraint is scheduling, not assets.
2. Enforce ≥7-day spacing between variants of the same destination URL.
3. Audit board architecture and board-name keywords (fewer, more intentional boards).
4. Build a seasonal calendar and queue seasonal food content **45–60 days ahead**.
5. Turn the 31 existing charts into pin creatives — "protein per dollar, ranked"
   is natively pinnable and nobody else has our data.
6. Track impression → outbound-click rate weekly. If it sits below 0.2%, the
   problem is creative/description, not volume.

**Time to first results:** 6–10 weeks for impression growth, 4–6 months for
meaningful click volume.

---

### #2 — AI answer engines

**Why second.** This is the only surface where we are *already winning* — 41 Bing
Copilot citations/day against a Bing organic baseline of 155 impressions / 1 click
per 28 days. Our asset profile (original priced-food datasets, public CSVs,
`/methodology/`, seven calculators) is precisely what the citation studies say
gets cited. And the traffic that does arrive is unusually valuable.

**Conversion economics.** ChatGPT referrals convert at **14.2%–15.9%**, Perplexity
at 10.5%, Gemini at 3.0%, against a Google organic baseline of 1.76%–2.8% —
roughly **4–5× organic**
(https://pixis.ai/blog/why-ai-search-traffic-converts-at-4-5x-what-the-data-actually-shows/, 2026;
https://quickseo.ai/blog/chatgpt-vs-perplexity-for-ai-visibility-in-2026-citations-traffic-and-conversion-compared, 2026).

**Volume reality check.** AI referral traffic is still only around **1% of the
web** (https://www.tryanalyze.ai/blog/ai-traffic-research, 2026). Adobe measured
1.13 billion AI referral visits in June 2025, +357% YoY — real growth off a small
base. **ChatGPT is ~87.4% of all AI referral traffic**; Perplexity ~2.8%
(Conductor 2026 benchmark, via https://www.similarweb.com/blog/marketing/geo/gen-ai-stats/).
Our 41/day is in **Bing Copilot**, which is not where the referral volume is —
so the near-term job is porting that citation position into ChatGPT and Google
AI Mode.

**What actually correlates with being the cited source:**

- **Ranking is not the path.** Only **17%** of AI Overview citations come from
  pages that also rank in Google's organic top 10 (BrightEdge Generative Parser);
  a Moz analysis of 40,000 AI Mode queries found ~**12%** overlap
  (https://seranking.com/blog/ai-statistics/, 2026). This is genuinely good news
  for a zero-backlink site: AI citation is a *separate* competition from ranking.
- **Structured data is the strongest single predictor found.** AirOps analysed
  15,000+ URLs: **61% of pages cited by ChatGPT carried structured data markup,
  versus only 25% of Google's top organic results**
  (https://seranking.com/blog/ai-statistics/, 2026).
- **Reddit is the most-cited domain across ChatGPT, Gemini, Perplexity and AI
  Overviews** — Peec AI analysed 30 million citations, published March 2026;
  Reddit's citation share grew ≥73% Oct 2025 → Jan 2026 across all tracked
  categories (https://saasintelligence.substack.com/p/reddits-ai-citation-share-just-grew).
  This is the strongest available argument for the Reddit karma-building channel,
  independent of its direct referral traffic.
- Citation density differs wildly by engine: BrightEdge measured an average of
  8.79 citations per Perplexity response; Superlines measured a 15.43% citation
  rate for Perplexity versus 2.78% for ChatGPT (same SE Ranking roundup, 2026).

**llms.txt does nothing — stop counting it as an asset.** We serve one and link
it from `<head>`. The evidence against it is now decisive:

- Ahrefs analysed **137,000 sites**: **97% of llms.txt files received zero traffic**
  in May 2026.
- SE Ranking analysed ~**300,000 domains** and found **no statistically significant
  correlation** between having llms.txt and AI citation frequency; removing it from
  their predictive model **improved** accuracy — "the file was noise, not signal."
- ClaudeBot, Google-Extended and PerplexityBot effectively do not fetch it; GPTBot
  rarely does.
- Google's John Mueller: "To me, it's comparable to the keywords meta tag — this is
  what a site-owner claims their site is about." Google confirmed at Search Central
  Live that it does not support llms.txt and has no plans to.
  (https://ariashaw.com/does-llms-txt-actually-work, 2026;
  https://baselinelabs.ai/blog/llms-txt-google-search, 2026)

Keep the file — it costs nothing and Anthropic/OpenAI do use it in *agentic* SDK
contexts — but it is not a citation lever.

**Next actions.**
1. **Extend Dataset schema from 6 to all 16 data studies.** Ten of our
   `*-per-dollar-*` articles currently have no `Dataset` node and no public CSV.
   Given the AirOps 61%-vs-25% structured-data finding, this is the highest-leverage
   AEO change available and it is pure engineering, no writing.
2. Publish CSVs for those ten studies to `/data/` so each Dataset has a real
   `DataDownload` distribution.
3. Build a **statistics hub page** — every number we own, one per line, each with
   source and date. Statistics pages are disproportionately cited.
4. Add a short direct-answer paragraph at the top of each study (we already have
   `quickAnswer`; ensure all studies use it).
5. Instrument measurement: segment `chatgpt.com`, `perplexity.ai`, `copilot.microsoft.com`
   referrers in GA4 and in the existing `/api/event` pipeline. We currently cannot
   tell whether 41 citations/day produce any clicks at all. **Answer that before
   investing further.**
6. Continue Reddit karma-building — its value is now as much about *being in the
   AI citation corpus* as about direct referrals.

**Time to first results:** already in progress; measurable within 30 days of
instrumentation.

---

### #3 — Google Discover (hygiene and cadence only — not a campaign)

**Why third, and why with a warning label.** The prerequisite work is nearly free
because we already satisfy most of it, and the same assets serve Images, Pinterest
and rich results. The upside is asymmetric — an occasional 3–5 day spike of
1,000–20,000 clicks. But the expected value for a food site is low and the
channel is documented as extremely unstable. **Plan for zero, accept a lottery ticket.**

**Google's official position** — https://developers.google.com/search/docs/appearance/google-discover:

> "Content is automatically eligible to appear in Discover if it is indexed by
> Google and meets Discover's content policies." — **"No special tags or
> structured data are required."**

Image guidance, verbatim: **"At least 1200 px wide"**, **"High resolution of more
than 300,000 total pixels"**, **"16x9 aspect ratio"**, **"Enabled by the
`max-image-preview:large` setting, or by using AMP"**, and use **"schema.org markup
or the `og:image` meta tag"** while avoiding **"generic images (for example, your
site logo)."**

Google's own reliability disclaimer, verbatim: **"Traffic from Discover is less
predictable or dependable when compared to keyword-driven search visits."**

**Google News registration is NOT required.** Google News also moved to
automatic, algorithmically-generated publication pages — manual submission was
removed, and "Using Publisher Center is entirely optional, and does not affect
your site's eligibility for Google News"
(https://support.google.com/news/publisher-center/answer/15898024, 2025-2026).
There is nothing to apply to.

**What actually drives inclusion, beyond the doc.** The most detailed technical
account is Metehan Yeşilyurt's reverse-engineering of the Discover client SDK,
covered by Search Engine Land (Danny Goodwin, 2026-02-25):
https://searchengineland.com/google-discover-qualifies-ranks-filters-content-research-470190

Evidence class: unofficial reverse engineering, not Google-confirmed. Key claims:

- **Nine-stage pipeline; qualification runs before ranking.**
- **"No image means no card"** — a missing `og:image`/`og:title` is a hard
  disqualifier, not a demotion.
- The meta tags **`notranslate`** and **`nopagereadaloud`** can block a page from
  Discover entirely.
- Ranking is a server-side predicted-CTR model using title quality, image
  size/quality, recency, historical URL engagement, and **whether the image
  actually loads** — meaning a lazy-loaded hero can directly cost Discover placement.
- Freshness decay: 1–7 days strongest, 8–14 moderate, 15–30 limited, 30+ declining.
  A separate evergreen classification exists, but "newer material receives default
  preference."

A second, larger study — "Inside Google Discover: 20 pipelines, 42 million cards"
(Search Engine Land, 2026-04-09,
https://searchengineland.com/inside-google-discover-pipelines-cards-473984) — found
the feed is ~20 named pipelines; elite outlets appear across 8–10 pipelines
simultaneously while small publishers are siloed into one; video pipelines are
72–100% YouTube.

**The structural fact that caps our upside.** Marfeel research (published
2025-12-18, reported by
https://ppc.land/google-discover-feeds-users-ai-and-youtube-while-publishers-watch-traffic-vanish/):

- **51% of the US Discover feed is now AI Summaries.**
- **77% of US AI Summary exits go to inline YouTube plays; only 23% link to
  publisher websites.**
- Feed composition by position: positions 1–5 are 21.6% AI Summaries; positions
  11–20 are 56%; **beyond position 20 it is 82.7%.**

The deep-feed positions a low-authority food site could realistically win are
~83% AI Summaries. Combined with food = 2% of Google traffic, this is why Discover
is ranked third and framed as hygiene.

**Volatility, documented.** The December 2025 core update produced publisher
declines of 12–85%, with cases of 100,000 daily Discover clicks going to zero and
one publisher at −98% (https://ppc.land/googles-december-update-destroys-discover-traffic-for-news-sites/, 2025-12-20).
The first-ever Discover-only core update ran 2026-02-05 → 2026-02-27
(https://www.searchenginejournal.com/googles-discover-core-update-finishes-rolling-out/568413/);
Newzdash data showed US publishers' share of the US Top-1000 rising 88.86% → 89.94%
while international publishers fell 8.52% → 7.04%
(https://www.seo-kreativ.de/en/blog/google-discover-core-update-february-2026-completed-what-the-newzdash-data-reveals/, 2026-03-07) —
being a US site for a US audience is now a mild advantage for us. A March 2026
serving bug caused 60–80% impression drops for thousands of publishers. Global
publisher Discover referrals were **−21% YoY to Nov 2025, −29% YoY in the US**
(Chartbeat / Reuters Institute, via
https://pressgazette.co.uk/media-audience-and-business-data/google-traffic-down-2025-trends-report-2026/, 2026-01-12).

**The food-blog practitioner view is even harsher.** Feast Design Co., which builds
themes for food blogs, states Discover "makes up less than 0.1% of food blog
traffic," that as of 2025 "there is nothing specific that can be done to increase
Google Discover traffic," and that "Google Discover should be ignored" because
chasing it is "a pure gamble and is not worth sabotaging your regular rankings"
(https://feastdesignco.com/discover/). That is an opinion from an interested party,
but it converges with the Raptive network data.

**Measurement caveat that invalidates most benchmarks.** Google Search Console
**over-reported impressions** from 2025-05-13 to 2026-04-27 (~50 weeks). Clicks
were unaffected; historical data will not be corrected
(https://searchengineland.com/google-fixes-search-consoles-year-long-data-logging-issue-well-kind-of-476442, 2026).
Any Discover impression benchmark published in that window is inflated.

---

## 4. Google Discover — technical + content checklist, met vs missing

Repo inspection: `src/layouts/BaseLayout.astro`, `src/pages/[slug].astro`,
`src/components/OptImage.astro`, `astro.config.mjs`, `public/`, plus live checks
against https://www.daily-life-hacks.com on 2026-07-26.

### 4.1 Technical — MET

| Item | Evidence |
|---|---|
| `max-image-preview:large` on every indexable page | `BaseLayout.astro:18-19` sets `DEFAULT_ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1"`. Confirmed live: `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">` |
| Article pages inherit the default (do not override) | `[slug].astro:305` — `robotsMeta` is `undefined` for released canonical pages, so the layout default applies. Only unreleased/variant pages get `noindex, follow`. Correct. |
| `og:image` present and absolute on every page | `BaseLayout.astro:36-38, 105`. Confirmed live: `og:image` = `https://www.daily-life-hacks.com/images/protein-per-dollar-cheapest-protein-sources-main.jpg` |
| Hero image ≥1200px wide — **all 234 heroes pass** | Measured: 1376×768 (98), 1920×960 (65), 1408×768 (57), 1200×675 (9), 1200×670 (4), 1536×768 (1). **Zero under 1200w.** |
| >300,000 total pixels | Smallest hero is 1200×670 = 804,000 px. Comfortably clear. |
| ~16:9 aspect ratio | 1376×768 = 1.79; 1920×960 = 2.00; 1408×768 = 1.83; 1200×675 = 1.78. Mostly on target; the 1920×960 set is 2:1, slightly wide. |
| Non-generic, representative images | Per-article `{slug}-main.jpg`, never the logo. Default `image` fallback is `/logo.png` but every article overrides it. |
| Hero is **not** lazy-loaded | `[slug].astro:383-385` — `fetchpriority="high" loading="eager" decoding="sync"`. This directly satisfies the "image must actually load" pCTR input. |
| Real `<img>` element in rendered HTML | `OptImage.astro` outputs `<picture><source …><img src …>`. Google does not index CSS background images; we are clean. |
| No `notranslate` / `nopagereadaloud` | Grepped the layout and article template — neither tag is present. These are documented hard blockers. |
| HTTPS | Enforced; >90% of Discover-served pages are HTTPS. |
| Article / Recipe / WebPage / Breadcrumb / FAQ schema | `[slug].astro:126-300`, with `datePublished`, `dateModified`, `author`, `publisher`, `image` array. |
| Author entity | `Person` with `sameAs`, `knowsAbout`, `jobTitle` on `/about/`; article `author` `@id` points there; `rel="author"` byline link at `[slug].astro:434-439`. |
| Indexed by Google | 132 URLs indexed (GSC, per `reports/growth/gsc-structured-data-indexing-2026-07-26.md`). Eligibility gate cleared for those 132. |
| US site, US audience | `inLanguage: "en-US"`, US-priced data. Favoured by the Feb 2026 Discover update. |
| Mobile-friendly | Responsive Tailwind layout, `viewport` meta present. |

### 4.2 Technical — NOT MET / at risk

| # | Gap | Why it matters | Fix |
|---|---|---|---|
| D1 | **WebP variants cap at exactly 1200w.** `OptImage.astro` builds `-400w / -800w / -1200w`; measured largest variants are 1200×670, 1200×655. The `<source type="image/webp">` is preferred by every modern browser and crawler, so the image Google most likely fetches sits **exactly on** the 1200px floor with zero margin — even though the JPEG fallback is 1376–1920px. | Google's floor is "at least 1200 px wide"; sitting exactly on it leaves no tolerance and forfeits the higher-resolution assets we already have. | Add a `-1600w.webp` variant in `scripts/optimize-images.mjs` and extend the `srcset`. Half a day. |
| D2 | **Bursty publishing cadence.** 18 articles dated 2026-07-13, then 2026-07-14 (×2), 07-16 (×2), 07-19 (×3). | Discover's freshness window is 1–7 days strongest, 8–14 moderate. A batch dump wastes 17 of 18 freshness slots; a steady 3–4/week keeps a rolling candidate set. | Space releases via the existing `publishAt` release-gate mechanism, which is already built and working. |
| D3 | **`dateModified` on only 143 of 210 articles.** | `dateModified` feeds both the freshness signal and the evergreen-refresh path — the documented way evergreen content re-enters Discover. | Backfill on the 67 articles missing it, and set it whenever an article is substantively updated. |
| D4 | **No image sitemap.** `astro.config.mjs` uses `@astrojs/sitemap` with URL-level serialization only. | Aids discovery of the 31 chart images and 293 hero images. Helps Images more than Discover, but it is the same asset pass. | Add image entries to the sitemap serializer. |
| D5 | **Only 35 of 210 articles have any body image beyond the hero.** | Not a Discover blocker (Discover reads `og:image`), but reader engagement is a pCTR input, and the same gap caps Images and Pinterest. | Prioritise the 16 long articles flagged with no supporting body image in the 2026-07-23 visual audit. |
| D6 | **`/images/*` cached for only 300s** (`public/_headers`). | Forces repeated re-fetches; marginal crawl-efficiency cost. | Raise to a longer max-age once image churn settles. |
| D7 | **78 of 210 articles not indexed** (132 indexed of 226 discovered). | Indexing is the *eligibility gate*. An unindexed article cannot appear in Discover at all. | Continue the existing indexing recovery work — it is prerequisite to every surface here, not just Discover. |

### 4.3 Content-side checklist

| Item | Status |
|---|---|
| Original, experience-led content with named author | **Met** — David Miller voice, single named author, `/about/` bio. |
| Topical concentration (Discover scores topical, not general, authority) | **Met** — 207 articles across nutrition / recipes / tips, one coherent food-economics spine. |
| No clickbait / sensationalism (explicit Discover policy) | **Met** — the `david-miller-voice` skill's hard bans align with this policy. |
| Headline length 90–105 chars (Discover optimum, longer than search's 80–90) | **Not audited** — our titles are tuned for search. Worth a pass on data studies only. |
| Substantial content | **Met** — 0 articles below the 800-word audit threshold. |
| Transparency: clear dates, bylines, author info, contact | **Met** — byline, date, `/about/`, `/contact/`, `/methodology/`. |
| Medical-content policy exposure | **Watch.** "Medical content" is an explicit prohibited category in Discover's content policies (https://support.google.com/websearch/answer/9982767). In practice this targets harmful or consensus-contradicting medical claims, not general nutrition writing — and our sitewide medical disclaimer at `[slug].astro:687-695` helps. But a nutrition site making health claims sits closer to this tripwire than a pure recipe site. Keep claims sourced to USDA/BLS. |
| `NewsArticle` schema | **Correctly absent.** `NewsArticle` is inappropriate for evergreen nutrition content and confers no Discover advantage. `Article`/`Recipe` is right. Do not mislabel evergreen posts as news. |

### 4.4 Explicitly NOT worth doing for Discover

- **RSS for Discover.** Google's documentation was updated around Nov 2025 stating
  the Follow feature is **no longer shown in Discover**; the Chrome "Following"
  feed is being retired
  (https://www.seroundtable.com/google-discover-drops-follow-feature-40463.html).
  Every 2026 blog post claiming RSS "improves Discover ranking" is repeating
  pre-2025 advice. Build the feed for aggregators and email — not for Discover.
- **Google Publisher Center registration.** Optional and irrelevant to eligibility.
- **AMP.** `max-image-preview:large` achieves the same image entitlement.
- **The famous "333% clicks" and the SEJ Discover image case study.** The SEJ study
  (https://www.searchenginejournal.com/google-discover-case-study/355124/) is dated
  **2020-03-19** and is observational, not an A/B test. Do not plan against it.
- **The "new sites get a Discover testing budget" theory.** No data, no citations,
  no named source. Treat as fiction.

### 4.5 The 30-second check that beats this entire section

Open Search Console → Performance → check whether a **Discover** tab exists at all.
The Discover report only appears after an undisclosed minimum impression threshold
in the trailing ~3 months (https://support.google.com/webmasters/answer/9216516).
If there is no Discover tab, our current Discover presence is effectively zero and
every estimate above is the optimistic case.

---

## 5. Surface-by-surface detail (the remaining four)

### 5.1 Google Images / visual search

**Volume reality.** Google Images is about **1/8 the size of Google.com** by search
volume in the US clickstream panel (SparkToro/Datos, Jan 2023–Jan 2025,
https://sparktoro.com/blog/new-research-how-often-do-americans-search-google-which-search-verticals-do-they-use/, 2025-03-04) — roughly 11–12%, browser-only.

**A myth to kill:** the claims that "Google Images drives 22% of all web searches"
and that "sites with optimized image libraries see 20–40% of organic traffic via
image search" circulate in 2026 vendor guides. The 22% figure derives from **2018
Jumpshot data**; the 20–40% claim has no cited study anywhere. Marketing copy.

**GSC accounting gotcha.** In the Performance report with Search type = Image,
clicks are only counted when they lead **outside** Google — expanding a thumbnail
is not a click. GSC also does not distinguish between different images on the same
page (https://support.google.com/webmasters/answer/7042828).

**What we already satisfy:** real `<img>` elements; short descriptive filenames
(`{slug}-main.jpg` beats `IMG00023.JPG` per Google's own doc); descriptive alt text
on all 31 charts (e.g. "Bar chart ranking 21 animal proteins by protein per
dollar"); WebP with JPEG fallback; hero not lazy-loaded; Recipe schema on 80
recipes, which earns a **badge in Google Images** — the highest-CTR image treatment
available to us.

**What is missing:** no image sitemap (D4); the 31 charts have **no `opt/` variants
at all** and are served as raw JPEGs (1485×1185, 1656×1124, 1200×675) with no
`srcset`; no 4:3 (1200×900) or 1:1 variants in the schema `image` array, which
practitioner consensus says maximises recipe rich-result surface compatibility
(https://www.wptasty.com/how-to-get-rich-snippet-recipes-on-google, 2026).

**Skip the Licensable badge.** It routes users to a *licensing* page, not to the
article. Built for stock-photo businesses. Zero evidence it lifts article traffic.

**Google Lens is not actionable.** Lens processes 20+ billion visual searches/month,
but there is no publisher-facing optimization surface — no schema, no meta tag, no
sitemap type. Lens matches on visual embeddings plus the host page's existing index
entry. No credible data exists on Lens driving referral clicks to editorial sites.
Any agency selling "Lens optimization" is selling image SEO with a new label.

**Do original charts drive traffic?** Evidence is weak and vendor-authored. The
defensible position: original charts **do** get indexed and **do** rank for
`"[topic] chart"` / `"[topic] graph"` queries — low volume, low competition, a rare
place a zero-backlink site can rank. Their real value is **link acquisition and
citation**, not image clicks. A distinctive original chart is the most linkable
asset a small food/nutrition site can make, and links are our actual bottleneck.

**Verdict:** 50–600 sessions/month. Do the hygiene (image sitemap, chart variants,
multi-aspect schema arrays) because it costs half a day and serves Discover and
Pinterest simultaneously. Not a strategy.

### 5.2 YouTube Shorts / TikTok

**The content premise is sound.** "Extreme budget eating" is a live, large trend:
$5 dinners, dollar-store meal hacks, high-protein grocery hauls, with 50% of diners
reporting social media directly influences food choices
(https://foodinstitute.com/video/extreme-budget-eating-the-food-trend-brands-cant-ignore/, 2026;
https://www.accio.com/business/tiktok-food-trends-2026, 2026). Our
protein-per-dollar rankings are natively suited to countdown and bar-chart-race
formats, and we already have the Remotion pipeline and 31 chart assets.

**The click premise is not.** Shorts RPM sits at **$0.01–$0.06 per 1,000 views**,
and Shorts "are great for growing subscribers fast but pay poorly and do not convert
as well to a product funnel" (https://easyviral.ai/blog/how-much-do-faceless-youtube-channels-make-2026, 2026).
Shorts has no clickable link in the mobile player; TikTok gives one bio link. Shorts
now represent over 90% of all new YouTube uploads — the competition is brutal.

Also relevant: Discover's **video pipelines are 72–100% YouTube**, and **77% of US
Discover AI Summary exits go to inline YouTube plays**. A YouTube presence is the
only way we could ever appear in those pipelines — which is an argument for video
as a *Discover* play more than as a direct-traffic play.

**Verdict:** 50–400 site clicks/month at best. Treat as a brand/audience channel
with an option value on Discover video pipelines, not a traffic channel. **Defer
until Pinterest cadence is stable** — both compete for the same creative production
capacity.

### 5.3 Flipboard / MSN / Apple News / aggregators

Every door here is either closed or requires the RSS feed we do not have.

- **MSN / Microsoft Start Partner Hub — invite-only.** "To sign up as an MSN Partner,
  you will need the unique Invite code that was emailed to you by Microsoft"
  (https://support.microsoft.com/en-us/msn/partner-hub/how-to-set-up-your-msn-partner-hub-account).
  Publishing minimums once in: news sites 10 articles/day; **non-news sites at least
  5 per month** — we clear that easily. There is no application URL; the only
  practical path is to become visible enough that Microsoft invites us. Given we
  already earn 41 Bing Copilot citations/day, this is not absurd, but it is not
  actionable today.
- **Apple News — not accepting unsolicited applications** as of 2024–2025
  (https://developer.apple.com/forums/thread/782314). Publishers who applied were
  told Apple is not currently accepting new applications. Not actionable.
- **Flipboard — pivoted away from being a traffic firehose.** Flipboard launched
  **Surf** (April 2026), a separate fediverse-and-feeds reader, and "social
  websites" connecting publishers to the open social web via ActivityPub, Bluesky,
  Mastodon, Pixelfed (https://dataconomy.com/2026/04/03/flipboard-launches-social-websites-to-connect-publishers-to-the-open-web/, 2026-04-03;
  https://about.flipboard.com/business/publisher-federation-flipboard/). RSS-fed
  magazines still work and remain the cheapest aggregator to enter — **but require
  the feed.** Expect low hundreds of sessions/month at best.
- **Google News — automatic, nothing to apply to.** Google removed the manual
  publication option; publication pages are auto-generated and eligibility is
  algorithmic (https://support.google.com/news/publisher-center/answer/15898024).
  A food/nutrition site is unlikely to be classified as news. No action available.

**Verdict:** 0–200 sessions/month. Build the RSS feed (it is cheap and gates other
things), fix `/feed` returning 410, submit to Flipboard, and otherwise deprioritise.

**Syndication risk note:** if we ever do syndicate, keep `rel=canonical` pointing
home. Google's site-reputation-abuse policy targets third-party content hosted on
*our* domain to exploit *our* rankings — the reverse direction. Syndicating our own
content out is not the trigger, but duplicate-content dilution is still real.

### 5.4 Newsletter / community

**Benchmarks.** Marketing emails average a **20.73% open rate and 2.27% CTR**
(Brevo 2026, https://www.brevo.com/blog/email-marketing-benchmarks/). Apple Mail
Privacy Protection inflates reported opens by **15–20+ percentage points**, so open
rate is no longer a clean readership measure — use verified clicks
(https://newsletter.supply/blog/good-newsletter-open-rate-2026, 2026). Food &
beverage has the **lowest bounce rate of any industry at ~0.3%**, indicating strong
list hygiene and engagement in this niche.

**The arithmetic.** At a 2.27% CTR and weekly sends, 1,000 subscribers produce
roughly **90–100 sessions/month**. To contribute meaningfully to a 10k/month goal
we need **3,000–5,000 subscribers** — from 16 today. At a realistic 1–3% visitor-to-
subscriber conversion, that requires 100k–500k cumulative site visits, which we do
not have. **The list cannot lead; it can only compound behind another channel.**

**Its real value is second-order.** A list is the only channel we own outright, it
is immune to every algorithm change documented in this report, and it feeds branded
search — which is itself an input to AI citation. Keep growing it, but do not
model it as a primary traffic source in year one.

**RSS-to-email is currently impossible.** Kit supports RSS-driven broadcasts; we
have no feed. Another item gated by the same two-hour fix.

**Reddit.** Realistically our highest-variance community channel: "a single post can
send thousands of targeted visitors overnight," but "posting your product link in
five subreddits within the same day, with no prior comment history, triggers
Reddit's anti-spam ML model within minutes and applies a sitewide shadow ban"
(https://redship.io/blog/reddit-self-promotion-rules, 2026). We have already been
banned from r/EatCheapAndHealthy, and our own ban-lessons playbook (no same-day
crossposts, slow reply cadence, no own-domain links early, freeze after bans) is
consistent with the published 2026 guidance. Keep it slow.

The strongest argument for Reddit is no longer referral traffic — it is that
**Reddit is the single most-cited domain across ChatGPT, Gemini, Perplexity and AI
Overviews** (Peec AI, 30M citations, March 2026). Reddit participation feeds
surface #2.

---

## 6. Consolidated next actions, in order

**Week 1 — unblock and instrument (≈1.5 days engineering, no writing)**
1. Add `@astrojs/rss`, publish `/rss.xml`, remove the `/feed` 410, add
   `<link rel="alternate" type="application/rss+xml">` to `BaseLayout.astro`.
2. Segment AI referrers (`chatgpt.com`, `perplexity.ai`, `copilot.microsoft.com`,
   `gemini.google.com`) in GA4 and `/api/event`. **We cannot currently tell whether
   41 citations/day produce any clicks.**
3. Check GSC → Performance for whether a Discover tab exists, and read the
   Search type = Image click share. Two numbers, five minutes, replaces guesswork.

**Weeks 1–2 — Pinterest cadence (surface #1)**
4. Raise to 4 pins/day, enforce ≥7-day variant spacing, audit boards and board
   keywords, build a 45–60 day seasonal calendar, convert the 31 charts to pin creatives.

**Weeks 2–4 — AEO depth (surface #2)**
5. Extend `Dataset` schema from 6 to all 16 data studies; publish the 10 missing CSVs.
6. Build a statistics hub page.

**Weeks 3–4 — Discover/Images hygiene (surface #3 and #4, one pass)**
7. Add `-1600w.webp` variants; generate `opt/` variants for the 31 charts.
8. Backfill `dateModified` on 67 articles; switch to spaced releases via `publishAt`.
9. Add image entries to the sitemap; add 4:3 and 1:1 variants to schema `image` arrays.

**Ongoing**
10. Keep pushing indexing recovery — 78 unindexed articles are ineligible for
    every Google surface in this report.
11. Slow, genuine Reddit participation, valued as AI-citation corpus entry.

---

## 7. Evidence quality flags

Stated plainly, because several of these numbers will get quoted later:

- **Strong:** Google's own Discover and Images documentation; GSC help pages;
  Google News automatic-eligibility announcement; Ahrefs 137k-site and SE Ranking
  300k-domain llms.txt studies; SparkToro/Datos clickstream data; Brevo email
  benchmarks; Peec AI 30M-citation study; MSN and Apple News program status.
- **Medium:** Raptive's food = 2% figure (single ad network, but ~1B Discover
  clicks/yr and no competing dataset exists); Marfeel's Discover feed composition;
  Chartbeat/Reuters referral declines; AirOps 15k-URL structured-data correlation;
  BrightEdge/Moz AI-citation-vs-organic-overlap.
- **Weak / directional:** the Discover SDK reverse-engineering (unofficial, not
  Google-confirmed, though the most detailed account available); "niche sites gained
  in the Feb 2026 update" (explicitly directional per its own author); Pinterest
  impression→click CTR bands (vendor-authored, wide range); all faceless-YouTube
  earnings figures (vendor-authored); my Google Images 50–600 estimate (no
  food-blog-specific benchmark exists publicly — it is inferred from volume ratio
  and click economics).
- **Actively discredited, do not reuse:** "Google Images drives 22% of searches"
  (2018 Jumpshot derivative); "20–40% of organic traffic from image search" (no
  study); the 2020 SEJ Discover image case study; "new sites get a Discover testing
  budget"; any Discover impression benchmark published between 2025-05-13 and
  2026-04-27 (GSC over-reported impressions for 50 weeks).
