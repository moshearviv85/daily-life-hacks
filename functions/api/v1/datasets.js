/**
 * GET /api/v1/datasets — the discovery endpoint (growth method #25).
 *
 * Lists all 22 datasets with name, description, row count, full field schema,
 * CSV URL and the study article the numbers were published in. Start here, then
 * pull rows with /api/v1/foods?dataset=<id>.
 *
 * Free, no key, no auth. Data loading and the rate-limiting decision are
 * documented in ./_lib.js.
 *
 * Params:
 *   nutrient  fiber | protein   only datasets that measure that nutrient
 *   dataset   dataset id or study slug — returns that one dataset
 */

import { loadIndex, json, fail, methodGuard, baseMeta } from "./_lib.js";

const NUTRIENTS = new Set(["fiber", "protein"]);

export async function onRequest(context) {
  const { request, env } = context;

  const guard = methodGuard(request);
  if (guard) return guard;

  const params = new URL(request.url).searchParams;

  const nutrient = (params.get("nutrient") || "").trim().toLowerCase();
  if (nutrient && !NUTRIENTS.has(nutrient)) {
    return fail(
      400,
      `Unknown nutrient "${nutrient}"`,
      "Supported values: fiber, protein.",
    );
  }

  const datasetParam = (params.get("dataset") || "").trim();

  let index;
  try {
    index = await loadIndex(env, request.url);
  } catch (err) {
    return fail(500, "Data index unavailable", String(err.message || err));
  }

  let all = Object.values(index.datasets)
    .slice()
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  if (datasetParam) {
    const match = all.find(
      (d) => d.id === datasetParam || d.article_slug === datasetParam,
    );
    if (!match) {
      return fail(
        404,
        `Unknown dataset "${datasetParam}"`,
        "Call /api/v1/datasets with no parameters to list every valid id.",
      );
    }
    all = [match];
  }

  if (nutrient) {
    all = all.filter((d) => d.nutrients.includes(nutrient));
  }

  const data = all.map((d) => ({
    id: d.id,
    name: d.name,
    title: d.title,
    description: d.description,
    long_description: d.long_description,
    rows: d.rows,
    nutrients: d.nutrients,
    metrics: d.metrics,
    primary_metric: d.primary_metric,
    temporal_coverage: d.temporal_coverage,
    spatial_coverage: d.spatial_coverage,
    csv_url: d.csv_url,
    csv_bytes: d.bytes,
    csv_sha256: d.hash,
    study_url: d.study_url,
    api_url: d.api_url,
    schema: { fields: d.schema },
  }));

  return json({
    data,
    total: data.length,
    count: data.length,
    meta: {
      ...baseMeta(index),
      query: {
        nutrient: nutrient || null,
        dataset: datasetParam || null,
      },
      catalog: {
        dataset_count: index.dataset_count,
        row_count: index.row_count,
        rows_endpoint: "https://www.daily-life-hacks.com/api/v1/foods",
      },
    },
  });
}
