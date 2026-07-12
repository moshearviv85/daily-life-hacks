# Batch B Cluster Architecture

Date: 2026-07-12  
Scope: B3 explicit cluster architecture only

## Outcome

The article schema now accepts two optional, controlled metadata fields:

- `cluster`: one registered authority-cluster ID.
- `parentPillar`: the canonical parent slug registered for that cluster.

Legacy articles remain valid without either field. The default audit is
report-only, so unmapped inventory does not break production. Strict mode is
available only with an explicit bounded file list.

## Controlled registry

| Cluster ID | Label | Canonical parent |
|---|---|---|
| `budget-fiber` | Budget Fiber | `/how-to-eat-more-fiber-on-a-budget-complete-guide/` |
| `budget-protein` | Budget Protein | `/high-protein-on-a-budget-complete-guide/` |
| `weekly-budget-shopping` | Weekly Budget Shopping | `/eat-healthy-on-a-budget-complete-playbook/` |
| `meal-prep-food-storage` | Meal Prep & Food Storage | `/meal-prep-for-beginners-complete-system/` |

The first three branches sit under the broader Healthy Eating on a Budget
theme, but metadata records the immediate editorial parent rather than the
umbrella theme.

The registry lives in `src/content/clusters.ts`. It is deliberately separate
from `src/content/pillars.ts`:

- `pillars.ts` currently provides `fiber`, `budget`, and `protein` keyword
  heuristics for recommendations and guide boosts.
- The new registry records explicit editorial ownership. It does not infer an
  assignment from keywords or tags.
- Cluster inference is currently duplicated between
  `src/content/pillars.ts` (`CLUSTER_KEYWORDS` / `clusterForText`) and
  `inject_pillar_links.py` (`CLUSTER_HINTS` / `detect_cluster`). Both remain
  clearly marked legacy fallbacks for unmapped content; their inferred values
  are not treated as explicit cluster metadata.
- Any consumer that supports the new fields should prefer valid frontmatter
  `cluster` and `parentPillar` first, then use legacy inference only when the
  fields are absent. This batch does not silently assign all 187 articles.

## Fresh inventory baseline

Baseline after `d2d9d0c`:

- Articles: **187**
- Unique tags: **365**
- Singleton tags: **230**
- Tags used two times or fewer: **300**
- Top tags: `fiber` 41, `high fiber` 39, `quick meals` 32,
  `nutrition basics` 26, `kitchen tips` 25

This tag distribution is intentionally not used to auto-assign controlled
clusters. A one-off or low-frequency tag is not evidence of parent ownership.

## Audit contract

Default inventory report:

```powershell
npm run audit:clusters
```

Current baseline result:

- Scanned: **187**
- Explicitly assigned: **0**
- Missing `cluster`: **187**
- Exit status: **0** because legacy gaps are report-only

Bounded strict gate for an edited batch:

```powershell
npm run audit:clusters -- --strict --files src/data/articles/one.md,src/data/articles/two.md
```

For a generated file list:

```powershell
npm run audit:clusters -- --strict --files-from reports/batch-b/edited-articles.txt
```

Strict mode exits non-zero for:

- missing or unknown `cluster`;
- missing, unknown, or cluster-mismatched `parentPillar`;
- a self-referential `parentPillar`;
- a registered parent whose article file is missing.

The registered parent article itself may omit `parentPillar`; assigning its own
slug would be self-referential. Every spoke in a strict batch must name the
registry parent exactly.

## Integration guidance

1. Map only reviewed Batch B parents and spokes. Do not mass-fill all 187
   articles from tags or keyword heuristics.
2. Run strict mode on the exact edited file list before merge.
3. Keep the default `audit:clusters` command report-only until legacy mapping is
   reviewed and substantially complete.
4. Do not add this report-only command to `build:checked` as a failing gate yet.
5. Reconcile any future registry expansion with `pillars.ts` and linking tools
   before adding IDs, so recommendation clusters and ownership clusters do not
   silently drift.
