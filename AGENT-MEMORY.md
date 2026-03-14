# Agent Memory

## Purpose
- This file is the working memory for ongoing decisions, current priorities, verified facts, blockers, and operating assumptions.
- It complements `CLAUDE.md`, `project_context.md`, and `FOR-CLAUDE-STATUS.md`.
- Update it after major audits, decisions, priority changes, and execution milestones.

## Current Strategic Direction
- Treat the site as a digital asset and authority brand, not just a content blog.
- Primary business goal: build trusted traffic, turn it into an owned audience, and later monetize carefully through affiliate offers without hurting authority.
- Legal and brand constraint: avoid medical claims, cure language, risky YMYL framing, and other unsafe health promises.

## Current Short-Term Priority
- Priority right now is not the full long-term architecture.
- Priority right now is to restore reliable Pinterest publishing fast.
- Target: secure 2 to 3 weeks of publishable runway for Publer bulk scheduling.
- Publishing cadence confirmed by user: 5 pins per day.
- A second active priority now exists: build an automatic daily content reveal layer for `nutrition`, `recipes`, and `tips`.
- A third active priority now exists: get the live Kit signup flow working end-to-end and start the first welcome email system.
- Runway target:
  - 14 days = 70 pins
  - 21 days = 105 pins

## User Working Preferences
- Communicate with the user in Hebrew.
- The user wants the assistant to act as project manager, not just a code executor.
- The user currently has very low bandwidth and low cognitive capacity because of intense real-life stress and physical work.
- Keep asks minimal, explicit, and low-friction.
- Prefer 1 to 2 concrete tasks over long option lists.
- Default to realism and momentum over elegant architecture.
- Avoid over-engineering and avoid speculative systems that are not immediately useful.
- The user wants proactive management, parallel workstreams, and clear next actions.
- When possible, operate in parallel across:
  - infra / funnel
  - email engine
  - content engine
- The user responds best to short, decisive guidance, not long abstract framing.
- Preserve trust by being direct about what is verified, what is uncertain, and what is still blocked.

## Confirmed Operational Decisions
- The final bulk publishing file is `pipeline-data/pins-publer-final.csv`.
- Treat `pipeline-data/pins-publer-final.csv` as the final export for Publer scheduling.
- Do not treat older CSV files as the final source for publishing.
- The system should first stabilize publishing operations, then return to bigger projects like Kit migration, thank-you pages, PDF lead magnets, search, and advanced variant content.

## Confirmed Product Decisions
- The site has 3 content pillars:
  - `recipes` = traffic engine
  - `nutrition` = authority engine
  - `tips` = monetization bridge
- Category assignment should become rule-based, not ad hoc.
- Long-term email direction: move from Beehiiv to Kit because the business goal is automation, segmentation, trust-building, and affiliate nurturing.
- Beehiiv is acceptable short term if needed, but Kit is the preferred long-term audience system.

## Verified Current State
- 43 article files exist in `src/data/articles/`.
- Category split verified:
  - 12 `recipes`
  - 17 `nutrition`
  - 14 `tips`
- 43 web images exist in `public/images/`.
- 172 pin images exist in `public/images/pins/`.
- Smart Router is implemented in `functions/[[path]].js`.
- Canonical cleanup is implemented in `src/layouts/BaseLayout.astro`.
- FAQ support is implemented in `src/content.config.ts` and `src/pages/[slug].astro`.
- Newsletter forms and Beehiiv proxy are implemented in `src/components/Newsletter.astro`, `src/components/NewsletterPopup.astro`, and `functions/api/subscribe.js`.
- A unified registry now exists at `pipeline-data/content-registry.json`.
- A public registry copy now exists at `public/data/content-registry.json`.
- Offers are now defined in `pipeline-data/offers.json`.
- Email segments are now defined in `pipeline-data/email-segments.json`.
- Monetization mapping now exists at `pipeline-data/affiliate-framework.json`.
- A quality gate script now exists at `scripts/quality-gate.py`.
- A registry normalization script now exists at `scripts/normalize-content-registry.py`.
- A generated Publer builder now exists at `scripts/build-publer-final.py`.
- Event collection endpoint now exists at `functions/api/event.js`.
- `schema.sql` now includes `funnel_events`.
- Variant experience block is now implemented on article pages through `src/pages/[slug].astro`.
- `publishAt` scheduling support now exists in `src/content.config.ts`.
- A release helper now exists in `src/content/release.ts`.
- The homepage now has a client-side `Fresh Today` section in `src/components/FreshToday.astro`.
- Article pages now support scheduled visibility gates through `src/pages/[slug].astro`.
- A release inventory audit script now exists at `scripts/audit_daily_release_inventory.py`.
- The latest inventory report now exists at `pipeline-data/daily-release-inventory.json`.
- A dedicated thank-you page now exists at `src/pages/thank-you.astro`.
- Newsletter signup now redirects to `/thank-you` from `src/components/Newsletter.astro` and `src/components/NewsletterPopup.astro`.
- Newsletter signup context now passes `category`, `base_slug`, `variant_slug`, and `email_segment` through `functions/api/subscribe.js`.
- `functions/api/subscribe.js` now supports Kit-first signup handling with Beehiiv fallback if only Beehiiv credentials exist.
- A production bug was found in the Kit routing condition:
  - the code required both `KIT_API_KEY` and `KIT_FORM_ID`
  - but the intended design was to allow `KIT_API_KEY` alone and fall back to the default form ID
  - this was fixed in commit `2098906`
- Cloudflare Pages deploy for commit `2098906` completed successfully.
- The current production code should now:
  - route signups through Kit when `KIT_API_KEY` is present
  - redirect to `/thank-you`
  - use refreshed signup success copy that does not promise an immediate welcome email
- Kit API access is now verified.
- Active Kit embed forms currently available:
  - `Creator Profile` = `9195643`
  - `Creator Network` = `9195667`
- Kit custom fields created:
  - `Source`
  - `Page`
  - `Base Slug`
  - `Variant Slug`
  - `Category`
  - `Email Segment`
- Kit tags created:
  - `recipes`
  - `nutrition`
  - `tips`
  - `source-footer`
  - `source-popup`
  - `segment-recipes-breakfast`
  - `segment-recipes-main`
  - `segment-nutrition-foundations`
  - `segment-nutrition-comparisons`
  - `segment-tips-storage`
  - `segment-tips-systems`
- The final Publer runway was sanitized and rescheduled in `pipeline-data/pins-publer-final.csv`.
- `scripts/reschedule-publer-final.py` now exists to re-date the live Publer CSV quickly.
- `pipeline-data/pin-runway-audit.json` now records the latest cleanup results for the live runway file.
- A first square Kit logo asset was generated at:
  - `C:\Users\offic\.cursor\projects\c-Users-offic-Desktop-dlh-fresh\assets\kit-logo-square-800.png`

## Verified Email State
- Kit account setup exists and the API key works.
- Custom fields and tags were created successfully through the Kit API.
- No welcome email or visual automation is configured yet in Kit.
- When the user tested signup before the production Kit routing fix, Kit showed `0 subscribers`.
- The missing welcome email was not a sending bug by itself; it was also true that no welcome flow existed yet.
- The thank-you page and signup success text were rewritten to stop promising an immediate inbox message.

## Verified Gaps
- Search is not implemented in the live checked-in frontend.
- Kit migration is prepared in code and production now has `KIT_API_KEY`, but live end-to-end signup still needs to be re-tested after commit `2098906`.
- The final live publishing file is still manually curated, but we now also have a code-generated output at `pipeline-data/pins-publer-final.generated.csv`.
- The variant data model now exists in the registry, but the edge/router still does not perform HTML rewriting.
- There is not yet enough truly new, image-ready content to auto-release one new `nutrition` + one new `recipe` + one new `tip` per day.
- Current verified daily-release inventory:
  - 2 unpublished ready tips
  - 0 unpublished ready recipes
  - 0 unpublished ready nutrition posts
  - 1 unpublished draft nutrition post, but it is a hormone-balance topic and should be treated as risky
- The 2 unpublished ready tips currently do not have matching web images in `public/images/`.
- Publer setup is operational and the user confirmed that imported pins are publishing on schedule.
- Kit activation is now blocked on:
  - one successful live signup test after commit `2098906`
  - creation of the first welcome email / automation in Kit UI

## Parallel Workstreams
- `Infra / Funnel`
  - Publer publishing is operational
  - Cloudflare deploy issue was fixed
  - Kit routing bug was fixed in `functions/api/subscribe.js`
  - next check is live signup verification
- `Email Engine`
  - first-pass welcome email strategy has been drafted
  - lean Kit automation architecture has been defined
  - next step is to create one simple form-triggered welcome flow in Kit
- `Content Engine`
  - current sprint: 12 articles (4 recipes, 4 nutrition, 4 tips) defined in `pipeline-data/content-sprint-12.md`
  - avoid over-concentration on fiber; avoid risky YMYL framing; match site tone (practical, no drama)

## Current Content Sprint (12 articles)
- **Source of truth:** `pipeline-data/content-sprint-12.md`
- **Mix:** 4 recipes, 4 nutrition, 4 tips. No overlap with existing 43 articles.
- **Recipes:** easy-one-pot-chicken-and-rice-dinner, healthy-turkey-meatballs-meal-prep, sheet-pan-salmon-and-vegetables-30-minutes, easy-black-bean-tacos-weeknight-dinner. Accessible, weeknight-friendly, not silly or overcomplicated.
- **Nutrition:** how-much-protein-do-you-need-per-day, plant-based-protein-sources-complete-guide, healthy-fats-list-foods-to-eat-daily, best-breakfast-foods-for-sustained-energy. Real value; diversify away from fiber-heavy skew.
- **Tips:** kitchen-tools-that-save-time-and-money, how-to-use-leftover-rice-creative-ideas, how-to-cook-dried-beans-from-scratch, how-to-season-cast-iron-skillet-properly. Practical, no duplicate of existing storage/meal-prep/organize content.
- **Tone (all 12):** Site language (About page): practical, slightly cynical, no drama, no medical claims, no detox/cleanse, contractions, no em dashes/emojis. Recipes: realistic quantities and times. Writer: Gemini; format per `pipeline-data/gemini-article-instructions.md`.

## Publishing Recovery Sprint
- First mission:
  - audit `pipeline-data/pins-publer-final.csv`
  - audit `pipeline-data/router-mapping.json`
  - audit pin assets and article targets
  - identify blockers only
  - fix only what blocks the next 2 to 3 weeks of publishing
- Do not expand scope during this sprint unless a direct blocker is found.

## Known Risks Already Identified
- There is data drift between:
  - `pipeline-data/content-tracker.json`
  - `pipeline-data/router-mapping.json`
  - `pipeline-data/pins.json`
  - `pipeline-data/pins-publer-final.csv`
- Some scheduled rows appear to use fallback URL patterns instead of clean mapped variant slugs.
- Some copy in the final Publer CSV may violate current brand/risk rules, including terms like:
  - `detox`
  - `fat burning`
  - risky constipation/medical framing
  - kids/toddlers edge cases
- Some router mappings are incomplete for certain `v3` or `v4` variants.
- Quality gate currently reports:
  - 172 total variants
  - 150 publish-ready variants
  - 22 blocked variants
  - 0 risky scheduled rows in `pipeline-data/pins-publer-final.csv`
- Generated Publer runway currently contains 150 publish-ready rows in `pipeline-data/pins-publer-final.generated.csv`.
- The live Publer runway currently contains 146 scheduled rows from `2026-03-12` through `2026-04-10`.

## Operating Rules For Future Sessions
- Start from this file when context is thin.
- Re-read `CLAUDE.md` for project-wide rules and history.
- Use this file for current direction, active priorities, and decisions made with the user.
- Record verified facts separately from hypotheses.
- Prefer short factual updates over long narratives.
- When priorities change, update this file before continuing execution.

## Next Likely Work Order
1. Re-test live signup from production and confirm that a subscriber appears in Kit.
2. Build one lean Kit welcome flow:
   - one trigger on form `9195643`
   - one universal welcome email
   - optional branching by existing segment/category tags
3. Confirm the refreshed `/thank-you` page is live and feels on-brand.
4. Keep monitoring Publer until at least one live pin confirms board placement and normal publish flow.
5. Execute the 12-article content sprint (drafts → edit → approve → images → publish); track in `pipeline-data/content-sprint-12.md`.
6. Continue cleanup on blocked variants and high-risk topics.
