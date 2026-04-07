## Pinterest OAuth Demo App (Cloudflare Pages Functions)

This is a minimal app that matches Pinterest review expectations:
- Full OAuth consent screen (Authorization Code flow)
- Manual Pin selection (user picks one Pin, then clicks Publish)
- Publishes exactly one Pin via Pinterest API (Sandbox when on Trial)

### Endpoints
- `GET /api/pinterest-demo-connect` -> redirects to Pinterest consent
- `GET /api/pinterest-demo-callback` -> Pinterest redirects here with `code`
- `GET /api/pinterest-demo` -> shows connected state + dropdown + Publish button
- `POST /api/pinterest-demo-publish` -> creates the Pin (Sandbox)

### Required Cloudflare env vars (Workers & Pages -> Variables and Secrets)
- `PINTEREST_APP_ID`
- `PINTEREST_APP_SECRET`
- `PINTEREST_DEMO_BASE_URL` (example: `https://www.daily-life-hacks.com`)
- `PINTEREST_DEMO_CALLBACK_URL` (example: `https://www.daily-life-hacks.com/api/pinterest-demo-callback`)
- `PINTEREST_DEMO_COOKIE_SECRET` (random long string, used to sign cookies)
- Optional:
  - `PINTEREST_DEMO_SCOPES` (space-separated OAuth scopes)

### Pinterest Developer Portal setup
In your Pinterest app settings, add the exact Redirect URI:
- `PINTEREST_DEMO_CALLBACK_URL`

### Demo flow (what to record)
1. Open `GET /api/pinterest-demo` in AdsPower.
2. Click `Connect Pinterest OAuth` to show Pinterest consent screen.
3. After `Allow access`, you land back on `/api/pinterest-demo` (connected).
4. Choose exactly one Pin in the dropdown.
5. Click `Publish selected Pin`.
6. The result page shows `Pin ID` returned by `POST /v5/pins`.

