/**
 * GET /api/v1/foods — query the food-value rows (growth method #25).
 *
 * Free, no key, no auth. Every response carries the attribution string and the
 * methodology URL in `meta`, because credit with a link is the only thing we
 * ask for in return.
 *
 * Data loading, caching and the rate-limiting decision are documented in
 * ./_lib.js.
 *
 * Params:
 *   nutrient  fiber | protein   only rows that publish that grams-per-dollar metric
 *   dataset   dataset id or study slug (see /api/v1/datasets)
 *   q         case-insensitive substring match on the food name
 *   sort      value | food | price | rank | dataset      (default: value)
 *   order     asc | desc                                  (default: desc for value, asc otherwise)
 *   limit     1-500                                       (default: 50)
 *   offset    >= 0                                        (default: 0)
 *   unique    true to keep one row per food                (default: false)
 */

import {
  loadIndex,
  json,
  fail,
  methodGuard,
  baseMeta,
  MAX_LIMIT,
  DEFAULT_LIMIT,
} from "./_lib.js";

const NUTRIENT_METRIC = {
  fiber: "fiber_g_per_dollar",
  protein: "protein_g_per_dollar",
};

const SORT_FIELDS = new Set(["value", "food", "price", "rank", "dataset"]);

function parseInteger(raw, fallback) {
  if (raw === null || raw === "") return { value: fallback };
  if (!/^-?\d+$/.test(raw)) return { error: true };
  return { value: Number(raw) };
}

/**
 * The value a row is being ranked on. With ?nutrient= it is that nutrient's
 * grams-per-dollar. Without one it is the dataset's own headline metric, which
 * is whatever its `value` column counts. Rows that publish no per-dollar metric
 * at all (the day-cost menu rows) get null rather than a number we made up.
 */
function resolveValue(row, dataset, metricKey) {
  if (metricKey) return row.metrics[metricKey] ?? null;
  const primary = dataset?.primary_metric;
  if (primary && row.metrics[primary] != null) return row.metrics[primary];
  const first = Object.keys(row.metrics)[0];
  return first ? row.metrics[first] : null;
}

function unitFor(metricKey) {
  if (metricKey === "fiber_g_per_dollar") return "grams of dietary fiber per US dollar";
  if (metricKey === "protein_g_per_dollar") return "grams of protein per US dollar";
  if (metricKey === "combined_g_per_dollar") return "grams of protein plus fiber per US dollar";
  if (metricKey === "quality_adjusted_protein_g_per_dollar") {
    return "DIAAS-adjusted grams of protein per US dollar";
  }
  return null;
}

export async function onRequest(context) {
  const { request, env } = context;

  const guard = methodGuard(request);
  if (guard) return guard;

  const url = new URL(request.url);
  const params = url.searchParams;

  const nutrientRaw = (params.get("nutrient") || "").trim().toLowerCase();
  if (nutrientRaw && !NUTRIENT_METRIC[nutrientRaw]) {
    return fail(
      400,
      `Unknown nutrient "${nutrientRaw}"`,
      "Supported values: fiber, protein.",
    );
  }
  const metricKey = nutrientRaw ? NUTRIENT_METRIC[nutrientRaw] : null;

  const sort = (params.get("sort") || "value").trim().toLowerCase();
  if (!SORT_FIELDS.has(sort)) {
    return fail(
      400,
      `Unknown sort field "${sort}"`,
      `Supported values: ${[...SORT_FIELDS].join(", ")}.`,
    );
  }

  const orderRaw = (params.get("order") || "").trim().toLowerCase();
  if (orderRaw && orderRaw !== "asc" && orderRaw !== "desc") {
    return fail(400, `Unknown order "${orderRaw}"`, "Supported values: asc, desc.");
  }
  const order = orderRaw || (sort === "value" ? "desc" : "asc");

  const limitParsed = parseInteger(params.get("limit"), DEFAULT_LIMIT);
  if (limitParsed.error || limitParsed.value < 1 || limitParsed.value > MAX_LIMIT) {
    return fail(
      400,
      "limit must be an integer between 1 and " + MAX_LIMIT,
      "Page through the rest with ?offset=.",
    );
  }
  const limit = limitParsed.value;

  const offsetParsed = parseInteger(params.get("offset"), 0);
  if (offsetParsed.error || offsetParsed.value < 0) {
    return fail(400, "offset must be an integer of 0 or more");
  }
  const offset = offsetParsed.value;

  const q = (params.get("q") || "").trim();
  const datasetParam = (params.get("dataset") || "").trim();

  let index;
  try {
    index = await loadIndex(env, request.url);
  } catch (err) {
    return fail(500, "Data index unavailable", String(err.message || err));
  }

  // ?dataset= accepts the dataset id (grains-fiber-per-dollar-ranked-2026) or
  // the study slug (grains-fiber-per-dollar-ranked), because people copy
  // whichever one they saw first.
  let datasetId = null;
  if (datasetParam) {
    if (index.datasets[datasetParam]) {
      datasetId = datasetParam;
    } else {
      const bySlug = Object.values(index.datasets).find(
        (d) => d.article_slug === datasetParam,
      );
      if (!bySlug) {
        return fail(
          404,
          `Unknown dataset "${datasetParam}"`,
          "GET /api/v1/datasets lists every valid id.",
        );
      }
      datasetId = bySlug.id;
    }
  }

  const needle = q.toLowerCase();

  const matched = index.rows.filter((row) => {
    if (datasetId && row.dataset !== datasetId) return false;
    if (metricKey && row.metrics[metricKey] == null) return false;
    if (needle && !(row.food || "").toLowerCase().includes(needle)) return false;
    return true;
  });

  const direction = order === "asc" ? 1 : -1;

  const sortKey = (row) => {
    if (sort === "value") return resolveValue(row, index.datasets[row.dataset], metricKey);
    if (sort === "food") return row.food;
    if (sort === "price") return row.price_usd;
    if (sort === "rank") return row.rank;
    return row.dataset;
  };

  // The same food can legitimately appear in several studies (whole wheat flour
  // is in the flagship fiber index and in the grains cut), so ties are broken by
  // the study's display order and then by dataset id. That keeps paging stable
  // and puts the flagship index row ahead of the category re-cuts.
  const tiebreak = (a, b) => {
    const ao = index.datasets[a.dataset]?.order ?? 999;
    const bo = index.datasets[b.dataset]?.order ?? 999;
    if (ao !== bo) return ao - bo;
    return a.dataset.localeCompare(b.dataset);
  };

  matched.sort((a, b) => {
    const av = sortKey(a);
    const bv = sortKey(b);
    // Nulls always sink, whichever direction we are sorting in.
    if (av == null && bv == null) return tiebreak(a, b);
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") {
      if (av !== bv) return (av - bv) * direction;
      return tiebreak(a, b);
    }
    const cmp = String(av).localeCompare(String(bv));
    return cmp === 0 ? tiebreak(a, b) : cmp * direction;
  });

  // A food genuinely appears in several studies, so an unfiltered
  // ?nutrient=protein returns Pinto beans four times before anything else. The
  // rows are all correct, but as a ranking it reads broken. unique=true keeps
  // the first row per food, which after the sort above is the flagship index
  // row rather than a category re-cut. Off by default so nothing is hidden
  // from a caller who asked for a specific dataset.
  const unique = ["1", "true", "yes"].includes(
    (params.get("unique") || "").trim().toLowerCase(),
  );
  const deduped = unique
    ? matched.filter((row, i, all) =>
        all.findIndex((other) => other.food === row.food) === i)
    : matched;

  const page = deduped.slice(offset, offset + limit);

  const data = page.map((row) => {
    const dataset = index.datasets[row.dataset];
    const value = resolveValue(row, dataset, metricKey);
    const valueMetric = metricKey || (value == null ? null : dataset?.primary_metric);
    return {
      dataset: row.dataset,
      food: row.food,
      category: row.category,
      nutrients: row.nutrients,
      value,
      value_metric: valueMetric,
      unit: unitFor(valueMetric),
      metrics: row.metrics,
      package: row.package,
      price_usd: row.price_usd,
      price_basis: row.price_basis,
      rank: row.rank,
      study_url: dataset?.study_url ?? null,
      csv_url: dataset?.csv_url ?? null,
      fields: row.fields,
    };
  });

  const datasetsInPage = [...new Set(page.map((row) => row.dataset))].map((id) => {
    const d = index.datasets[id];
    return {
      id: d.id,
      name: d.name,
      title: d.title,
      rows_in_dataset: d.rows,
      csv_url: d.csv_url,
      study_url: d.study_url,
      temporal_coverage: d.temporal_coverage,
      spatial_coverage: d.spatial_coverage,
    };
  });

  return json({
    data,
    total: deduped.length,
    count: data.length,
    meta: {
      ...baseMeta(index),
      query: {
        nutrient: nutrientRaw || null,
        dataset: datasetId,
        q: q || null,
        sort,
        order,
        limit,
        offset,
      },
      datasets: datasetsInPage,
    },
  });
}
