# Kit Account Checklist

Open the Kit account with the minimum setup only. Do not build extra automations yet.

## What To Create
1. One main signup form.
2. Three base tags:
   - `recipes`
   - `nutrition`
   - `tips`
3. These custom fields if Kit supports them:
   - `Source`
   - `Page`
   - `Base Slug`
   - `Variant Slug`
   - `Category`
   - `Email Segment`

## Current Account State
- Active form IDs currently available:
  - `9195643` -> `Creator Profile`
  - `9195667` -> `Creator Network`
- Current default form for backend wiring:
  - `9195643`
- Required tags and custom fields were created through the API already.

## What To Send Back
- API key or token
- whether production env vars were updated
- whether one live signup test succeeded

## Keep It Lean
- Do not recreate the frontend forms.
- Do not build a dual Beehiiv + Kit setup.
- Do not create more than one main form right now.
- We will switch the backend behind `/api/subscribe` only after one end-to-end test works.
