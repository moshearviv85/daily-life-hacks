# Grafana + Cloudflare: traffic and visits (Daily Life Hacks)

This guide connects **Grafana** to **Cloudflare GraphQL Analytics** so you can chart requests and visits for `daily-life-hacks.com` without relying only on the Cloudflare dashboard.

## What you need

1. **Zone ID** for the domain: Cloudflare dashboard → select the zone → right column **API** section → **Zone ID**.
2. **API token** with GraphQL Analytics access. Practical minimum:
   - **Account** → **Account Analytics** → **Read**
   - **Zone** → **Analytics** → **Read** (keeps **Zone Resources** available so you can pick **Specific zone** → `daily-life-hacks.com`)
   - Reference: [Configure an Analytics API token](https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/)
3. **Grafana** (Cloud or self-hosted) with the **Infinity** data source plugin: [Infinity plugin](https://grafana.com/grafana/plugins/yesoreyeram-infinity-datasource/).

## Official Cloudflare plugin (optional)

The [Cloudflare data source for Grafana](https://grafana.com/grafana/plugins/grafana-cloudflare-datasource/) is **Grafana Enterprise**. If you do not have Enterprise, use Infinity + GraphQL below.

## Infinity data source setup

1. Grafana → **Connections** → **Data sources** → **Add data source** → **Infinity**.
2. **Authentication**: use a secure method Grafana supports (e.g. OAuth2 or headers stored in Grafana secrets). For a first test, **do not** paste the token into chat; store it only in Grafana.
3. Add a query:
   - **Type**: JSON / GraphQL (per Infinity’s GraphQL mode).
   - **URL**: `https://api.cloudflare.com/client/v4/graphql`
   - **Method**: POST
   - **Headers**: `Authorization: Bearer <YOUR_API_TOKEN>`, `Content-Type: application/json`
   - **Body**: JSON with `query` and `variables` as in the samples below.

Use Infinity’s docs for GraphQL: [Infinity GraphQL](https://grafana.com/docs/plugins/yesoreyeram-infinity-datasource/latest/graphql/).

## GraphQL samples

Endpoint (same for curl and Grafana): `https://api.cloudflare.com/client/v4/graphql`

### Visits and bytes by hour (whole zone, eyeball traffic)

Replace `YOUR_ZONE_ID` and adjust the ISO datetimes (UTC).

Use the same variable type Cloudflare shows in their tutorials: `$filter: filter` (not a long generated type name).

```json
{
  "query": "query ZoneVisitsByHour($zoneTag: string, $filter: filter) { viewer { zones(filter: { zoneTag: $zoneTag }) { httpRequestsAdaptiveGroups(limit: 500, filter: $filter) { sum { visits edgeResponseBytes } dimensions { datetimeHour } } } } }",
  "variables": {
    "zoneTag": "YOUR_ZONE_ID",
    "filter": {
      "datetime_geq": "2026-03-01T00:00:00Z",
      "datetime_lt": "2026-03-29T00:00:00Z",
      "requestSource": "eyeball"
    }
  }
}
```

### Visits for one hostname (e.g. `www.daily-life-hacks.com`)

```json
{
  "query": "query VisitsByHostHour($zoneTag: string, $filter: filter) { viewer { zones(filter: { zoneTag: $zoneTag }) { httpRequestsAdaptiveGroups(limit: 500, filter: $filter) { sum { visits edgeResponseBytes } dimensions { datetimeHour } } } } }",
  "variables": {
    "zoneTag": "YOUR_ZONE_ID",
    "filter": {
      "datetime_geq": "2026-03-01T00:00:00Z",
      "datetime_lt": "2026-03-29T00:00:00Z",
      "requestSource": "eyeball",
      "clientRequestHTTPHost": "www.daily-life-hacks.com"
    }
  }
}
```

Map the JSON path in Infinity to the array under `data.viewer.zones[0].httpRequestsAdaptiveGroups` and use field overrides so `dimensions.datetimeHour` is time and `sum.visits` is the value.

## Test from your PC (PowerShell)

Run `scripts/cloudflare-graphql-visits-sample.ps1`. It reads **`scripts/.env`** if that file exists (see below); otherwise set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` in the shell.

## Local secrets file (`scripts/.env`)

1. Copy `scripts/.env.example` to `scripts/.env` (same folder).
2. Open `scripts/.env` and set:
   - `CLOUDFLARE_API_TOKEN=` your token (no quotes unless you need them)
   - `CLOUDFLARE_ZONE_ID=` your Zone ID (UUID from the zone Overview page)
3. **Never commit** `scripts/.env` — it is listed in `.gitignore`. Keep `.env.example` committed as the empty template only.
4. **Never paste tokens into chat**, tickets, or screenshots. If a token is exposed, **revoke** it in Cloudflare and create a new one.

For Grafana, store the token in Grafana’s data source / secrets UI, not in the repo.

### Rotating after a leak

Cloudflare → **API Tokens** → revoke the old token → create a new token with the same permission rows → update `scripts/.env` and Grafana only on your machine.

## Relation to this project’s `/api/stats`

`/api/stats` (D1 + `STATS_KEY`) is **newsletter subscriptions**, not site traffic. Traffic truth for the zone stays in **Cloudflare Analytics** unless you add separate product analytics.

## Links opened in the IDE browser (workflow)

- Cloudflare: Account API tokens — `https://dash.cloudflare.com/?to=/:account/api-tokens` (requires login).
- Infinity plugin page — `https://grafana.com/grafana/plugins/yesoreyeram-infinity-datasource/`.
- Cloudflare tutorial (HTTP by hostname) — [Querying HTTP events by hostname with GraphQL](https://developers.cloudflare.com/analytics/graphql-api/tutorials/end-customer-analytics/).
