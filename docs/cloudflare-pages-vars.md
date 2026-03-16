# Cloudflare Pages: Variables for Functions (STATS_KEY)

## The problem

**Build** environment variables (Settings → Environment variables in the build section) are available only during `npm run build`. They are **not** available to Pages Functions at runtime. So `context.env.STATS_KEY` is `undefined` if you only set it there.

## The solution: Variables and Secrets (runtime)

For **runtime** (Functions like `/api/stats` and `/api/analytics`), you must set variables in:

**Workers & Pages** → select your project → **Settings** → **Variables and Secrets**

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**.
2. Click your Pages project (e.g. daily-life-hacks).
3. Go to **Settings** (tab or left menu).
4. Find **Variables and Secrets** (not “Environment variables” under Build).
5. Click **Add** (or **Add variable** / **Add secret**).
6. **Variable name:** `STATS_KEY`
7. **Value:** your secret password.
8. For a secret (recommended): choose **Encrypt** so the value is not shown in the UI.
9. Select **Production** (and Preview if you need it).
10. **Save**, then trigger a **new deployment** (e.g. push a commit or “Retry deployment”) so the new binding is applied.

After redeploying, call:

- `https://your-site.com/api/stats?key=YOUR_STATS_KEY`
- `https://your-site.com/api/analytics?key=YOUR_STATS_KEY`

## Summary

| Where | When available | Use for |
|-------|----------------|--------|
| **Build → Environment variables** | Build time only | e.g. `NODE_ENV`, build-time API keys |
| **Settings → Variables and Secrets** | Runtime (Functions) | `STATS_KEY`, `BEEHIIV_API_KEY`, etc. |

If you set `STATS_KEY` only in Build → Environment variables, the APIs will return 401 and `STATS_KEY_available_at_runtime: false`. Set it in **Variables and Secrets** and redeploy.
