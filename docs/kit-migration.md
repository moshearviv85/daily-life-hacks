# Kit Migration

## Goal
- Move the audience engine from Beehiiv to Kit without breaking current signup flow.
- Keep the current frontend forms and replace the backend provider behind `/api/subscribe` only when credentials and forms are ready.

## Recommended Migration Order
1. Create the main Kit form and custom fields.
2. Mirror current source tracking:
   - `footer`
   - `popup`
   - `article-category`
   - `variant-slug`
   - `email-segment`
3. Create three base tags:
   - `recipes`
   - `nutrition`
   - `tips`
4. Create variant-aware tags:
   - `source-footer`
   - `source-popup`
   - `segment-recipes-breakfast`
   - `segment-recipes-main`
   - `segment-nutrition-foundations`
   - `segment-nutrition-comparisons`
   - `segment-tips-storage`
   - `segment-tips-systems`
5. Create welcome automations:
   - `fiber-foundations`
   - `recipe-weekly`
   - `kitchen-systems`
6. Add thank-you page redirect after successful signup.
7. Switch `/api/subscribe` provider from Beehiiv to Kit.

## Fields To Preserve
- `email`
- `source`
- `page`
- `base_slug`
- `variant_slug`
- `category`
- `email_segment`

## Minimum Automations
### Fiber foundations
- Day 0: welcome + what to expect
- Day 2: simple high-fiber swaps
- Day 5: best beginner recipes and articles
- Day 8: soft lead magnet CTA
- Day 12: affiliate recommendation only after value-first sequence

### Recipe weekly
- Day 0: welcome + recipe pack teaser
- Day 2: breakfast favorites
- Day 5: easy dinners
- Day 8: meal prep system
- Day 12: kitchen tool affiliate if engagement is strong

### Kitchen systems
- Day 0: welcome + checklist delivery
- Day 2: storage systems
- Day 5: food waste reduction
- Day 8: budget meal prep
- Day 12: storage container or organizer affiliate

## Switching Rule
- Do not switch production forms until:
  - Kit form exists
  - tags and automations exist
  - thank-you page exists
  - one live end-to-end signup test succeeds
