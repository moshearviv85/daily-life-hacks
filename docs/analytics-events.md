# Analytics Event Taxonomy

## Current Storage
- `subscriptions`
- `pinterest_hits`
- `funnel_events`

## Event Types
- `variant_view`
- `variant_cta_click`
- `signup_started`
- `signup_completed`
- `signup_failed`
- `lead_magnet_downloaded`
- `affiliate_click`
- `affiliate_conversion_imported`

## Required Dimensions
- `page`
- `base_slug`
- `variant_slug`
- `category`
- `source`
- `cta_variant`
- `email_segment`

## Priority Dashboards
### Traffic
- sessions by `variant_slug`
- sessions by `base_slug`
- sessions by `board`

### Conversion
- signup started by page and source
- signup completed by page and source
- CTA click rate by variant

### Quality
- engagement proxy by `email_segment`
- publish-ready variants vs blocked variants

### Monetization
- affiliate click-through rate by category
- affiliate click-through rate by variant
- future revenue import by offer and segment
