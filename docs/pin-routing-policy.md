# Pin Routing Policy

**Status:** Active freeze (Checkpoint 1)  
**Updated:** 2026-07-11  
**Approved decisions:** Pin destinations → **301 to canonical**; proceed with continuous improvement plan.

## Target end state (Checkpoint 2)

| URL type | Behavior |
|----------|----------|
| Canonical article `/{article-slug}/` | `200`, indexable, in sitemap |
| Pin destination `/{pin-slug}/` | **301** → canonical + D1 hit log before redirect |
| Build output | No static HTML clones for pin destinations |
| Source of truth | `pipeline-data/pin-destinations.json` (auto-updated by produce) |

Pinterest keeps **4+ diversified pins** per article via unique creatives + unique `url_slug` links. Uniqueness is not achieved by duplicate HTML.

## Temporary state (until Checkpoint 2 ships)

| Layer | Role |
|-------|------|
| `pipeline-data/slug-aliases.json` | Static Astro alias pages (`noindex` + canonical) |
| `pipeline-data/router-mapping.json` | Pin metadata / CSV link targets |
| `ROUTES_KV` + `-vN` fallback | Runtime proxy with `X-Robots-Tag: noindex` |

Do **not** treat these three as permanent architecture.

## Freeze rules (Checkpoint 1)

1. Do **not** manually add rows to `slug-aliases.json` unless fixing a broken live pin and documenting why.
2. Do **not** bulk-upload new `ROUTES_KV` entries as a parallel source of truth.
3. New pin destinations must go through the pipeline scripts; after Checkpoint 2 they must land in `pin-destinations.json` only.
4. Do **not** remove existing aliases in production until runtime 301 coverage is verified.
5. `npm run verify:routing` and `npm run verify:pin-destinations` must pass before deploy (`build:checked`).

## Preview of scheduled articles

- **Production (`www.daily-life-hacks.com`):** date gate enforced; no client-side password bypass.
- **Staging / Pages preview hosts:** scheduled content may be shown unlocked for review (hostname-based only).

## Related docs

- `docs/improvement-plan-continuous.md` — full checkpoint plan
- `docs/project-architecture-audit-2026-07-11.md` — audit baseline
- `docs/content-production-control.md` — produce/promote safety
