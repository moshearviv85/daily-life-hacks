# Traffic Sweep 07 — Hacks, Myths, Grey-Hat, and Folklore

**Site:** daily-life-hacks.com (budget food, nutrition-per-dollar data, recipes, US audience)
**Constraints:** one operator, no ad budget, near-zero current traffic
**Territory:** the leftovers — classic growth hacks, grey/black-hat tactics people still sell, widely repeated SEO myths, food-blog superstitions, and genuinely weird tactics that actually worked for someone.
**Date compiled:** 2026-07-26
**Status:** RESEARCH ONLY. Nothing here is a recommendation to implement. Items marked DANGEROUS are documented so they are *recognizable when someone tries to sell them*, not to be used.

## Verdict flags

| Flag | Meaning |
|---|---|
| **WORKS** | Still effective in 2026, legitimately |
| **SITUATIONAL** | Works only under specific conditions — conditions stated |
| **DEAD** | Genuinely worked once; the mechanism no longer exists |
| **MYTH** | Never worked, or was debunked by the platform itself |
| **DANGEROUS** | May work, but carries penalty / ban / deindex risk — risk stated |

---

<!-- ITEMS APPENDED BELOW AS RESEARCHED -->

# SECTION 1 — CLASSIC GROWTH HACKS THAT GENUINELY WORKED ONCE

These are the founding legends of growth hacking. Most are still cited in 2026 by people who never tested them. Each entry says plainly whether the mechanism still exists.

### 1. The Hotmail email signature ("PS: Get your free email at Hotmail")
- **What it did:** In 1996 Hotmail appended a one-line ad with a link to the bottom of every outgoing email. Sabeer Bhatia and Jack Smith went from ~20k to 1M users in six months, 12M in 18 months. Tim Draper (DFJ) claims authorship of the line.
- **2026:** The mechanism — every user broadcasting a link to their whole address book, in an era with no spam filtering and no competing free webmail — is gone.
- **Applicability here:** Zero. A solo blog has no user-to-user messaging surface.
- **Effort:** N/A
- **VERDICT: DEAD**
- Source: Adam L. Penenberg, *Viral Loop* (2009); Draper's own retellings in press interviews (2013 onward).

### 2. Dropbox double-sided referral (500MB for you, 500MB for them)
- **What it did:** Increased signups 60% permanently; ~35% of daily signups came from referral (Drew Houston, "Dropbox: Startup Lessons Learned" deck, 2010).
- **2026:** Double-sided referral still works — but only for products with (a) an account and (b) a per-user resource you can gift cheaply. A blog has neither. The diluted content-site form is newsletter referral milestones (item 17).
- **Applicability here:** Only via Kit newsletter referral. Site already has Kit.
- **Effort:** Medium
- **VERDICT: SITUATIONAL** — works for products, not for articles.

### 3. Embed-widget seeding (badge / widget / calculator with a backlink)
- **What it did:** 2006–2012. Give away a widget, badge or "As seen on" seal whose embed code carries a keyword-anchored link home. Built enormous link profiles.
- **2026:** Google names **widget links** explicitly in its link spam policy — keyword-rich links in distributed widgets are link spam and are algorithmically discounted (SpamBrain link spam update, Dec 2022, neutralizes rather than penalizes in most cases).
- **Nuance that survives:** A genuinely useful embed with a plain brand link or `nofollow` still drives *referral clicks and brand awareness*. That half works. The SEO half does not.
- **Applicability here:** A "cost per gram of protein" embeddable calculator is a plausible asset — for referral clicks, not link juice.
- **Effort:** Medium-High
- **VERDICT: DEAD for SEO / SITUATIONAL for referral traffic**
- Source: [Google link spam policy](https://developers.google.com/search/docs/essentials/spam-policies#link-spam) (current).

### 4. Ego bait ("Top 50 X bloggers", expert roundups)
- **What it claims:** Publish a list naming influential people, email them all, they share it. Peak 2010–2016.
- **2026:** Massively diluted. Named experts have seen the play a thousand times; response rates are low single digits. Still works when the list is genuinely novel, data-derived, or confers real status.
- **Applicability here:** Moderate — a data-backed ranking that names real dietitians / food economists is a legitimate outreach hook, unlike a generic "top blogs" list.
- **Effort:** Medium
- **VERDICT: SITUATIONAL**

### 5. Skyscraper technique (Brian Dean / Backlinko, 2013)
- **What it claims:** Find content with many backlinks → make something better → email everyone linking to the original.
- **2026:** The *content* half still works. The *outreach* half is effectively dead — the pitch template ("I noticed you linked to X, I wrote something better") is now a spam-filter signature. Practitioner-reported reply rates fell from double digits to ~1–3% over 2021–2025. Separately, "same article but longer" is exactly the pattern Google's Helpful Content work and subsequent core updates target.
- **Applicability here:** Low as taught. The original-data variant — make the thing nobody else has because you computed it — is the only surviving version, and that is this site's actual advantage.
- **Effort:** High
- **VERDICT: DEAD as taught / SITUATIONAL if the "better" is original data**

### 6. Broken link building
- **What it does:** Find dead pages on a topic, find sites still linking to them, offer your live replacement.
- **2026:** **Still works.** One of the few white-hat link tactics that survived, because it delivers genuine value to the webmaster. Yield is low (roughly 1–3 links per 100 well-targeted emails) but the links are real editorial links.
- **Applicability here:** Good. University Extension "cost of food at home" pages and defunct budget-food blogs die constantly and are widely linked from .edu and .gov.
- **Effort:** High (manual)
- **VERDICT: WORKS (low yield, high effort)**

### 7. HARO (Help A Reporter Out) at its peak
- **What it did:** 2008–~2020. Three emails a day of journalist queries; answer fast with a quotable line, earn a link from a major publication.
- **2026:** **HARO is gone.** Cision rebranded it Connectively, then discontinued it entirely on **2024-12-09**. Cause of death: AI-generated pitch spam drowning journalists, plus a paywall that drove real sources away.
- **Successors:** Qwoted, Featured (ex-Terkel), SourceBottle, Help a B2B Writer, #JournoRequest on X/Bluesky, Muck Rack (paid). These work at maybe 20–30% of HARO's peak yield; the AI-spam problem followed them.
- **Applicability here:** Real — "budget food / grocery cost data" is a live query category on every grocery-inflation news cycle. But the operator is not a credentialed dietitian; the honest positioning is "I built a dataset," never "I'm a nutrition expert." Misrepresenting credentials to journalists is its own serious risk.
- **Effort:** Medium (daily monitoring)
- **VERDICT: DEAD (HARO itself) / SITUATIONAL (successors)**
- Sources: [Cision — Connectively has been discontinued](https://www.cision.com/connectively-has-been-discontinued/); [Search Engine Roundtable, Nov 2024](https://www.seroundtable.com/haro-connectively-platform-closing-38388.html)

### 8. Share networks — Quuu, Triberr, Viral Content Bee
- **What they do:** Reciprocal amplification; Quuu Promote injects your post into other members' Buffer queues.
- **2026:** Technically alive, functionally worthless. Shares land on accounts with no audience overlap and near-zero engagement; platforms discount low-engagement reshares. Meaningful referral traffic: effectively nil.
- **Applicability here:** None.
- **Effort:** Low
- **VERDICT: DEAD**

### 9. StumbleUpon seeding
- **What it did:** 2007–2015 StumbleUpon could send tens of thousands of visits to one page in a day; StumbleUpon Paid Discovery at ~$0.10/visit was the cheapest real traffic on the internet.
- **2026:** StumbleUpon shut down in **June 2018**, migrated to Mix, and Mix wound down. The whole "random discovery button" category is gone.
- **Living analogue:** Google Discover and Pinterest's related-ideas feed are the real successors for a food site — both belong to other researchers' territories.
- **VERDICT: DEAD**

### 10. Digg-era front-page gaming
- **What it did:** 2006–2010. A few dozen power users controlled the Digg front page; mutual-digg rings, bury brigades, and paid services (User/Submitter, Subvert and Profit) could manufacture a front page worth 50k–200k visits.
- **2026:** Digg's original form died in the v4 collapse (2010–2012). Digg relaunched in 2025 under Kevin Rose and Alexis Ohanian with paid/invite access — real, but tiny and unproven as a traffic source, and vote manipulation there would be banned behavior from day one.
- **VERDICT: DEAD**

### 11. Reddit vote rings / vote manipulation
- **What it is:** Coordinated upvoting via alt accounts, upvote-exchange Discords/Telegrams, or paid "Reddit upvote" services (openly sold on Fiverr and BHW).
- **2026:** Reddit's anti-manipulation detection is among the better ones in the industry, and vote manipulation is an explicit Content Policy violation. Detection spans IP, device fingerprint, timing correlation and account graph.
- **Penalty:** shadowban of all involved accounts and, critically, **sitewide domain ban of the linked site** — every future submission of that domain auto-removed, with no practical appeal path.
- **Special relevance:** this operator already ate an r/EatCheapAndHealthy ban in July 2026 on a *legitimate* post. A domain ban would remove Reddit permanently, and Reddit is one of the few realistic channels here.
- **VERDICT: DANGEROUS — risk: permanent sitewide Reddit domain ban. Highest-consequence item in this report relative to this specific site.**

### 12. Forum signature links
- **What it did:** 2004–2011. Keyword-anchored link in a vBulletin/phpBB signature; every post created a link.
- **2026:** Google's link spam policy names forum-signature links as a violation; they are discounted, not counted. Also the forums themselves are mostly dead — the audience moved to Reddit, Discord and Facebook Groups, none of which have followable signature links.
- **Residual truth:** being genuinely useful in a Discord still gets humans clicking your profile. That is community work, not link building.
- **VERDICT: DEAD**

### 13. Blog comment links
- **What it did:** 2005–2011. CommentLuv, KeywordLuv and "dofollow comment lists" made comment links a real ranking lever.
- **2026:** Practically all comment links are `nofollow`/`ugc` (WordPress default since 2005; `rel="ugc"` introduced 2019). Automated comment blasting (ScrapeBox, GSA SER) is pure spam. Manual thoughtful comments on active blogs occasionally produce a real click and a relationship.
- **VERDICT: DEAD for SEO. The "dofollow comment list" product still sold to beginners is a MYTH — those lists produce nothing.**

### 14. Web rings
- **What it was:** 1996–2001. Sites in a niche linked in a circle with prev/next navigation.
- **2026:** Nostalgically revived on the IndieWeb / Neocities / personal-blog scene, and genuinely sends small amounts of real human traffic *there* — tens of visits, not thousands. Zero SEO value.
- **Applicability here:** Very low. A commercial food site does not fit indie-web ring culture and would be declined by the curators.
- **VERDICT: DEAD as a traffic strategy / SITUATIONAL as a living subculture this site is not part of**

### 15. Banner exchanges and traffic exchanges (LinkExchange, EasyHits4U, Hitleap, 10KHits)
- **What they are:** You view other people's sites (often via autosurf), they view yours. LinkExchange (1996) was legitimate for its era and sold to Microsoft for $265M in 1998.
- **2026:** Modern traffic exchanges deliver bot and forced-view traffic. It does not convert, does not rank, corrupts analytics, and is an explicit policy violation for ad networks.
- **Penalty:** AdSense "invalid traffic" termination; Mediavine/Raptive/Journey rejection or removal. Sellers who claim it improves rankings are lying (see CTR manipulation, item 47).
- **VERDICT: DANGEROUS — risk: ad-network termination and permanently polluted analytics. The claimed SEO benefit is separately a MYTH.**

### 16. Safelists / email blast lists
- **What they are:** 1998–2005 relic. Opt-in-in-name-only lists where every member emails every other member. Sold today as "solo ads" and "buyer lists."
- **2026:** Deliverability suicide. Mailing a purchased or safelist audience hits spam traps, permanently damages your sending-domain reputation, and gets an ESP account (Kit included) terminated on the first offense.
- **VERDICT: DANGEROUS — risk: permanent sending-domain reputation damage plus ESP account termination. Also DEAD — nobody reads them.**

### 17. Newsletter referral milestone programs (the surviving descendant of #2)
- **What it does:** "Refer 3 friends → get the printable meal-plan PDF." Morning Brew grew to well over a million subscribers largely on this mechanic (its own published case studies, ~2019).
- **2026:** **Works**, with a hard precondition: it needs an already-engaged list. Below roughly 1,000–2,000 subscribers the arithmetic produces almost nothing, and operators burn weeks on mechanics for five referrals.
- **Applicability here:** Real but premature. Revisit when the Kit list clears ~2k.
- **Effort:** Medium
- **VERDICT: SITUATIONAL (list-size gated)**

### 18. Link-roundup / weekly-roundup pitching
- **What it is:** Many niche blogs and newsletters publish weekly link roundups; pitching a genuinely good piece into them was a staple 2012–2018 link tactic.
- **2026:** The blog-roundup ecosystem died with RSS; the **newsletter** version replaced it and is alive and effective. Frugality, personal-finance and food-policy newsletters run link sections and accept good submissions with no money changing hands.
- **Applicability here:** Good, underrated, cheap. This is the legitimate 2026 form of the old tactic.
- **Effort:** Low-Medium
- **VERDICT: WORKS (in newsletter form)**

---

# SECTION 2 — GREY-HAT AND BLACK-HAT TACTICS PEOPLE STILL SELL

**None of these are recommended.** They are documented so the operator recognises them when a "SEO agency," a Fiverr gig, an Upwork proposal, a cold DM, or a YouTube guru tries to sell them. Every one of these is actively marketed in 2026.

Governing documents referenced throughout:
- [Google Search spam policies](https://developers.google.com/search/docs/essentials/spam-policies) (living document)
- [Google, "What web creators should know about our March 2024 core update and new spam policies"](https://developers.google.com/search/blog/2024/03/core-update-spam-policies) — introduced the three named policies: **expired domain abuse**, **scaled content abuse**, **site reputation abuse**
- August 2025 spam update (rolled out 2025-08-26, completed 2025-09-22) — widely characterised as a **penalty-only** update targeting doorway pages, spun content, low-effort AI articles, scaled content abuse and site reputation abuse via SpamBrain

### 19. PBNs (Private Blog Networks)
- **What it is:** You own or rent a network of unrelated-looking sites (often on expired domains) whose only purpose is to link to your money site. Sold as "high DA links," "aged domain links," "private network placements," typically $50–$400 per link.
- **2026:** Detectable at scale — footprint analysis, hosting/IP overlap, registrant patterns, link-graph topology, and content-quality signals. SpamBrain neutralises most PBN links automatically; the August 2025 spam update visibly hit link-network sites.
- **Penalty:** manual action "Unnatural links to your site," algorithmic devaluation, and at the severe end **full deindexation** of the money site. Recovery requires disavow + reconsideration and often never fully recovers.
- **Applicability here:** None. The site is a long-term brand asset; PBN risk is asymmetric.
- **VERDICT: DANGEROUS — risk: manual action up to full deindexation of daily-life-hacks.com.**

### 20. Link farms
- **What it is:** The cruder ancestor of PBNs — pages of nothing but outbound links, everyone links to everyone.
- **2026:** Dead as a mechanism; Google has algorithmically discounted these since roughly Penguin (2012), and SpamBrain finishes the job. Still sold in bulk on Fiverr as "10,000 backlinks $5."
- **VERDICT: DEAD (does not work) + DANGEROUS (the seller's blast can still trigger link-spam signals)**

### 21. Expired domain buying (for the backlinks)
- **What it is:** Buy an expired domain with existing authority and rebuild on it, or point it at your site.
- **2026:** Named as **expired domain abuse** in Google's March 2024 spam policy update — buying an expired domain and repurposing it "primarily to manipulate Search rankings by hosting content that provides little to no value" is an explicit violation. Enforcement is algorithmic and started March 2024.
- **Nuance:** buying an expired domain to *genuinely continue or revive* the same subject with real content is not automatically a violation — but the historical link equity mostly resets when topical continuity breaks.
- **VERDICT: DANGEROUS — risk: the acquired domain gets neutralised or actioned, money spent for nothing; if 301'd into the main site, the taint transfers.**

### 22. 301 redirect chains from expired domains ("301 power")
- **What it is:** Buy several expired domains, 301 them all into your money site (or through intermediate hops) to "pass" their authority.
- **2026:** This is a specific execution of expired domain abuse. Google's handling of irrelevant 301s has been to treat them like soft-404s and pass nothing. Aggressive versions can drag a manual action *into* the receiving site.
- **VERDICT: DANGEROUS — risk: imported penalty on the main domain. This is the version most likely to be sold to a beginner as "safe."**

### 23. Parasite SEO on high-DA hosts
- **What it is:** Publish your money content on a host with borrowed authority — LinkedIn Pulse, Medium, Substack, a newspaper's "partner content" section, Quora, an .edu subdomain, a coupon subfolder on a big magazine site.
- **2026:** The rented-authority version (paying a publisher for a subfolder) is **site reputation abuse**, a named policy since March 2024 with enforcement from 2024-05-05, escalated to algorithmic enforcement in the August 2025 spam update. Major publishers were hit with manual actions and had entire subdirectories deindexed. In November 2024 Google expanded the policy to cover first-party involvement — meaning "but we edit it" is no longer a defence.
- **What still works:** Publishing genuinely on your own Medium/Substack/LinkedIn as a distribution channel is fine and normal. The line is whether the host's authority is being rented to rank content the host has no real editorial stake in.
- **VERDICT: DANGEROUS as sold (risk: the *host* gets deindexed, and you lose everything you built there overnight) / WORKS in the plain "republish on Medium for humans" form.**
- Source: [Search Engine Journal on the expanded policy](https://www.searchenginejournal.com/google-strengthens-policy-against-site-reputation-abuse/533018/) (2024-11)

### 24. Article spinning
- **What it is:** Software (Spin Rewriter, WordAI, The Best Spinner) rewrites one article into hundreds of "unique" variants via synonym substitution.
- **2026:** Comprehensively dead — it was already dead before LLMs, and LLM rewriting has replaced it as the modern form. The August 2025 spam update explicitly targeted spun content.
- **VERDICT: DEAD + DANGEROUS (counts as scaled content abuse)**

### 25. AI mass-generation of articles
- **What it is:** Generate hundreds or thousands of articles with an LLM and publish them.
- **2026:** Google's position is precise and worth memorising: **AI content is not penalised for being AI**. What is penalised is *scaled content abuse* — "many pages generated for the primary purpose of manipulating rankings and not helping users," regardless of how they were produced (human, AI, or hybrid). Google stated this in the March 2024 policy update and reiterated it through 2025.
- **The practical reality:** the August 2025 spam update crushed large numbers of AI-farm sites. Sites that got hit shared the same profile — high volume, no original data, no author accountability, no first-hand experience.
- **Applicability here:** This is the most relevant item in the whole section, because it's the failure mode this site could drift into accidentally. A pipeline that publishes AI-assisted articles is *fine* if each article carries something no LLM could produce — in this case, the original cost-per-nutrient dataset. Volume without that becomes the exact target profile.
- **VERDICT: DANGEROUS — risk: site-wide algorithmic suppression under scaled content abuse. Not a hard ban; recovery observed only after large-scale pruning, over many months.**

### 26. Programmatic SEO at scale
- **What it is:** Generate thousands of pages from a database template — "cheapest protein in {city}", "{food A} vs {food B} cost", one page per permutation.
- **2026:** **Genuinely split.** Programmatic SEO is not inherently spam; Zapier, Zillow, TripAdvisor and Wise are built on it. The distinguishing factor Google applies is whether each generated page contains *substantive unique data a user actually wants*. Thin permutation pages with a swapped noun are scaled content abuse.
- **Applicability here:** This is the single highest-leverage legitimate tactic in this report *and* the highest-risk one, because the site already has 22 CSVs of real per-item nutrition-per-dollar data. A "food A vs food B cost-per-gram-of-protein" comparison set built on real computed numbers is defensible. The same set built on template prose with the numbers as garnish is not. The 9 comparison articles already committed (commit 8e0873a) are the good version of this.
- **Effort:** High
- **VERDICT: SITUATIONAL — works only when each page carries unique computed data; becomes DANGEROUS (scaled content abuse) the moment pages are template prose with interchangeable nouns.**

### 27. Doorway pages
- **What it is:** Many near-identical pages each targeting a keyword or city, all funnelling users to the same destination.
- **2026:** A named spam policy since 2015, re-emphasised in the August 2025 spam update. Detection is trivial.
- **VERDICT: DANGEROUS — risk: manual action "Doorway pages," typically directory-level deindexing.**

### 28. Keyword stuffing
- **What it is:** Repeating the target phrase unnaturally, stuffing city lists, hidden keyword blocks in footers.
- **2026:** Actively harmful, not just useless. Named in Google's spam policies. Also degrades LLM/AI-overview extraction.
- **VERDICT: DANGEROUS (mild) + MYTH in its "optimal keyword density" form — see item 51.**

### 29. Hidden text and hidden links
- **What it is:** White text on white background, `font-size:0`, text behind images, `display:none` keyword blocks, links in a 1px div.
- **2026:** Named in Google's spam policies as "cloaking / sneaky redirects / hidden text." Trivially detected by rendering-based crawling.
- **Nuance:** legitimate uses of `display:none` (accordions, tabs, screen-reader text) are fine — Google has said repeatedly that hidden-by-design UI content isn't the target; deceptive keyword-only blocks are.
- **VERDICT: DANGEROUS — risk: manual action.**

### 30. Cloaking
- **What it is:** Serve different content to Googlebot than to users (by user-agent or IP).
- **2026:** One of the oldest and most reliably punished violations. Also now used in the "cloaked redirect" spam pattern on Pinterest — a pin that shows a recipe to the crawler and redirects a human to a scam page.
- **Special relevance:** the July 2026 Pinterest suppression diagnosis on this account involved cloaked-redirect spam pins on the same account. That is the *victim* side of this tactic, and it is worth understanding that Pinterest's enforcement against cloaking suppresses the whole account, not just the offending pin.
- **VERDICT: DANGEROUS — risk: Google manual action + Pinterest account-level suppression.**

### 31. Negative SEO (pointing spam links at a competitor)
- **What it is:** Blast toxic links, scraped duplicates, or fake DMCA/review attacks at a competitor to tank them.
- **2026:** Largely ineffective against Google — Google has said since Penguin 4.0 (2016) that it ignores rather than penalises most unnatural inbound links, and SpamBrain handles the rest. Where negative SEO still bites is *outside* Google: fake DMCA takedowns, mass false reports on Pinterest/Reddit/YouTube, and review bombing.
- **Ethics/legal:** commissioning it can constitute tortious interference and, via fraudulent DMCA notices, perjury under 17 U.S.C. §512(f).
- **VERDICT: MYTH (mostly, against Google rankings) + DANGEROUS (legally, and it works on platform-report systems).**

### 32. Comment and forum spam (automated)
- **What it is:** ScrapeBox, GSA Search Engine Ranker, XRumer blasting links into comment sections and forums.
- **2026:** Produces zero ranking benefit (all nofollow/ugc) and gets your domain onto shared spam blocklists (Akismet, StopForumSpam, Project Honey Pot) that many hosts and email providers consult.
- **VERDICT: DEAD + DANGEROUS (domain reputation blocklisting, which is much harder to undo than a Google penalty).**

### 33. Scraped content / auto-blogging
- **What it is:** RSS-scrape other sites and republish, sometimes lightly rewritten.
- **2026:** Named spam policy ("scraped content"). Also exposes you to DMCA claims from the original publisher, which for a Cloudflare Pages site means a host-level takedown request.
- **VERDICT: DANGEROUS — risk: deindex + DMCA.**

### 34. Translation spam
- **What it is:** Machine-translate your English site into 20 languages and publish, or machine-translate foreign content into English and publish as original.
- **2026:** Explicitly listed under scaled content abuse: "translating content from one language to another with little regard for quality" is a named example in Google's policy text.
- **VERDICT: DANGEROUS — risk: scaled content abuse action. (Note: professionally translated, reviewed content is entirely legitimate — the violation is the "little regard for quality" part.)**

### 35. Exact-match domains (EMDs)
- **What it claims:** Own `cheapproteinsources.com` and outrank everyone on "cheap protein sources."
- **2026:** Google's EMD update (September 2012) specifically removed the ranking boost for low-quality exact-match domains. There is a small residual effect, but it's an *anchor-text and user-recognition* effect, not a keyword-in-domain bonus.
- **VERDICT: DEAD (the boost) / MYTH (as still sold by domain flippers)**
- Source: Matt Cutts announcement, 2012-09-28.

### 36. Reciprocal link schemes ("you link me, I link you")
- **What it is:** Link exchanges, link-swap Facebook groups, "3-way ABC exchanges" sold as undetectable.
- **2026:** Named in Google's link spam policy as "excessive link exchanges." Detection of A↔B is trivial; A→B→C→A rings are also detectable at the graph level. Some link exchange groups are effectively PBN cartels.
- **Nuance:** two genuinely related sites linking to each other because it helps readers is normal and fine. The violation is the *scheme* — systematic, quid-pro-quo, at volume.
- **VERDICT: DANGEROUS at scale / harmless-but-useless in small friendly doses.**

### 37. Guest post networks / paid guest posting
- **What it is:** Networks (or Fiverr/Upwork sellers) that place "guest posts" with your link on a roster of sites, $50–$500 each. Often the same handful of fake "magazine" sites resold under many names.
- **2026:** Google's link spam policy explicitly covers "large-scale article campaigns" and guest posts with keyword-rich anchors, and Google has run dedicated link-spam updates against guest post networks. The tell for a network site: publishes on every topic, has a visible "write for us" page with pricing, has no real traffic, and its outbound links are all commercial anchors.
- **Genuine guest posting** — you pitch a real publication with a real audience, they edit it, no money changes hands — remains legitimate and effective.
- **VERDICT: DANGEROUS (paid networks) / WORKS (genuine editorial guest posts)**

### 38. Paid links and paid reviews
- **What it is:** Buying a link, or paying a blogger for a "review" containing a followed link, without disclosure.
- **2026:** Direct violation of Google's link spam policy (link must be `nofollow`/`sponsored` if compensated). Separately a **US FTC** issue: undisclosed paid endorsements violate the FTC Endorsement Guides, updated 2023, with civil penalties now explicitly available against advertisers.
- **VERDICT: DANGEROUS — dual risk: Google link spam action + FTC exposure. The FTC half is the part sellers never mention.**

### 39. .edu / .gov link schemes
- **What it is:** Sold as "high authority .edu backlinks." Mechanisms: scholarship-page link bait, hacked .edu student directories, .edu forum profile spam, buying links on student org pages.
- **2026:** Two truths. (a) TLD is not a ranking factor — Google has said repeatedly that .edu links carry no inherent bonus; the value is that good .edu pages happen to be well-linked. (b) The "scholarship link building" tactic was very effective 2014–2018 and is now a known pattern Google's link spam systems target, plus universities themselves largely stopped listing them.
- **VERDICT: MYTH (the TLD bonus) + DANGEROUS (the schemes)**
- **Real exception worth noting:** a genuinely cited dataset landing on a university Extension or library research-guide page is a real, legitimate, valuable link — and is realistically achievable for this site. That is not a "scheme," it's librarianship.

### 40. Web 2.0 property networks
- **What it is:** Build dozens of free blogs (Blogger, WordPress.com, Weebly, Tumblr, Medium, Wix) stuffed with spun content, all linking to the money site. Sold as "Web 2.0 backlink packages."
- **2026:** Zero value. Free-host subdomains have essentially no independent authority to pass, and the pattern is a textbook link scheme.
- **VERDICT: DEAD + DANGEROUS**

### 41. Tiered link building (Tier 1 / Tier 2 / Tier 3)
- **What it is:** Good links point at your site (Tier 1); spam links point at the Tier 1 links to "power them up" (Tier 2); bot spam points at those (Tier 3). Sold as "safe because the spam never touches your domain."
- **2026:** The theory rests on PageRank flowing through spam pages, which SpamBrain neutralises. In practice the money site's link neighbourhood still looks manipulated. It is the single most commonly sold "safe black hat" package on Fiverr/BHW in 2026.
- **VERDICT: DEAD (doesn't deliver) + DANGEROUS (the "it can't hurt you" claim is false)**

### 42. Social bookmarking blasts
- **What it is:** Automated submission to 200–500 bookmarking sites (Pearltrees, Diigo, Folkd, Scoop.it, plus hundreds of dead spam-only sites).
- **2026:** Almost all such links are nofollow, on sites with no traffic, many deindexed themselves. Delivers nothing. Still sold constantly for $5–$20.
- **VERDICT: DEAD**

### 43. Directory blasts
- **What it is:** Submit to 1,000 web directories. Descendant of DMOZ/Yahoo Directory era, when directories were real.
- **2026:** DMOZ closed **March 2017**; Yahoo Directory closed **December 2014**. General web directories are dead and Google's link spam policy names "low-quality directory or bookmark site links."
- **Living exception:** *niche, curated, human-reviewed* directories with actual audiences still matter — for a food site that means recipe indexes and, more importantly, **local/consumer resource lists** (food bank resource pages, SNAP-Ed resource lists, library guides). Those are real citations, not directory blasts.
- **VERDICT: DEAD (blasts) / SITUATIONAL (curated niche listings)**

### 44. Press releases for SEO
- **What it is:** Pay a wire (PRWeb, EIN, Newswire, cheap $50 gigs) to distribute a keyword-anchored release to hundreds of syndication sites.
- **2026:** Google devalued press release links back in 2013 (Matt Cutts guidance: PR links should be nofollow) and the syndicated copies are duplicate content on sites with no traffic. Wires still sell "SEO press release packages."
- **Genuine PR** — a real journalist writing a real story — is entirely different and does work.
- **VERDICT: DEAD for SEO / WORKS as actual media relations (different activity, same word)**

### 45. Automated link-building tools (GSA SER, Money Robot, SEnuke, RankerX)
- **What it is:** Software that creates thousands of links across profiles, wikis, comments, guestbooks, and Web 2.0s automatically.
- **2026:** Nothing it produces counts. What it does produce: your domain in shared spam blocklists, and a link profile that looks manipulated.
- **VERDICT: DEAD + DANGEROUS**

### 46. Link insertions / niche edits ("we'll add your link to an existing post")
- **What it is:** Paying to insert a link into an already-published, already-indexed article. Currently the *most* aggressively sold link product in 2026 because it looks more natural than a guest post.
- **2026:** Still a paid link under Google's policy; the naturalness is cosmetic. Prices $80–$600. A large fraction of the inventory is on the same recycled network sites as paid guest posts.
- **VERDICT: DANGEROUS — this is the one most likely to be pitched to this site by cold email, framed as "we noticed your article on X."**

### 47. CTR manipulation bots (SerpClix, ClickSEO, "SERP CTR services")
- **What it claims:** Bots or paid humans search your keyword and click your result, "training" Google that you deserve rank 1. The May 2024 Google Content Warehouse API leak revived this industry by confirming click features exist (`NavBoost`, `goodClicks`, `badClicks`, `lastLongestClicks`).
- **What the evidence actually says:** click signals exist, but NavBoost aggregates over roughly a 13-month window, which dilutes short bursts; Google explicitly filters bot and anomalous clicks; and Google has publicly said the leak's field names don't map to ranking weight the way SEOs assumed. Short-term wobbles in low-competition SERPs are reported, and they wash out.
- **Real cost:** money spent on nothing, plus polluted analytics that make it impossible to tell whether real content work is working.
- **VERDICT: MYTH as sold (does not produce durable rankings) + DANGEROUS (it is click fraud in Google's terms, and the analytics pollution actively harms decision-making). The 2024 leak is the marketing hook — do not be persuaded by "the leak proved it."**
- Sources: Google Content Warehouse API leak analysis, May–June 2024 (Rand Fishkin / Mike King); Google's own statements downplaying the leak's ranking implications.

### 48. Dwell-time / pogo-stick manipulation
- **What it is:** Services that send "visitors" who stay on your page for 3 minutes, scroll, and click a second page, to simulate engagement.
- **2026:** Same critique as CTR manipulation, plus Google has said many times it does not use Google Analytics data for ranking. There is no verified mechanism by which purchased dwell time reaches a ranking system.
- **VERDICT: MYTH + DANGEROUS (AdSense invalid-traffic exposure, corrupted analytics)**

### 49. Fake reviews and review gating
- **What it is:** Buying reviews, or only soliciting reviews from people who first said they were happy.
- **2026:** FTC rule on fake and deceptive reviews took effect **2024-10-21**, with civil penalties per violation. Google, Amazon and Yelp all run detection. Review gating violates Google Business Profile policy.
- **Applicability here:** low direct relevance (no local business, no product yet), but relevant the moment any digital product or cookbook ships.
- **VERDICT: DANGEROUS — risk: FTC civil penalties, not just a platform slap.**

### 50. Hacked-site and "SEO poisoning" links
- **What it is:** Buying links that turn out to be injected into hacked WordPress sites — often sold unwittingly as "aged high-DA links."
- **2026:** These get cleaned up (link vanishes, money gone), the host site gets a "hacked content" action, and the pattern is a strong spam signal in your profile.
- **VERDICT: DANGEROUS + fraud risk (you're buying a crime you didn't know you were buying)**

---

# SECTION 3 — WIDELY REPEATED SEO MYTHS

Each entry: what people claim → what the evidence says → where the correction comes from.

### 51. "Bounce rate is a ranking factor"
- **Claim:** Reduce bounce rate and you rank higher; a bounce rate above 70% hurts SEO.
- **Evidence:** Google does not use Google Analytics data for ranking. Gary Illyes, May 2015: "we don't use analytics/bounce rate in search ranking." John Mueller, office-hours 2022-06-12: "there's a bit of a misconception here that we're looking at things like the analytics bounce rate when it comes to ranking websites, and that's definitely not the case." Google cannot even see bounce rate for the majority of sites.
- **What's true underneath:** click behaviour *inside Google's own results* (NavBoost-style signals) is a different thing from Analytics bounce rate. Conflating them is the source of the myth. Also, for a recipe site a "bounce" is often a satisfied user who got the number they came for.
- **VERDICT: MYTH**
- Source: [Search Engine Journal ranking-factors series — Bounce Rate](https://www.searchenginejournal.com/ranking-factors/bounce-rate/)

### 52. "There is an optimal keyword density (1–3%)"
- **Claim:** Hit 2.5% keyword density for best rankings. Sold by SurferSEO-style scoring tools and every "SEO checklist."
- **Evidence:** Google has never confirmed a density target; Matt Cutts addressed this in a 2011 Webmaster Help video saying that after the first few mentions, additional repetition gives no benefit and eventually triggers keyword-stuffing detection. Modern retrieval is embedding-based, not term-frequency counting.
- **What's true underneath:** the topic should obviously be *present* on the page. That's it.
- **VERDICT: MYTH**

### 53. "LSI keywords"
- **Claim:** Sprinkle "LSI keywords" (latent semantic indexing terms) and Google understands your topic better. Whole tools are sold on this ("LSIGraph").
- **Evidence:** John Mueller, on X/Twitter, has stated flatly that there is no such thing as LSI keywords. Latent Semantic Indexing is a real 1988 information-retrieval technique patented by Bellcore, mathematically unsuited to a web-scale corpus, and Google does not use it. Bill Slawski (Go Fish Digital, d. 2022) documented this repeatedly from the patent literature.
- **What's true underneath:** covering related concepts and entities genuinely helps. That's semantic coverage, not "LSI."
- **VERDICT: MYTH (the term is fake; the underlying advice is coincidentally okay)**

### 54. "Domain Authority is a Google metric"
- **Claim:** "You need DA 40 to rank." Agencies price links by DA.
- **Evidence:** Domain Authority is a **Moz** product metric, launched ~2011, predicting ranking ability on a 0–100 log scale. Ahrefs' DR, Semrush's Authority Score and Majestic's Trust Flow are competing third-party inventions. Google has repeatedly said it has no "domain authority score" it exposes; Mueller has called the concept a made-up metric that people confuse with Google's internal signals.
- **Nuance:** Google *does* have site-level quality signals (the 2024 API leak referenced `siteAuthority`), but it is not Moz DA and is not visible to anyone.
- **Why it matters here:** the entire paid-link market prices inventory in DA/DR, and DA/DR are trivially inflatable. "DA 60 link for $200" is a number the seller manufactured.
- **VERDICT: MYTH (as a Google metric) / useful-but-crude as a third-party comparison tool**

### 55. "The Google Sandbox"
- **Claim:** New domains are held back from ranking for 3–12 months no matter what.
- **Evidence:** Google has consistently denied a deliberate sandbox filter (Mueller, many times). What is observably real: new sites have no link graph, no click history, no brand signals, and Google needs time to gather quality data — so there *is* a real ramp-up period that feels identical to a sandbox from the outside.
- **Why the distinction matters here:** it is the difference between "wait it out, nothing I do matters" (wrong, and paralysing for a near-zero-traffic site) and "the ramp is caused by missing signals I can go and create."
- **VERDICT: MYTH (as a deliberate penalty box) — but the observed delay is real and has a different cause.**

### 56. "Posting frequency is a ranking factor"
- **Claim:** Publish 3x/week (or daily) and Google rewards you.
- **Evidence:** Google has said many times that publishing frequency is not a ranking factor. Mueller: publishing more doesn't make a site rank better; publishing garbage more often makes it worse. What *is* real is **freshness** for query classes that deserve freshness (news, prices, "best X 2026") — grocery-price content genuinely has a freshness component.
- **Danger:** this myth is the direct on-ramp to scaled content abuse (item 25). "Publish more" is the single most expensive wrong belief a solo operator can hold.
- **VERDICT: MYTH — with a real, narrow freshness exception that applies to price data specifically.**

### 57. "There is a minimum word count (1,500 / 2,000 / 3,000 words)"
- **Claim:** Long posts rank; anything under 1,000 words won't.
- **Evidence:** Mueller, 2019 and repeatedly since: "word count is not a ranking factor." The correlation studies people cite (Backlinko, HubSpot) measure that comprehensive pages on competitive topics tend to be long — reversing that into a rule produces padding, which core updates target.
- **VERDICT: MYTH**

### 58. "Duplicate content is penalised"
- **Claim:** Reusing your own text, or having similar pages, triggers a penalty.
- **Evidence:** Google's own Search Central blog post "Demystifying the duplicate content penalty" (2008-09) states there is no such penalty; duplicates are *filtered/canonicalised*, not punished. Penalties apply only to deliberately deceptive scraping and value-free republishing.
- **Practical relevance here:** a recipe site reusing standard ingredient tables, nutrition disclaimers, or method boilerplate across articles is fine. Republishing an article verbatim on Medium is fine. Being outranked by a scraper is a canonicalisation problem, not a penalty.
- **VERDICT: MYTH**
- Source: [Google Search Central, 2008-09](https://developers.google.com/search/blog/2008/09/demystifying-duplicate-content-penalty)

### 59. "Meta keywords tag matters"
- **Claim:** Fill `<meta name="keywords">`.
- **Evidence:** Google publicly announced it does not use the meta keywords tag in web ranking — Search Central blog and video, **September 2009**. Bing has said the same, and has additionally said it can be used as a *spam* signal. Sixteen years later this is still on "SEO checklist" PDFs.
- **VERDICT: MYTH**

### 60. "You must submit your site to search engines"
- **Claim:** Submit to Google, Bing, and "500 search engines" (a $9 gig).
- **Evidence:** Google discovers via crawling and sitemaps; the old "Add URL" form is long gone. Search Console URL Inspection → Request Indexing exists and is useful for *individual new/updated URLs*, and the Indexing API exists for narrow content types (job postings, livestreams). Bulk "submit to 500 engines" services are pure fraud — there aren't 500 search engines.
- **What's real:** submit an XML sitemap in Search Console and Bing Webmaster Tools once. IndexNow (Bing/Yandex/Naver, and supported natively by Cloudflare) is real and free.
- **VERDICT: MYTH (paid submission) / WORKS (sitemap + IndexNow, five-minute one-time setup)**

### 61. "You need to disavow toxic backlinks regularly"
- **Claim:** Sold by tools with "toxic link" scores (Semrush, SEMrush-alikes) as a monthly hygiene ritual.
- **Evidence:** Mueller: "I would really only use that if you have a manual spam action." Gary Illyes at PubCon: "If it were up to me, I would do away with the disavow link tool because, often enough, it hurts more than it helps many sites." Google ignores unnatural inbound links algorithmically. Mueller reconfirmed the narrow use case as recently as March 2026.
- **Real harm:** over-disavowing removes legitimate links. There is a documented case study of a site recovering only after *deleting* a 15,000-domain disavow file.
- **VERDICT: MYTH — use only with an active manual action for unnatural links.**
- Source: [GSQI disavow case study](https://www.gsqi.com/marketing-blog/google-disavow-file-case-study/); [SEJ Mueller transcript](https://www.searchenginejournal.com/google-john-mueller-disavow-tool/305507/)

### 62. "Social signals are a direct ranking factor"
- **Claim:** Likes, shares and follower counts feed Google's ranking.
- **Evidence:** Matt Cutts explicitly addressed this in a 2014 video saying Google does not use Facebook/Twitter social signals as ranking signals, primarily because Google's crawl access to those platforms is unreliable and blocked. Mueller has repeated this many times since.
- **What's true underneath:** social distribution produces links, brand searches, and traffic — all of which *do* matter. The causation runs through second-order effects, not a "shares" counter.
- **VERDICT: MYTH (direct) / real (indirect)**

### 63. "Nofollow links are worthless"
- **Claim:** Don't bother with nofollow links, they do nothing.
- **Evidence:** Since **2019-09-10** Google treats `nofollow`, `ugc` and `sponsored` as **hints**, not directives — Google may choose to use them for crawling and ranking (crawl/indexing use started 2020-03-01). Beyond that, nofollow links from real sites send real humans, and referral traffic is the point.
- **Practical relevance here:** almost every link this site can realistically earn early — Reddit, Pinterest, Wikipedia, most news sites' outbound links, Medium — is nofollow. Believing this myth means concluding the only reachable channels are worthless.
- **VERDICT: MYTH**
- Source: [Google Search Central: Evolving nofollow](https://developers.google.com/search/blog/2019/09/evolving-nofollow) (2019-09-10)

### 64. "AI content is automatically penalised"
- **Claim:** Google detects and demotes AI writing.
- **Evidence:** Google's guidance (Search Central, **2023-02-08**, "Google Search's guidance about AI-generated content") states that appropriate use of AI is not against guidelines; the reward is for quality regardless of production method. This was reaffirmed in the March 2024 policy update: the violation is *scaled content abuse*, defined by intent and value, not by authorship tool. Third-party "AI detectors" are unreliable and Google does not use them.
- **The other half of the truth:** in practice, sites that publish AI content at volume with no original value have been hit hard (August 2025 spam update). The demotion is real; the *reason* is not "AI."
- **VERDICT: MYTH as stated — but do not read this as "AI content is safe." The correct statement is: AI is not the trigger, valuelessness at volume is.**

### 65. "E-E-A-T is a score Google assigns you"
- **Claim:** Improve your EEAT score. Agencies sell "EEAT audits" with numeric scores.
- **Evidence:** E-E-A-T is a concept in the **Search Quality Rater Guidelines** — a document for the ~16,000 human contractors who rate results to evaluate algorithm changes. Raters' scores do not feed back into any individual site's ranking. Google (Mueller, Illyes, and Search Liaison Danny Sullivan) has stated repeatedly there is no EEAT score.
- **What's true underneath:** Google builds *proxies* for the qualities E-E-A-T describes (author identification, first-hand experience, citation of sources, site reputation). Doing the underlying things helps. Buying an "EEAT score audit" does not.
- **Relevance here:** the honest EEAT play for this site is first-hand experience and original data with a real named author — which is exactly what the existing author-entity schema work (commit cbb19ff) is for.
- **VERDICT: MYTH (as a score) / the underlying qualities genuinely matter**

### 66. "PageRank / toolbar PR still matters"
- **Claim:** Chase high-PR links.
- **Evidence:** Google stopped updating Toolbar PageRank publicly in December 2013 and removed it entirely in **March 2016**. Internal PageRank still exists in some form; the public number does not, and any tool claiming to show your PageRank is inventing it.
- **VERDICT: MYTH (anything sold as "PR5 link" in 2026 is fabricated)**

### 67. "Google penalises you for having ads / affiliate links"
- **Claim:** Monetising hurts rankings.
- **Evidence:** No such penalty. What exists: the Page Layout / "top heavy" algorithm (2012) targeting ads above the fold, Core Web Vitals impact from ad scripts, and the thin-affiliate spam policy for pages that are just a feed of affiliate offers with no added value.
- **VERDICT: MYTH — with real, separate concerns about layout, speed, and thin affiliate pages.**

### 68. "More indexed pages = more traffic"
- **Claim:** Get every page indexed; index bloat is good.
- **Evidence:** Post-Helpful-Content-Update thinking runs the other way: site-level quality assessments mean a large tail of low-value indexed pages can drag down the whole site. Pruning has become a documented recovery lever.
- **VERDICT: MYTH (and actively inverted since 2022)**

### 69. "Google rewards exact keyword-matched H1s / URLs / alt text"
- **Claim:** Keyword must appear in H1, URL slug, first paragraph, alt text, and meta description.
- **Evidence:** URL keywords are a "very small" factor per Mueller (2020s statements); alt text is primarily an accessibility and Image Search feature; meta description is not a ranking factor at all (Google has said this since 2009) though it affects CTR. H1s help structurally, not magically.
- **VERDICT: MYTH in checklist form / mildly true as ordinary good structure. See also the food-blog "first 100 words" superstition, item 76.**

---

# SECTION 4 — SUPERSTITIONS AND CARGO-CULT PRACTICE IN THE FOOD-BLOG WORLD

This is the folklore layer. Much of it is passed between food bloggers in Facebook groups and paid courses, with no platform source and no test behind it. Where I could find no source, I say so rather than inventing one.

### 70. Pinning schedules ("pin exactly 5x/day at 15-minute intervals")
- **Claim:** There is a correct daily pin volume, and exceeding or missing it suppresses your account. Numbers circulated range from 5 to 50/day depending on which year's course you bought.
- **Reality:** Pinterest's own creator guidance has never published a required number. What Pinterest *has* said is to publish consistently and prioritise new content over repetition. Every specific number you see (5/day, 15-minute spacing, 25/day) comes from scheduling-tool marketing (Tailwind), not from Pinterest.
- **Any real basis?** Partial. Consistency is real; the specific numbers are invented. The historical "pin 30x/day" advice from the 2016–2018 Tailwind era is now actively harmful — it's the repetitive-pinning behaviour Pinterest discourages.
- **VERDICT: MYTH (specific numbers) / consistency itself is SITUATIONAL and real**

### 71. Pinterest "fresh pin" lore
- **Claim:** Pinterest only counts "fresh pins" — a brand-new image never uploaded before — and repins are worthless. Extended folklore: changing the text overlay makes it fresh; changing the filename makes it fresh; the same image to a different board counts as fresh.
- **Reality:** "Fresh pin" is a real term Pinterest itself used in creator guidance around 2020, meaning a new image/video Pinterest hasn't seen. Pinterest genuinely does prioritise new content. But the folklore built on top of it — the filename trick, the "1px change" trick, the exact refresh ratios — has no Pinterest source and reads as tool-vendor and course-seller content.
- **Applicability here:** the site's pin pipeline generates `{slug}_v1-v4.jpg` variants, which is the *defensible* interpretation: genuinely different designs, not micro-tweaks of one image. That is the right side of this line.
- **VERDICT: SITUATIONAL — the core (Pinterest prefers new images) is real and platform-sourced; the specific rituals around it are folklore. Note that most "2026 Pinterest algorithm" articles are themselves the folklore, not evidence.**

### 72. "Best time to post" charts
- **Claim:** Post at 9:14pm EST Tuesday. Every social tool publishes a heatmap.
- **Reality:** These charts are aggregate averages across millions of unrelated accounts, and the platforms that matter most here (Pinterest, and Google) are **not chronological**. Pinterest is a search-and-recommendation surface where a pin's life is measured in months; posting time is nearly irrelevant. On genuinely chronological or velocity-based surfaces (Reddit, X) timing does matter, and there the right answer comes from your own audience data, not from a generic chart.
- **VERDICT: MYTH for Pinterest / SITUATIONAL for Reddit and X (where early velocity is a genuine ranking input)**

### 73. Hashtag counts ("use exactly 11 hashtags" / "30 or nothing")
- **Claim:** Instagram rewards a specific hashtag count; Pinterest hashtags help discovery.
- **Reality:** On **Pinterest, hashtags were deprecated** — Pinterest stopped treating them as functional and told creators to stop using them (around 2021); they now do nothing. On **Instagram**, Adam Mosseri stated publicly (2024) that hashtags do not meaningfully help reach and that Instagram removed hashtag *following*. The "exactly 11" number originates from a single 2017 TrackMaven/HubSpot correlation study and has been repeated ever since with no basis.
- **VERDICT: MYTH — and on Pinterest specifically it's DEAD (the feature was retired).**

### 74. "The algorithm hates links" (link penalty on social)
- **Claim:** Facebook/Instagram/LinkedIn suppress posts containing external links; put the link in the first comment.
- **Reality:** This one is genuinely mixed and worth stating carefully.
  - **True-ish:** platforms optimise for on-platform dwell time, and link posts empirically underperform native content. That is a *ranking preference*, not a punitive penalty, and it is real.
  - **False:** the specific folk remedy — "link in first comment" — has been repeatedly tested by social teams with no consistent lift, and LinkedIn's own engineers have publicly said there is no explicit link demotion. Meta has never confirmed a link penalty.
  - **Pinterest is the opposite case:** Pinterest is the one major social platform *built* on outbound links; a pin without a destination URL is the underperformer there.
- **VERDICT: SITUATIONAL — the underperformance of link posts is real on Meta/LinkedIn; the "first comment" workaround is folklore with no confirmed source; it does not apply to Pinterest at all.**

### 75. Engagement pods / comment pods / Facebook share threads
- **What they are:** Groups (Telegram, Discord, Facebook, Slack) that agree to like/comment/save each other's posts within minutes of publishing to fake early velocity.
- **Reality:** All major platforms class this as coordinated inauthentic engagement. Instagram's systems detect the pattern (same accounts, same order, same timing) and have been reported to reduce reach for participants. The engagement is also worthless commercially — pod members are not customers.
- **VERDICT: DANGEROUS — risk: reach suppression and, on repeat offence, account action. Also largely ineffective, so it's the worst of both worlds.**

### 76. "Keyword in the first 100 words"
- **Claim:** Google needs the target keyword within the first 100 (or 150) words.
- **Reality:** Folklore. No Google statement supports a word-position rule. Some Yoast/RankMath scoring rules encode it, which is why it feels official — those are the plugin's opinions, not Google's. What's real is much weaker: the opening should make the page's topic obvious to a reader and to an extraction model.
- **VERDICT: MYTH — but harmless, because the underlying instinct (say what the page is about, early) is good writing anyway.**

### 77. The long recipe-blog intro
- **Claim (from bloggers):** Google requires length; the story is needed for SEO.
- **Claim (from readers):** It's pure ad-impression farming.
- **What's actually true — three separate real reasons, none of which is "Google requires length":**
  1. **Copyright.** In US law a bare list of ingredients is not copyrightable (*Publications International v. Meredith Corp.*, 88 F.3d 473, 7th Cir. **1996**). The surrounding narrative and substantial explanation is the copyrightable expression. Bloggers were advised to write narrative partly so scrapers copying the recipe would be committing an infringement they could act on.
  2. **Ad RPM.** Longer pages hold more ad slots and more viewable impressions. Real, and the reason display-ad-funded sites drifted longer.
  3. **Genuine topical coverage.** Answering "can I substitute X", "why did mine fail", "how do I store it" genuinely adds search-relevant substance — this is the part that helps, and it is not the same thing as a grandmother anecdote.
- **2026 twist:** Google's core updates and AI Overviews have made *padding* actively costly; jump-to-recipe, structured Recipe schema, and answering the question fast now win. The long-intro convention is a legacy of 2015–2020 conditions.
- **Applicability here:** Strongly relevant. This site's value is a *number* — cost per gram of protein. Burying it is the single worst thing it could copy from the food-blog convention.
- **VERDICT: DEAD as an SEO tactic / real for the copyright and ad-revenue reasons / MYTH that Google requires it**

### 78. "Post the recipe card only after 300 words or Google won't index it"
- **Claim:** Circulated in food blogger Facebook groups.
- **Reality:** Folklore, no source found. Google's recipe structured-data documentation has no word requirement. What Google's recipe guidance *does* require is valid `Recipe` schema with the required fields.
- **VERDICT: MYTH (folklore, no source found)**

### 79. "You must post daily on Pinterest or the algorithm forgets you"
- **Claim:** Missing days causes decay that takes weeks to recover.
- **Reality:** Folklore, no Pinterest source found. Pinterest is a search index; existing pins keep surfacing. What *is* real is that Pinterest rewards accounts producing new content and that impressions do fall when publishing stops — but there is no documented "decay penalty" or recovery period.
- **VERDICT: MYTH (folklore, no source found) — but note the site's *actual* Pinterest problem in July 2026 was diagnosed as spam-account contamination and domain-claim issues, not pinning cadence. Fixing cadence would not have fixed that.**

### 80. Follow/unfollow (and its Pinterest cousin, mass-following)
- **Claim:** Follow 100 accounts/day in your niche; a percentage follow back; unfollow after 3 days; repeat.
- **Reality:** Works mechanically to inflate a follower number; produces an audience of people who followed reflexively and will never click. Instagram and Pinterest both rate-limit and action aggressive follow churn; automation tools for it violate both platforms' ToS. On Pinterest specifically, followers barely matter — Pinterest distribution is search/interest-based, not follower-based.
- **VERDICT: DANGEROUS (ToS violation, action risk) + pointless on the platform that matters most here.**

### 81. "Group boards are the key to Pinterest growth"
- **Claim:** Join 50 group boards, pin to all of them.
- **Reality:** This was genuinely true circa 2015–2018. Pinterest deprioritised group boards after abuse; multiple Pinterest communications through 2019–2021 emphasised that pinning the same content across many boards is not rewarded. Most large group boards are now spam-choked and dead.
- **VERDICT: DEAD (genuinely worked once, mechanism removed)**

### 82. "Tailwind Tribes / Communities are essential"
- **Claim:** Reciprocal repin communities inside Tailwind drive traffic.
- **Reality:** Tailwind Communities is the Pinterest-flavoured version of a share network (item 8). Repins from other creators are exactly the low-value repetitive distribution Pinterest deprioritised. Tailwind's own product emphasis moved away from it.
- **VERDICT: DEAD**

### 83. "Nofollow all outbound links to preserve link juice" (PageRank sculpting)
- **Claim:** Don't leak authority; nofollow your external links.
- **Reality:** Matt Cutts killed PageRank sculpting publicly in **June 2009** — nofollowed links still consume their share of PageRank, so sculpting achieves nothing. Linking generously to authoritative sources is standard good practice and is what a data-citing site should do.
- **Relevance here:** a nutrition-per-dollar site *should* be linking out to USDA FoodData Central and BLS price series. Hoarding is both useless and reduces credibility.
- **VERDICT: MYTH (debunked by Google in 2009, still repeated)**

### 84. "Deleting old posts / republishing with a new date boosts rankings"
- **Claim:** Change the date to today and Google re-ranks you as fresh.
- **Reality:** Date manipulation without content change is a known pattern; Google's documentation on dates warns against artificially changing dates, and news-oriented systems check consistency between visible date, structured data, and actual content change. Genuinely updating content and then updating the date is legitimate and effective.
- **VERDICT: MYTH (date-only) / WORKS (genuine refresh — and for grocery-price content, genuinely refreshing prices is one of the strongest legitimate moves available here)**

---

# SECTION 5 — GENUINELY WEIRD BUT REAL TACTICS THAT WORKED FOR SOMEBODY

Documented cases, with sources. These are the "stupid ideas that worked" the owner asked to see. Several are unusually well-matched to a budget-food data site — noted where so.

### 85. Give away the whole product as a free PDF — *Good and Cheap* (Leanne Brown)
- **What happened:** Leanne Brown's NYU Food Studies master's thesis became a cookbook designed for a $4/day SNAP budget. She released the **complete PDF for free**, permanently. It went viral, then a Kickstarter to fund a print run asked for $10,000 and raised **$144,681 from 5,636 backers** — at the time the most-funded cookbook on Kickstarter. The free PDF has been downloaded **over 15 million times**, and the project produced a Hachette book deal, NPR coverage, and a Fortune "Women Innovators in Food & Drink" listing (2015).
- **Why it worked:** the giveaway *was* the marketing; the audience (people on SNAP) could not have paid, so free cost nothing in revenue and bought enormous distribution and moral authority.
- **Applicability here:** Extremely high — this is the single closest documented analogue to this site's exact niche and audience. The existing lead magnet is the seed of the same idea at 1% of the ambition.
- **Effort:** Very High (it is a book)
- **VERDICT: WORKS — best-matched documented precedent in this report.**
- Sources: [Kickstarter project page](https://www.kickstarter.com/projects/490865454/good-and-cheap); [leannebrown.com](https://leannebrown.com/good-and-cheap-2/); [NPR, 2015-07-27](https://www.npr.org/sections/thesalt/2015/07/27/426761037/cheap-eats-a-cookbook-for-eating-well-on-a-food-stamp-budget)

### 86. The public self-experiment — the One Dollar Diet Project
- **What happened:** In September 2008 two California high-school teachers, Christopher Greenslate and Kerri Leonard, ate on **$1/day each for a month** and blogged it daily. The blog drew national press including the New York Times, and produced a book, *On a Dollar a Day* (Hyperion, 2010), plus speaking invitations up to Harvard Law School's food law programme (2010).
- **Why it worked:** a constraint the reader can immediately picture, with a running daily narrative that gives journalists a story arc and a natural "how did it end" hook.
- **Applicability here:** Very high, and it's the format that gives the site's dataset a human spine. The obvious 2026 version: run the site's own cost-per-nutrient rankings as a lived 30-day experiment and publish the receipts.
- **Effort:** Medium (30 days of real life + writing)
- **VERDICT: WORKS**
- Sources: [Hachette book page](https://www.hachettebookgroup.com/titles/christopher-greenslate/on-a-dollar-a-day/9781401395001/); [Harvard Crimson, 2010-11-02](https://www.thecrimson.com/article/2010/11/2/food-law-greenslate-school/)

### 87. "I did X for 30 days"
- **The format:** Matt Cutts' TED talk "Try something new for 30 days" (2011) popularised it; Morgan Spurlock's *Super Size Me* (2004) is the food-world archetype; the format is now a staple of YouTube and blogging.
- **2026:** The format is saturated as generic content, but still works when the X is (a) specific, (b) verifiable, and (c) has a number attached. "I ate the 10 cheapest protein sources for 30 days and tracked cost, weight, and bloodwork" is a fundamentally different pitch from "I tried meal prepping."
- **Applicability here:** High. It is the cheapest way to convert a spreadsheet into something a person will share.
- **Effort:** Medium
- **VERDICT: SITUATIONAL — works with a hard verifiable constraint, dead as a generic format.**

### 88. Radical transparency / open metrics
- **Documented cases:** Buffer published every employee's salary and its revenue dashboard publicly from **2013**, and repeatedly cited it as its single largest inbound-press driver. Groove HQ's "Journey to $100k/month" blog took them from ~5,000 to over 250,000 monthly readers (their own published retrospectives, 2013–2016). Baremetrics ran "Open Startups" publishing live MRR. Pat Flynn's monthly income reports built Smart Passive Income.
- **2026:** Still works, with an important caveat: transparency posts are now a genre, so *zero* is the interesting number. A near-zero-traffic site publishing its actual numbers honestly is more novel in 2026 than a successful one doing it.
- **Applicability here:** Real, cheap, and unusually well-suited — "I built a nutrition-cost database and got 40 visitors a month, here's everything" is a legitimately interesting post, and it costs nothing but ego.
- **Risk:** it is a public commitment; you cannot un-publish credibly, and it invites scrutiny of every number (this site already has a documented incident of shipping a wrong ratio in outward copy).
- **Effort:** Low
- **VERDICT: WORKS (SITUATIONAL on the operator's tolerance for publishing failure)**

### 89. Public failure posts / post-mortems
- **What it is:** Publish the thing that went wrong, in detail. The Reddit-ban post-mortem, the "my SEO strategy failed" post, the shutdown post-mortem genre on Indie Hackers and Hacker News.
- **Why it works:** failure posts outperform success posts on Hacker News, Reddit and LinkedIn because they are rarer and lower-status to write, which reads as honest.
- **Applicability here:** There is already material — the r/EatCheapAndHealthy ban during a going-viral post (July 2026), and the Pinterest zero-impressions diagnosis (spam contamination on the account + a domain-claim trap). Both are genuinely useful writeups other food bloggers would circulate. This is unusual: most sites have to *cause* a failure to write one.
- **Effort:** Low
- **VERDICT: WORKS**

### 90. Dataset release (open data as a link magnet)
- **What it is:** Publish the underlying data, with a license and provenance, on Kaggle / GitHub / Zenodo / data.world, and let researchers, journalists and students cite it.
- **Documented mechanism:** Zenodo mints a DOI, which makes a dataset citable in academic literature; Kaggle datasets rank in Google and get used in tutorials; well-structured public datasets get picked up by Wikipedia, journalism, and now by LLM training and retrieval.
- **Applicability here:** This is the strongest structural fit in the report, and the repo shows the work is **already 80% done**: commit `f443e10` built a Frictionless `datapackage.json` covering all 22 CSVs — 474 rows, 151 described fields, sha256 per file — explicitly because "licensing was the gate on every dataset-hosting surface (Kaggle, GitHub, Zenodo all require a declared license at upload)." Commit `207442c` then reverted the CC BY 4.0 declaration by owner decision, because CC BY is an irreversible public commitment.
- **Honest statement of the tension:** the dataset play requires a license, and a license is a permanent giveaway. Those two facts cannot be reconciled by cleverness. A more restrictive license (CC BY-NC, or CC BY-ND) is accepted by Zenodo and data.world though not by all surfaces, and is the middle path that exists — but that is a decision, not a hack.
- **Effort:** Low remaining (the metadata is built)
- **VERDICT: WORKS — gated entirely on a licensing decision the owner has already declined once.**

### 91. Open-sourcing the tooling
- **What it is:** Release the *code* rather than the data — the scraper, the cost-per-nutrient calculator, the pipeline.
- **Documented mechanism:** a GitHub repo that solves a real problem earns stars, HN front pages, and a permanent stream of developer traffic; the README becomes a canonical link target. Plausible Analytics, Ghost, and Umami all grew primarily this way.
- **Applicability here:** Moderate. "Compute cost per gram of protein from USDA FoodData Central + BLS prices" is a genuinely reusable tool with an obvious audience (dietitians, students, journalists, other bloggers). It also gives away less than the data does.
- **Effort:** Medium
- **VERDICT: SITUATIONAL — works if the code is actually usable by someone else, which means documentation effort, not just a `git push`.**

### 92. The free tool as a permanent traffic asset
- **What it is:** Build one small calculator or converter that ranks for a high-demand, low-competition query and earns traffic for years. Ahrefs documents this as a deliberate strategy: "some of the highest-traffic pages on the internet aren't articles — they're tools."
- **2026:** Works, but harder than in 2018 — AI Overviews now answer simple conversion queries directly, so the surviving tools are the ones with a *stateful, personalised, or multi-input* result an AI summary can't replace.
- **Applicability here:** High and specific. A "what's the cheapest way to hit 100g of protein today at my store" calculator is multi-input, personal, and sits on data the site already owns. Note the site already shipped `src/pages/embed/[slug].astro` — the embed surface exists.
- **Effort:** Medium
- **VERDICT: WORKS (SITUATIONAL on the tool being non-trivially interactive)**
- Source: [Ahrefs, "The Free Tools SEO Strategy"](https://ahrefs.com/blog/the-free-tools-seo-strategy/)

### 93. The public leaderboard / always-updated ranking
- **What it is:** A single URL that is *the* live ranking of something, updated forever. Nomad List, Indie Hackers' revenue leaderboard, "the cheapest X index."
- **Why it works:** a leaderboard is a link target that stays valid, gets bookmarked, gets cited as "according to the X index," and gives journalists a number to quote. It also naturally regenerates freshness signals.
- **Applicability here:** Very high — "The Protein Per Dollar Index, updated monthly" is a named, quotable, citable object in a way that "our article about cheap protein" is not. Naming the index is most of the work.
- **Effort:** Medium (the data exists; the discipline of monthly updating is the real cost)
- **VERDICT: WORKS**

### 94. Manufactured controversy / taking a side in a live fight
- **Documented case (in this exact niche):** **Recipeasly**, launched February 2021 to strip ads and "life stories" from recipe blogs, was destroyed by food-blogger backlash and taken offline *within hours*, with a public apology. The food bloggers who articulated the counter-argument got national press coverage (TODAY, Daily Dot, Uproxx) out of it.
- **Why it worked for the bloggers:** they weren't manufacturing anything — a real fight arrived and the people with a clear, quotable position got the coverage.
- **2026:** Works, and it is high-variance. Picking a fight deliberately can backfire permanently; being *ready with a position* when a fight arrives is the safer version.
- **Applicability here:** Moderate. This site has natural positions on live fights (ultra-processed food and cost, SNAP benefit adequacy, "eating healthy is expensive" as a claim its own data can test). Those are genuinely contestable and it has receipts.
- **VERDICT: SITUATIONAL — DANGEROUS if manufactured, WORKS if you have data and a fight comes to you.**
- Source: [TODAY, 2021-03](https://www.today.com/food/recipeasly-recipe-website-taken-down-hours-after-its-launch-t210423)

### 95. Registering a made-up holiday
- **What it is:** National Day Calendar accepts applications to register a "National X Day"; brands then get annual press and social pickup on their own day. Their client list includes L'Oréal, Microsoft, Volkswagen, Nordstrom and Verizon; applications must be in roughly 6 weeks ahead for the digital calendar and nearly a year ahead for print.
- **Reality check:** it is a paid/commercial application process, the calendar is already saturated with food days (150+ national food days exist), and a day only produces traffic if someone with reach observes it. The brands who succeed here have distribution already.
- **Applicability here:** Low. Fun, cheap-ish, almost certainly ineffective without an existing audience.
- **VERDICT: SITUATIONAL, bordering on MYTH for a zero-traffic site — the day itself generates nothing; the promotion around it does.**
- Source: [National Day Calendar — Register a National Day](https://nationaldaycalendar.com/register-a-national-day)

### 96. Wikipedia citation
- **What it is:** Get the site's dataset cited as a reference on a relevant Wikipedia article (food prices, food security, protein, SNAP).
- **2026:** Wikipedia links are `nofollow` — there is no PageRank. What they deliver is real: persistent referral clicks, extremely high trust-by-association, and — increasingly the important part — Wikipedia is heavily weighted in LLM training data and retrieval, so a Wikipedia citation propagates into AI answers.
- **Critical caveat:** self-adding your own site is a **conflict of interest** under Wikipedia policy and gets reverted, plus repeat offenders get the domain added to Wikipedia's spam blacklist — which is public, permanent, and visible to anyone evaluating the site. The legitimate route is to be good enough that someone else cites you, or to declare the COI on the talk page and let editors decide.
- **VERDICT: WORKS (as an outcome) / DANGEROUS (as a tactic you execute yourself) — risk: Wikipedia spam blacklist listing.**

### 97. The public bet / public challenge
- **What it is:** Stake something publicly: "I'll eat only foods under $0.50/100g of protein for 60 days, and if I lose I donate $500 to a food bank." Or challenge a named counterpart.
- **Why it works:** a bet has a deadline, stakes, and a resolution — three things a blog post lacks and a news cycle requires. It also creates a natural follow-up story.
- **2026:** Works, occasionally spectacularly, and is essentially free. There is no single canonical documented case in this niche; the mechanism is well-established across creator marketing (e.g. public weight/fitness challenges, "I'll shave my head at 10k subs").
- **VERDICT: SITUATIONAL — folklore-adjacent as a general claim, but the underlying mechanism (deadline + stake + resolution) is real and cheap.**

### 98. World-record attempt
- **What it is:** Guinness World Records accepts applications for new record categories; a successful attempt generates local and sometimes national press.
- **Reality:** Standard applications are free but slow (12 weeks); fast-track and evidence review cost money; Guinness rejects most proposed new categories. Food-record categories are heavily contested.
- **Applicability here:** Low — records need a physical spectacle and usually a venue and crowd. A solo operator with a spreadsheet has no natural record.
- **VERDICT: SITUATIONAL, low fit — real mechanism, wrong shape for this site.**

### 99. Petitions
- **What it is:** Launch a Change.org petition on a related cause to gather signatures (and email addresses) and press.
- **Reality:** Change.org petitions almost never achieve their stated goal, and the platform keeps the signer data — you do not get the emails. Press pickup requires an already-newsworthy cause. For a commercial site, launching a cause petition reads as exploitative if the connection is thin.
- **VERDICT: MYTH as a traffic tactic (the list-building premise is false — you don't get the list).**

### 100. Local TV news and local newspaper
- **What it is:** Pitch the local morning show or metro paper a segment: "local guy built a database of the cheapest way to eat well; here's this month's list."
- **Why it's underrated:** local news desks are chronically understaffed and actively want free, visual, seasonal consumer segments — grocery inflation is a permanent evergreen local story. Local coverage syndicates upward (a Nexstar/Sinclair/Gray station segment often runs on dozens of affiliate sites, each with a real followed link).
- **2026:** Works, is nearly free, and is skipped by almost every online-native operator because it feels unglamorous.
- **Effort:** Low-Medium (one good pitch email + willingness to be on camera)
- **VERDICT: WORKS — the most underrated item in this section.**

### 101. The stunt physical object
- **What it is:** Send something physical — a printed one-page "cheapest protein" chart, a fridge magnet, a card — to 50 named journalists, dietitians, or food-bank directors.
- **Why it works in 2026:** physical mail has near-zero competition in an inbox-saturated world; response rates for well-targeted physical mail to media contacts are dramatically higher than cold email, precisely because HARO's death proved email pitching is drowned.
- **Cost:** $50–$150 for 50 pieces.
- **VERDICT: WORKS (SITUATIONAL on having a genuinely giftable artifact — a printed chart of real data qualifies)**

### 102. Answer the question that has no good answer yet
- **What it is:** Not a stunt — a structural observation. Find questions with high real demand and *no* satisfactory page anywhere, usually because answering requires labour nobody wanted to do (compiling, computing, phoning, measuring).
- **Documented instances:** Wirecutter's entire model; *Serious Eats*' Food Lab (Kenji López-Alt) built an audience by physically running the experiments other recipe writers only asserted; Priceonomics built a content business on doing the arithmetic nobody else did.
- **Applicability here:** This is the general form of the site's only real moat. Every item in this report that scored WORKS traces back to it.
- **VERDICT: WORKS**

---

# SECTION 6 — LEFTOVERS THE OTHER SIX TERRITORIES WOULD PLAUSIBLY MISS

Modern folklore (2024–2026 vintage), scams aimed at site owners, and small real tactics that fall between the other researchers' briefs.

### 103. `llms.txt`
- **Claim:** Publish `/llms.txt` and ChatGPT, Claude, Gemini and Perplexity will find and cite you. Presented in 2025–2026 as "the robots.txt of AI" and bundled into paid "AEO" packages.
- **Evidence:** Adoption reached roughly 8.7–10% of large sites by mid-2026, and a 300,000-domain study found **no citation lift**. As of April 2026 there was no public confirmation that ChatGPT, Claude, Gemini or Perplexity consistently fetch `/llms.txt` when answering. It is a proposal (Jeremy Howard, 2024) that no major AI vendor has committed to honouring.
- **Cost:** Ten minutes. Harmless.
- **VERDICT: MYTH (no evidence of effect) — harmless to ship, but do not pay anyone for it and do not expect anything.**
- Source: [Rankability llms.txt adoption data, June 2026](https://www.rankability.com/data/llms-txt-adoption/)

### 104. "GEO / AEO / LLM optimization" as a paid service
- **Claim:** A new discipline with new levers; agencies now sell "Generative Engine Optimization" retainers.
- **Reality, split honestly:**
  - **Real:** AI answer engines cite sources, being cited drives real referrals, and citation correlates with being quotable — clear factual statements, original data, tables, named authors, and strong presence on sources the models weight heavily (Reddit, Wikipedia, news).
  - **Snake oil:** most of what is sold as GEO is (a) ordinary SEO renamed, (b) `llms.txt`, or (c) schema stuffing. There is no verified lever unique to GEO.
- **Context that matters:** Google referral traffic to publishers fell roughly 38% year-over-year as of January 2026, and zero-click rates on AI-Overview queries run ~38–45%. The pressure is real; the paid remedies mostly are not.
- **VERDICT: SITUATIONAL (the underlying practice is just "be the quotable original source") / the paid-service version is closer to MYTH.**

### 105. "Schema markup improves rankings"
- **Claim:** Add every schema type you can and rank higher.
- **Evidence:** Google has stated repeatedly that structured data is not a ranking factor; it enables **rich results** (which change CTR and eligibility, not position). Recipe schema is genuinely important for this site — not because it ranks, but because without it you are ineligible for recipe rich results and the recipe carousel entirely.
- **Cargo-cult variant:** stuffing irrelevant schema types (`Organization`, `Person`, `FAQPage`, `HowTo` everywhere). Google *removed* FAQ and HowTo rich results for most sites in August–September 2023, so much of the schema people added for it now does nothing.
- **VERDICT: MYTH (as a ranking factor) / WORKS (Recipe + Article schema for eligibility). The site's author-entity `@id` work is the correct application.**

### 106. "Core Web Vitals is a major ranking factor"
- **Claim:** Get all-green CWV and rankings jump.
- **Evidence:** Google has consistently described page experience as a **tiebreaker between similarly relevant results**, not a primary factor, and retired the standalone "page experience ranking system" documentation. In March 2024 Google replaced FID with INP.
- **What's true underneath:** speed affects conversions and bounce for real human reasons. It just isn't the ranking lever it's sold as.
- **VERDICT: MYTH (as a major factor) — real but small. An Astro site on Cloudflare is already near the ceiling here; further optimisation has almost no remaining upside.**

### 107. "Domain age is a ranking factor"
- **Claim:** Older domains rank better; buy an aged domain.
- **Evidence:** John Mueller has stated flatly and repeatedly that domain age helps nothing. What correlates is that old domains have had more time to accumulate links and brand signals.
- **VERDICT: MYTH — and it's the sales pitch attached to expired domain abuse (item 21).**

### 108. Buying an existing site with real traffic
- **What it is:** Not a hack — an acquisition. Flippa, Empire Flippers, Motion Invest; content sites in food/finance trade at roughly 25–45× monthly profit.
- **2026:** Entirely legitimate and it *does* solve the cold-start problem, unlike every grey-hat shortcut. It requires capital, and post-2023 the market is full of sites whose traffic collapsed in Helpful Content/core updates being sold on stale screenshots.
- **Applicability here:** No ad budget stated, so likely out of reach. Listed because it is the honest version of everything the expired-domain sellers pretend to offer.
- **VERDICT: WORKS — requires money, and requires traffic-verification discipline (Search Console access, not screenshots).**

### 109. Newsletter cross-promotion swaps
- **What it is:** Two newsletters of similar size recommend each other to their lists. Free. Kit (ConvertKit) has this built in as **Creator Network / Recommendations**, and Substack has Recommendations.
- **2026:** One of the genuinely best free growth mechanics still working, and structurally unlike the dead reciprocal-link schemes — there's no search engine to fool, just two humans trading audiences.
- **Applicability here:** High and already-provisioned — the site runs Kit. Frugality, meal-planning, and personal-finance newsletters are natural swap partners.
- **Effort:** Low
- **VERDICT: WORKS — highest ratio of effect to effort in this entire report for an existing-but-small list.**

### 110. Podcast guesting
- **What it is:** Appear as a guest on small and mid-size podcasts. Every episode produces show-notes links (often followed), a permanent audio asset, and an audience that heard you talk for 40 minutes.
- **2026:** Works, and the long tail of small podcasts is desperate for guests with a specific angle. "The guy who computed the cost per gram of protein for 300 foods" is a bookable angle; "food blogger" is not.
- **Effort:** Medium (pitching + recording)
- **VERDICT: WORKS**

### 111. Quora, Medium answers, and answer-site farming
- **What it is:** Answer questions with a link back. A real tactic 2014–2019.
- **2026:** Quora's traffic and quality collapsed; it's overrun with AI answers and its outbound links are nofollow. Medium changed distribution rules repeatedly and deprioritises self-promotional posts. As a *traffic* channel both are near-dead; as a *place LLMs read* they retain some weight, which is why "GEO" sellers have revived the tactic.
- **VERDICT: DEAD (as traffic) / SITUATIONAL and unproven (as AI-citation seeding)**

### 112. Newsjacking
- **What it is:** Attach your data to a breaking news cycle within hours — a USDA report, a BLS CPI food-at-home release, an egg-price spike, a SNAP policy change.
- **Why it fits here uniquely:** BLS publishes CPI on a **published schedule**, monthly. The food-at-home index is a recurring, pre-scheduled news event that produces national coverage every single month, and this site holds a dataset that speaks directly to it. Almost nothing else in growth marketing gives you a known-in-advance news cycle.
- **2026:** Works. The constraint is speed — a same-day post with a chart, or nothing.
- **Effort:** Medium (but repeatable, and the calendar is public)
- **VERDICT: WORKS — the most structurally underexploited legitimate opportunity found in this territory.**

### 113. Content pruning / noindexing thin pages
- **What it is:** Delete or noindex low-value pages to raise site-level quality assessment.
- **2026:** One of the few documented recovery levers for Helpful-Content/core-update losses, discussed in Google's own recovery guidance and in many practitioner case studies. It is the direct inverse of "more indexed pages = more traffic" (item 68).
- **Applicability here:** Relevant preventively — a site with ~180 articles from a generation pipeline should expect a tail of pages that dilute rather than add.
- **VERDICT: WORKS (as a corrective, not a growth tactic)**

### 114. The cold-email "SEO audit" pitch
- **What it is:** "Hi, I ran an audit on daily-life-hacks.com and found 47 critical errors." Always automated, always from a scraped list, the "errors" are Screaming Frog defaults (missing meta descriptions, H1 count).
- **Reality:** A lead-gen script. Some are honest agencies with bad tactics; a meaningful fraction lead to link-selling (items 37, 46).
- **VERDICT: DANGEROUS to engage with — the audit is free bait for a paid-link retainer.**

### 115. Invoice and domain-slamming scams aimed at site owners
- **What it is:** Postal or email "invoices" that look like renewals — "Domain Listing Service," "Search Engine Registration," "Annual Website Listing," "SEO Domain Registry" — typically $75–$300, for a worthless directory listing or nothing at all. Domain slamming (fake transfer/renewal notices) is a long-documented category the FTC and ICANN have both warned about.
- **Tell:** the fine print says "this is a solicitation, not a bill."
- **VERDICT: DANGEROUS — pure fraud. Never pay a website invoice you did not initiate.**

### 116. "Guaranteed page 1 rankings" gigs
- **What it is:** Fiverr/Upwork listings guaranteeing rank 1, often with "money-back guarantee."
- **Reality:** No one can guarantee Google rankings — Google states this explicitly in its own "Do you need an SEO?" documentation, which lists ranking guarantees as a top warning sign of a bad SEO. The gigs deliver ranking for a nonsense long-tail phrase nobody searches, or automated link blasts (items 41, 45).
- **VERDICT: MYTH + DANGEROUS**
- Source: [Google Search Central — "Do you need an SEO?"](https://developers.google.com/search/docs/fundamentals/do-i-need-seo)

### 117. Buying or renting an aged social account (Pinterest/Instagram)
- **What it is:** Buying an established Pinterest or Instagram account to inherit its followers and distribution.
- **2026:** Violates both platforms' terms; accounts are recovered by original owners, or banned when ownership/IP/device signals change abruptly. Followers of a repurposed account do not convert to a different niche.
- **Special relevance:** the July 2026 Pinterest diagnosis on this account involved *cloaked-redirect spam pins on the same account* — the exact contamination pattern that comes with acquired or compromised accounts. This category of problem is expensive to unwind.
- **VERDICT: DANGEROUS — risk: permanent account loss plus inherited suppression.**

### 118. Facebook Group posting
- **What it is:** Drop links in budget-cooking and frugality Facebook groups.
- **2026:** Most large groups ban links outright, and Meta downranks link posts. Where it works is the same place Reddit works — being a genuinely present member whose recommendations are asked for. It is the slowest legitimate channel in this report.
- **VERDICT: SITUATIONAL (slow, relationship-gated) / DEAD as link-dropping**

### 119. Bloglovin', Flipboard, Mix, and the aggregator graveyard
- **What it is:** Old food-blog staples for syndicating posts. Bloglovin' was a major food-blog traffic source circa 2013–2017.
- **2026:** Bloglovin' effectively wound down; Mix (StumbleUpon's successor) faded; Flipboard is alive but modest, and pivoted toward the fediverse. Still recommended in outdated food-blogger courses.
- **VERDICT: DEAD (Bloglovin', Mix) / SITUATIONAL and small (Flipboard)**

### 120. RSS / feed directory submission
- **What it is:** Submit your feed to hundreds of RSS directories.
- **2026:** Google Reader died July 2013 and the directory ecosystem died with it. The submission gigs still sell.
- **VERDICT: DEAD**

### 121. Hacker News / Lobsters submission
- **What it is:** Submit to HN and hope for the front page. A front page is worth 10k–50k visits.
- **2026:** Alive and real, but the audience is technical. Food content fails; *the dataset, the open-source tool, or the "I built a database of nutrition-per-dollar" post* would fit the HN "Show HN" format precisely. Self-submission is allowed; asking friends to upvote is the fastest way to be banned (HN's voting-ring detection is aggressive and permanent).
- **VERDICT: SITUATIONAL — real for the data/tool angle, not for recipes. The manipulation variant is DANGEROUS (permanent domain ban on HN).**

### 122. Being cited by an LLM as a byproduct of Reddit presence
- **What it is:** Reddit content is heavily weighted in both Google's ranking (post-2023 "hidden gems" and the Google–Reddit data deal, Feb 2024) and in LLM training/retrieval.
- **2026:** This is the second-order reason Reddit matters far beyond its click volume — a genuinely useful Reddit comment propagates into Google results and AI answers for years. It also means a Reddit *ban* costs more than the lost clicks.
- **VERDICT: WORKS (indirectly) — and it substantially raises the cost of item 11.**

---

# SUMMARY

**122 distinct items catalogued** (brief required at least 40).

| Section | Items | Range |
|---|---|---|
| 1. Classic growth hacks | 18 | 1–18 |
| 2. Grey-hat / black-hat still being sold | 32 | 19–50 |
| 3. Widely repeated SEO myths | 19 | 51–69 |
| 4. Food-blog superstitions | 15 | 70–84 |
| 5. Weird but real, documented | 18 | 85–102 |
| 6. Leftovers, modern folklore, scams | 20 | 103–122 |

## Everything flagged WORKS (the short list)

Broken link building (6) · Newsletter link-roundup pitching (18) · Genuine editorial guest posts (37) · Sitemap + IndexNow (60) · Genuine content refresh with honest dates (84) · Free-PDF giveaway, *Good and Cheap* model (85) · Public self-experiment (86) · Radical transparency / open metrics (88) · Public failure post-mortems (89) · Dataset release (90, licence-gated) · Free interactive tool (92) · Named live leaderboard / index (93) · Local TV and newspaper pitching (100) · Physical mail to media contacts (101) · Answering the question nobody answered (102) · Recipe/Article schema for eligibility (105) · Buying an existing site (108, needs capital) · Newsletter cross-promotion swaps (109) · Podcast guesting (110) · Newsjacking the BLS CPI calendar (112) · Content pruning (113) · Reddit presence as an LLM/Google citation source (122)

## Everything flagged DANGEROUS (do not buy, do not do)

Traffic exchanges (15) · Safelists / bought lists (16) · Reddit vote manipulation (11) · PBNs (19) · Link farms (20) · Expired domain buying (21) · 301 chains from expired domains (22) · Parasite SEO / rented subfolders (23) · Article spinning (24) · AI mass-generation at volume (25) · Doorway pages (27) · Keyword stuffing (28) · Hidden text (29) · Cloaking (30) · Negative SEO, legally (31) · Automated comment/forum spam (32) · Scraped content (33) · Translation spam (34) · Reciprocal link schemes at scale (36) · Paid guest post networks (37) · Paid links and undisclosed paid reviews (38) · .edu link schemes (39) · Web 2.0 networks (40) · Tiered link building (41) · Link insertions / niche edits (46) · CTR manipulation services (47) · Dwell-time services (48) · Fake reviews (49) · Hacked-site links (50) · Engagement pods (75) · Follow/unfollow automation (80) · Self-adding to Wikipedia (96) · Cold-email SEO audits (114) · Invoice / domain-slamming scams (115) · "Guaranteed page 1" gigs (116) · Buying aged social accounts (117) · Vote-ring manipulation on Hacker News (121)

## The three most dangerous things someone will try to sell this site

1. **"Niche edits / link insertions on high-DA food sites" (items 46 + 54 + 37).** This is the pitch most likely to arrive by cold email, and the most persuasive because it *sounds* editorial — "we'll add your link to an existing article about budget meals on a DA 60 site." It is a paid link under Google's policy, priced in a metric (Moz DA) that Google does not use and that sellers routinely inflate. Cost $80–$600 per link, and the inventory is usually the same recycled network the guest-post sellers use. Risk: unnatural-links manual action against a domain the owner is building for the long term.

2. **"The Google leak proved CTR manipulation works" (item 47).** The May 2024 Content Warehouse API leak revived an entire industry, and the pitch is technically literate enough to be convincing — it names real field names (`NavBoost`, `goodClicks`, `badClicks`). The leak confirms click features *exist*; it does not show that purchased clicks move rankings durably, and NavBoost's ~13-month aggregation window dilutes exactly the bursts these services sell. Beyond wasted money, it permanently corrupts the analytics this site needs in order to tell whether anything real is working.

3. **"Scale your content — 500 AI articles a month" (items 25 + 26 + 56).** The most dangerous because it is the closest to what this site already does legitimately, and because it wears the disguise of a myth the owner may already believe ("posting frequency is a ranking factor"). Google does not penalise AI content for being AI — it penalises *scaled content abuse*, valueless volume — and the August 2025 spam update was a penalty-only update that hit exactly this profile. The line is whether each page carries the original computed data. A pipeline that keeps that line is fine; a pipeline that crosses it takes the whole domain down, and recovery from site-level quality suppression is measured in many months of pruning.

**Runner-up worth naming:** anything involving Reddit upvotes (item 11). It is cheap, it is openly sold, and for this site specifically the downside — a permanent sitewide Reddit domain ban — would remove the channel that is currently the site's stated distribution strategy *and* the channel that feeds both Google's Reddit weighting and LLM citations (item 122).

## The genuinely promising oddity

**The BLS CPI food-at-home release as a recurring, pre-scheduled news event (item 112), fired through a named public index (item 93).**

Almost every tactic in this report competes for attention that has to be created. This one does not: the Bureau of Labor Statistics publishes the Consumer Price Index on a calendar announced a year in advance, food-at-home is a headline component, and every release produces a national "groceries cost more" news cycle whether anyone participates or not. This site owns exactly the thing that cycle lacks — a per-item, per-nutrient cost dataset that can answer "so what should people actually buy this month" within hours of the release.

Named as a standing object — *The Protein-Per-Dollar Index, updated with every CPI release* — it converts a spreadsheet into a citable thing with a beat. It gives journalists a number to quote (item 100 makes it locally pitchable), gives the site a legitimate reason to refresh dates that isn't the date-manipulation myth (item 84), gives the newsletter a monthly reason to exist, and produces the kind of quotable original data that is the only real lever behind the whole "GEO/AEO" industry (item 104).

The second oddity, one tier down and much larger: **the *Good and Cheap* model (item 85)** — give the entire thing away as a free PDF, permanently. 15 million downloads, a $144,681 Kickstarter, a Hachette book deal, and national press, all from deciding the audience could not pay anyway. It is the closest documented precedent in this exact niche, and the current lead magnet is a 1%-scale version of it.

Both of these run into the same unresolved decision the repo already surfaced today: commit `f443e10` built the full Frictionless datapackage for all 22 CSVs specifically because a declared licence is the gate on Kaggle, GitHub and Zenodo, and commit `207442c` reverted the CC BY 4.0 declaration because it is an irreversible public commitment. **The dataset play cannot be executed without resolving that.** That is a decision for the owner, not a hack — and this report deliberately does not recommend either side of it.

---

## Method note

Sources are cited with dates where a specific claim depends on them. Where a widely repeated practice had no traceable origin, it is written as "folklore, no source found" rather than given an invented citation — this applies to items 78, 79, and parts of 70, 71, 74 and 76. Several "2026 Pinterest algorithm" and "2026 SEO" articles that surfaced during research are themselves examples of the folklore layer this report catalogues, and were not treated as evidence.

Nothing in this report was implemented, and no site files, commits, or external accounts were touched.
