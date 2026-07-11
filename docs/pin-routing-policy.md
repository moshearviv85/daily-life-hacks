# Pin Routing Policy

**Status:** Checkpoint 2 **Phase B complete** — canonical HTML only + runtime 301  
**Updated:** 2026-07-11  
**Approved decisions:** Pin destinations → **301 to canonical**.

## Source of truth

`pipeline-data/pin-destinations.json`

Do **not** hand-edit derived files:
- `pipeline-data/slug-aliases.json` (derived lookup / CSV compat — **not** Astro pages)
- `pipeline-data/router-mapping.json`
- `public/data/pin-destinations-flat.json`

Update via:

```bash
npm run migrate:pin-destinations   # rebuild registry from legacy (rare)
npm run sync:pin-destinations      # after produce (from SQLite pin_briefs)
npm run derive:pin-routing         # re-derive artifacts only
```

## Runtime + build (Phase B)

| Surface | Behavior |
|---------|----------|
| Astro `getStaticPaths` | **Canonical articles only** |
| `/{canonical}/` | 200, indexable (if released) |
| `/{pin-destination}/` | **301** → canonical via `[[path]].js` + flat map |
| `/{slug}-vN/` | **301** → canonical |
| KV `external` | 302 affiliate (allowed) |
| KV `internal` leftovers | 301 → canonical |
| `dist/{alias}/index.html` | **Must not exist** (`verify-routing` fails if leaked) |

## ROUTES_KV policy

| Use | Policy |
|-----|--------|
| New pin destinations | **Do not write to KV** |
| Existing pin KV keys | Harmless; Git flat map wins first |
| External affiliate routes | **Keep in KV** |
| Bulk `kv-upload` for pins | **Deprecated** |

## Orphan aliases (185)

Imported into `pin-destinations` with `origin: legacy_seo_variant | legacy_orphan`.  
They receive **301 forever** until retired after traffic review (see orphan plan in `docs/cp2-routing-automation.md`).

## Rules

1. No manual growth of derived routing JSON.
2. Produce must run `sync_pin_destinations.py` before commit.
3. `verify:routing` + `verify:pin-destinations` must pass (`build:checked`).
4. Do not reintroduce alias pages in `getStaticPaths`.

## Related

- `docs/cp2-routing-automation.md`
- `docs/improvement-plan-continuous.md`
- Baseline: `pipeline-data/reports/routing-audit-2026-07-11.json`
