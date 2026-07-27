#!/usr/bin/env node
/**
 * Daily Life Hacks Food Value MCP server.
 *
 * Exposes the 22-dataset / 474-row food value corpus (US grocery prices paired
 * with USDA nutrient values) to MCP clients. Every response carries the source
 * dataset, the study article URL and the methodology URL, so an assistant that
 * quotes a number can attribute it correctly without a second lookup.
 *
 * Transport: stdio. Protocol: MCP via @modelcontextprotocol/sdk 1.x.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  DATASET_INFO,
  DATASET_VERSION,
  DATASETS,
  INDEX,
  NUTRIENTS,
  PRICE_SNAPSHOT,
  attribution,
  findFood,
  foodNames,
  round,
  studyUrl,
  type FoodEntry,
  type Nutrient,
} from "./data.js";

const server = new McpServer({
  name: "dlh-food-value",
  version: "0.1.0",
});

const nutrientArg = z
  .enum(["protein", "fiber", "protein_quality_adjusted"])
  .describe(
    "Which nutrient ranking to use. 'protein' = raw grams of protein per dollar (49 foods). " +
      "'fiber' = grams of dietary fiber per dollar (53 foods). " +
      "'protein_quality_adjusted' = protein per dollar multiplied by DIAAS, which corrects " +
      "for how much of that protein the body can actually use (25 foods).",
  );

/** Shared shape for a single food in a response. */
const foodPayload = (e: FoodEntry, nutrient: Nutrient) => ({
  food: e.food,
  category: e.category,
  grams_per_dollar: round(e.gramsPerDollar, 1),
  unit: NUTRIENTS[nutrient].unitLabel,
  package: e.packageSize,
  package_price_usd: e.packagePriceUsd,
  price_basis: e.priceBasis,
  audited_detail: e.detail,
  source_dataset: e.sourceFile,
  study_url: e.studyUrl,
});

const textAnd = <T,>(payload: T) => ({
  content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  structuredContent: payload as Record<string, unknown>,
});

const toolError = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});

// ---------------------------------------------------------------------------
// 1. cheapest_source
// ---------------------------------------------------------------------------

server.registerTool(
  "cheapest_source",
  {
    title: "Cheapest source of a nutrient",
    description:
      "Rank the cheapest foods for a given nutrient, measured in grams per US dollar. " +
      "Returns audited values with the shelf price and price basis behind each one, " +
      "plus the source dataset and study URL for attribution. Use this to answer " +
      "'what is the cheapest protein?' or 'cheapest high-fiber foods'. " +
      "Optionally filter to one grocery category.",
    inputSchema: {
      nutrient: nutrientArg,
      limit: z
        .number()
        .int()
        .min(1)
        .max(60)
        .default(10)
        .describe("How many foods to return, ranked cheapest first. Default 10."),
      category: z
        .string()
        .optional()
        .describe(
          "Optional grocery category filter, matched case-insensitively as a substring " +
            "(e.g. 'grains', 'dried beans', 'dairy', 'fresh fruit').",
        ),
    },
  },
  async ({ nutrient, limit, category }) => {
    const spec = NUTRIENTS[nutrient];
    let entries = INDEX[nutrient];

    if (category) {
      const c = category.toLowerCase();
      entries = entries.filter((e) => (e.category ?? "").toLowerCase().includes(c));
      if (!entries.length) {
        const available = [
          ...new Set(INDEX[nutrient].map((e) => e.category).filter(Boolean)),
        ];
        return toolError(
          `No foods matched category "${category}" in the ${spec.label} index. ` +
            `Available categories: ${available.join(", ")}`,
        );
      }
    }

    const ranked = entries.slice(0, limit);
    return textAnd({
      query: { nutrient, limit, category: category ?? null },
      nutrient: spec.label,
      unit: spec.unitLabel,
      nutrient_note: spec.note,
      foods_in_index: entries.length,
      price_snapshot: PRICE_SNAPSHOT,
      results: ranked.map((e, i) => ({ rank: i + 1, ...foodPayload(e, nutrient) })),
      attribution: attribution([spec.file]),
    });
  },
);

// ---------------------------------------------------------------------------
// 2. compare_foods
// ---------------------------------------------------------------------------

server.registerTool(
  "compare_foods",
  {
    title: "Compare two foods on nutrient value per dollar",
    description:
      "Head-to-head comparison of two foods on grams of a nutrient per US dollar. " +
      "Returns both audited rows, which food wins, the ratio between them, and what " +
      "each costs to deliver 100 g of the nutrient. Food names are matched loosely, " +
      "so 'black beans' finds 'Black beans (dry)'. Use this for " +
      "'is peanut butter or chicken cheaper protein?' style questions.",
    inputSchema: {
      food_a: z.string().min(1).describe("First food name, e.g. 'black beans' or 'eggs'."),
      food_b: z.string().min(1).describe("Second food name, e.g. 'chicken breast'."),
      nutrient: nutrientArg,
    },
  },
  async ({ food_a, food_b, nutrient }) => {
    const spec = NUTRIENTS[nutrient];
    const a = findFood(food_a, nutrient);
    const b = findFood(food_b, nutrient);

    const missing: string[] = [];
    if (!a) missing.push(food_a);
    if (!b) missing.push(food_b);
    if (missing.length) {
      return toolError(
        `Not found in the ${spec.label} index: ${missing.map((m) => `"${m}"`).join(", ")}. ` +
          `Try search_foods to find the right name. Indexed foods: ${foodNames(nutrient).join(", ")}`,
      );
    }

    const winner = a!.gramsPerDollar >= b!.gramsPerDollar ? a! : b!;
    const loser = winner === a! ? b! : a!;
    const ratio = winner.gramsPerDollar / loser.gramsPerDollar;

    return textAnd({
      query: { food_a, food_b, nutrient },
      nutrient: spec.label,
      unit: spec.unitLabel,
      nutrient_note: spec.note,
      price_snapshot: PRICE_SNAPSHOT,
      food_a: foodPayload(a!, nutrient),
      food_b: foodPayload(b!, nutrient),
      verdict: {
        cheaper_source: winner.food,
        times_cheaper: round(ratio, 2),
        summary:
          `${winner.food} delivers ${round(winner.gramsPerDollar, 1)} ${spec.unitLabel} ` +
          `versus ${round(loser.gramsPerDollar, 1)} for ${loser.food} - ` +
          `${round(ratio, 2)}x more ${spec.label} per dollar.`,
        cost_per_100g_nutrient_usd: {
          [a!.food]: round(100 / a!.gramsPerDollar, 2),
          [b!.food]: round(100 / b!.gramsPerDollar, 2),
        },
      },
      attribution: attribution([spec.file]),
    });
  },
);

// ---------------------------------------------------------------------------
// 3. cost_of_daily_target
// ---------------------------------------------------------------------------

server.registerTool(
  "cost_of_daily_target",
  {
    title: "Cost of hitting a daily nutrient target",
    description:
      "Work out what it costs to buy a given number of grams of a nutrient, ranked " +
      "cheapest first, and how much of each food you would need to eat to get there. " +
      "Use for 'what does 50 g of protein a day cost?' or 'cheapest way to hit 28 g " +
      "of fiber'. Returns per-food dollar cost, grams of food required where the " +
      "per-100g value is available, and the annualised cost.",
    inputSchema: {
      nutrient: nutrientArg,
      grams: z
        .number()
        .positive()
        .max(1000)
        .describe(
          "Grams of the nutrient to hit. Common reference points: 28 g fiber " +
            "(FDA Daily Value), 50 g protein (FDA Daily Value).",
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(60)
        .default(10)
        .describe("How many foods to return, cheapest first. Default 10."),
    },
  },
  async ({ nutrient, grams, limit }) => {
    const spec = NUTRIENTS[nutrient];
    const per100gKey = nutrient === "fiber" ? "fiber_g_per_100g" : "protein_g_per_100g";
    const ranked = INDEX[nutrient].slice(0, limit);

    return textAnd({
      query: { nutrient, grams, limit },
      nutrient: spec.label,
      target_grams: grams,
      nutrient_note: spec.note,
      price_snapshot: PRICE_SNAPSHOT,
      foods_in_index: INDEX[nutrient].length,
      results: ranked.map((e, i) => {
        const cost = grams / e.gramsPerDollar;
        const per100g = e.detail[per100gKey];
        const foodGrams =
          typeof per100g === "number" && per100g > 0
            ? round((grams / per100g) * 100, 0)
            : null;
        return {
          rank: i + 1,
          food: e.food,
          category: e.category,
          cost_usd: round(cost, 2),
          cost_per_year_usd: round(cost * 365, 2),
          grams_of_food_needed: foodGrams,
          grams_per_dollar: round(e.gramsPerDollar, 1),
          package: e.packageSize,
          package_price_usd: e.packagePriceUsd,
          price_basis: e.priceBasis,
          source_dataset: e.sourceFile,
          study_url: e.studyUrl,
        };
      }),
      caveat:
        "This is single-food arithmetic, not a diet plan. It answers what the nutrient " +
        "costs from each source, not what anyone should eat.",
      attribution: attribution([spec.file]),
    });
  },
);

// ---------------------------------------------------------------------------
// 4. search_foods
// ---------------------------------------------------------------------------

server.registerTool(
  "search_foods",
  {
    title: "Search foods across every dataset",
    description:
      "Find which foods in the corpus match a query and which of the 22 datasets " +
      "each one appears in, with its value in that dataset. Use this first when you " +
      "are not sure a food is covered, or to discover which studies mention it. " +
      "Matches case-insensitively on the food name.",
    inputSchema: {
      query: z
        .string()
        .min(1)
        .describe("Food name or fragment, e.g. 'beans', 'chicken', 'oats', 'peanut'."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(15)
        .describe("Maximum number of distinct foods to return. Default 15."),
    },
  },
  async ({ query, limit }) => {
    const q = query.toLowerCase().trim();
    // food name -> list of appearances
    const hits = new Map<
      string,
      { dataset: string; study_url: string; value: number | null; value_column: string | null; category: string | null }[]
    >();

    for (const [file, rows] of DATASETS) {
      for (const r of rows) {
        const name = r.food ?? r.item;
        if (!name || !name.toLowerCase().includes(q)) continue;

        const valueColumn =
          ["value", "protein_g_per_dollar", "fiber_g_per_dollar", "adjusted_g_per_dollar", "protein_g", "fiber_g"].find(
            (c) => r[c] !== undefined && r[c].trim() !== "",
          ) ?? null;
        const raw = valueColumn ? Number(r[valueColumn]) : NaN;

        const list = hits.get(name) ?? [];
        list.push({
          dataset: file,
          study_url: studyUrl(file),
          value: Number.isFinite(raw) ? raw : null,
          value_column: valueColumn,
          category: r.category ?? null,
        });
        hits.set(name, list);
      }
    }

    if (!hits.size) {
      return toolError(
        `No food matching "${query}" in any of the ${DATASETS.size} datasets. ` +
          `The corpus covers US grocery staples: beans, lentils, grains, produce, dairy, ` +
          `eggs, meat, nuts, pantry items and fast-food menu items.`,
      );
    }

    const results = [...hits.entries()]
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([food, appearances]) => ({
        food,
        category: appearances[0].category,
        appears_in_datasets: appearances.length,
        appearances: appearances.map((a) => ({
          dataset: a.dataset,
          value: a.value,
          value_column: a.value_column,
          study_url: a.study_url,
        })),
      }));

    return textAnd({
      query: { query, limit },
      matched_foods: hits.size,
      returned: results.length,
      datasets_searched: DATASETS.size,
      price_snapshot: PRICE_SNAPSHOT,
      results,
      attribution: attribution(
        [...new Set(results.flatMap((r) => r.appearances.map((a) => a.dataset)))].slice(0, 8),
      ),
    });
  },
);

// ---------------------------------------------------------------------------
// 5. list_datasets  (discovery aid)
// ---------------------------------------------------------------------------

server.registerTool(
  "list_datasets",
  {
    title: "List every dataset in the corpus",
    description:
      "Inventory of all 22 datasets: file name, human title, row count, columns and " +
      "the study article each one backs. Use this to see what the corpus covers " +
      "before reaching for the other tools.",
    inputSchema: {},
  },
  async () => {
    return textAnd({
      collection: "Daily Life Hacks Food Value Data",
      version: DATASET_VERSION,
      dataset_count: DATASET_INFO.length,
      total_rows: DATASET_INFO.reduce((s, d) => s + d.rows, 0),
      price_snapshot: PRICE_SNAPSHOT,
      datasets: DATASET_INFO,
      attribution: attribution(DATASET_INFO.map((d) => d.file)),
    });
  },
);

// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is the transport; anything human-readable must go to stderr.
  console.error(
    `dlh-food-value MCP server running on stdio - ${DATASET_INFO.length} datasets, ` +
      `${DATASET_INFO.reduce((s, d) => s + d.rows, 0)} rows, version ${DATASET_VERSION}`,
  );
}

main().catch((err) => {
  console.error("Fatal error starting dlh-food-value MCP server:", err);
  process.exit(1);
});
