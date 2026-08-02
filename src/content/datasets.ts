/**
 * Data studies that publish a downloadable CSV get schema.org/Dataset
 * (Google Dataset Search + AI-citation surface). Keyed by article id;
 * entries for not-yet-published slugs are harmless.
 *
 * Shared by src/pages/[slug].astro (Dataset schema + embed snippet) and
 * src/pages/embed/[slug].astro (standalone embeddable chart pages).
 */
export interface DatasetProvenance {
  /** Controls how source-specific copy is described and audited. */
  nutritionSourceClass:
    | "grocery"
    | "restaurant"
    | "mixed"
    | "mixed-label"
    | "mixed-research";
  /** Human-readable source used for the nutrition values in this dataset. */
  nutritionSource: string;
  /** Primary source URL when one source covers the dataset. */
  nutritionSourceUrl?: string;
  /** True when the named source covers most rows but is not a complete row-level claim. */
  nutritionSourceIsPrimary?: boolean;
  /** Field-specific provenance that doesn't fit the primary nutrition source. */
  additionalSourceNote?: string;
  /** Dataset-specific row-level matching result and its verification limit. */
  sourceAuditSummary?: string;
}

export interface DatasetMeta {
  name: string;
  /** The coined index name, where the metric has one (method #60). */
  alternateName?: string;
  /**
   * MUST be 50+ characters. Google rejects shorter Dataset descriptions, and the
   * /data/ hub is our only entry ticket into Google Dataset Search (crawl-only,
   * there is no submission form). Doubles as the one-line blurb on /data/.
   */
  description: string;
  csv: string;
  /** Data rows, header excluded. Mirrors pipeline-data/csv-inventory.json. */
  rows: number;
  variables: string[];
  temporal: string;
  /**
   * Omitting provenance declares a grocery-only dataset and applies the USDA
   * default below. Restaurant and mixed datasets must provide an explicit class.
   */
  provenance?: DatasetProvenance;
}

export const DEFAULT_GROCERY_DATASET_PROVENANCE: DatasetProvenance = {
  nutritionSourceClass: "grocery",
  nutritionSource: "USDA FoodData Central",
  nutritionSourceUrl: "https://fdc.nal.usda.gov/",
};

export function getDatasetProvenance(dataset: DatasetMeta): DatasetProvenance {
  return dataset.provenance ?? DEFAULT_GROCERY_DATASET_PROVENANCE;
}

export function describeDatasetProvenance(
  provenance: DatasetProvenance,
): string {
  const sourceLabel = provenance.nutritionSourceIsPrimary
    ? "Primary nutrition source"
    : "Nutrition source";

  return [
    `${sourceLabel}: ${provenance.nutritionSource}.`,
    provenance.additionalSourceNote
      ? `${provenance.additionalSourceNote}.`
      : "",
    provenance.sourceAuditSummary
      ? `${provenance.sourceAuditSummary}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Stable release identity shared by HTML schema, the API, and distribution packages. */
export const DATA_VERSION = "2026.2";
export const DATA_RELEASE_DATE = "2026-08-02";

export const DATASETS: Record<string, DatasetMeta> = {
  "animal-protein-per-dollar-ranked": {
    name: "Every Animal Protein in Our Study, Ranked by Cost (21 foods, 2026)",
    description:
      "Twenty-one animal protein foods ranked by protein grams per dollar, using USDA nutrition data and 2026 US national grocery prices.",
    csv: "/data/animal-protein-per-dollar-ranked-2026.csv",
    rows: 21,
    variables: ["protein grams per dollar", "package price (USD)"],
    temporal: "2026",
  },
  "beans-double-win-fiber-protein": {
    name: "Beans Win Twice: Fiber and Protein per Dollar (10 foods, 2026)",
    description:
      "Ten bean and legume varieties scored on protein per dollar and fiber per dollar at the same time, showing which ones win on both counts.",
    csv: "/data/beans-double-win-fiber-protein-2026.csv",
    rows: 10,
    variables: ["protein grams per dollar", "fiber grams per dollar", "combined grams per dollar"],
    temporal: "2026",
  },
  "breakfast-staples-per-dollar": {
    name: "Breakfast Staples Ranked by Nutrition per Dollar (9 foods, 2026)",
    description:
      "Nine common breakfast foods ranked by combined protein and fiber per dollar, priced as purchased at 2026 US national grocery prices.",
    csv: "/data/breakfast-staples-per-dollar-2026.csv",
    rows: 9,
    variables: ["protein grams per dollar", "fiber grams per dollar", "combined grams per dollar"],
    temporal: "2026",
  },
  "canned-vs-dry-beans-cost": {
    name: "Canned vs Dry Beans: What Convenience Actually Costs (10 foods, 2026)",
    description:
      "Ten matched canned and dry bean products compared on protein per dollar, putting a number on what the convenience of the can costs.",
    csv: "/data/canned-vs-dry-beans-cost-2026.csv",
    rows: 10,
    variables: ["protein grams per dollar", "package price (USD)"],
    temporal: "2026",
  },
  "cheapest-complete-protein-pairs": {
    name: "Rice and Beans Math: The Cheapest Complete-Protein Combos (20 foods, 2026)",
    description:
      "Twenty legume and grain pairings scored on combined protein per dollar at a 50/50 split, ranking the cheapest complete-protein combinations.",
    csv: "/data/cheapest-complete-protein-pairs-2026.csv",
    rows: 20,
    variables: ["combined protein grams per dollar (50/50 legume + grain split)"],
    temporal: "2026",
  },
  "dairy-protein-per-dollar-ranked": {
    name: "Dairy Protein per Dollar: Milk Beats the Hype (6 foods, 2026)",
    description:
      "Six dairy products ranked by protein grams per dollar, covering milk, Greek yogurt, cottage cheese and cheddar at 2026 US prices.",
    csv: "/data/dairy-protein-per-dollar-ranked-2026.csv",
    rows: 6,
    variables: ["protein grams per dollar", "package price (USD)"],
    temporal: "2026",
  },
  "eggs-vs-everything-protein-value": {
    name: "Eggs vs Everything: Where the Default Protein Really Ranks (49 foods, 2026)",
    description:
      "Forty-nine protein foods ranked by protein per dollar with eggs placed in context, showing where the default American protein actually lands.",
    csv: "/data/eggs-vs-everything-protein-value-2026.csv",
    rows: 49,
    variables: ["protein grams per dollar", "package price (USD)"],
    temporal: "2026",
    provenance: {
      nutritionSourceClass: "mixed-label",
      nutritionSource: "USDA FoodData Central",
      nutritionSourceUrl: "https://fdc.nal.usda.gov/",
      nutritionSourceIsPrimary: true,
      additionalSourceNote:
        "TVP is unresolved: its recorded product-label value no longer matches the current product page",
      sourceAuditSummary:
        "Joined to the flagship protein audit: 36 exact USDA matches, 5 close USDA proxies, and 8 unresolved rows; proxy and unresolved rows are not independently re-verified",
    },
  },
  "grains-fiber-per-dollar-ranked": {
    name: "Grains Ranked by Fiber per Dollar (11 foods, 2026)",
    description:
      "Eleven grains and grain products ranked by fiber grams per dollar, from oats and barley through bread, at 2026 US national prices.",
    csv: "/data/grains-fiber-per-dollar-ranked-2026.csv",
    rows: 11,
    variables: ["fiber grams per dollar", "package price (USD)"],
    temporal: "2026",
    provenance: {
      nutritionSourceClass: "grocery",
      nutritionSource: "USDA FoodData Central",
      nutritionSourceUrl: "https://fdc.nal.usda.gov/",
      nutritionSourceIsPrimary: true,
      additionalSourceNote:
        "Popcorn is unresolved: its 14.5-gram value matches air-popped popcorn, while the priced item is unpopped kernels",
      sourceAuditSummary:
        "Joined to the flagship fiber audit: 9 exact USDA matches, 1 close USDA proxy, and 1 unresolved row; proxy and unresolved rows are not independently re-verified",
    },
  },
  "low-sodium-budget-foods-ranked": {
    name: "The Sodium Index: 56 Budget Staples Ranked Lowest Sodium First (2026)",
    alternateName: "Sodium Index",
    description:
      "Fifty-six budget grocery staples ranked by sodium milligrams per 100 g, joined to the audited price basket so each row also carries package price, price per 100 g, sodium per dollar, and the fiber or protein value from the parent studies.",
    csv: "/data/sodium-per-dollar-2026.csv",
    rows: 56,
    variables: [
      "sodium (mg per 100g)",
      "sodium mg per dollar",
      "price (USD)",
      "dietary fiber (g per 100g)",
      "protein (g per 100g)",
    ],
    temporal: "2026",
    provenance: {
      nutritionSourceClass: "grocery",
      nutritionSource: "USDA FoodData Central",
      nutritionSourceUrl: "https://fdc.nal.usda.gov/",
      nutritionSourceIsPrimary: true,
      additionalSourceNote:
        "Sodium was pulled on 2026-08-02 from the same USDA record each row already cited in the fiber and protein studies; only rows those studies marked as exact matches were eligible, so 56 of 102 parent rows qualified",
      sourceAuditSummary:
        "Every row is an exact USDA match, and the same pull reproduced all 74 fiber and protein values already audited into the parent CSVs with zero mismatches, confirming record identity",
    },
  },
  "high-fiber-snacks-per-dollar": {
    name: "High-Fiber Snacks Ranked by Cost (10 foods, 2026)",
    description:
      "Ten snack foods ranked by fiber grams per dollar, covering popcorn, roasted chickpeas, dried fruit and other grab-and-go options.",
    csv: "/data/high-fiber-snacks-per-dollar-2026.csv",
    rows: 10,
    variables: ["fiber grams per dollar", "package price (USD)"],
    temporal: "2026",
    provenance: {
      nutritionSourceClass: "grocery",
      nutritionSource: "USDA FoodData Central",
      nutritionSourceUrl: "https://fdc.nal.usda.gov/",
      nutritionSourceIsPrimary: true,
      additionalSourceNote:
        "Popcorn is unresolved: its 14.5-gram value matches air-popped popcorn, while the priced item is unpopped kernels",
      sourceAuditSummary:
        "Joined to the flagship fiber audit: 6 exact USDA matches, 0 close USDA proxies, and 4 unresolved rows; unresolved rows are not independently re-verified",
    },
  },
  "meat-per-dollar-protein-ranked": {
    name: "Meat per Dollar: 11 Cuts Ranked by Protein Value (11 foods, 2026)",
    description:
      "Eleven cuts of meat ranked by protein grams per dollar, adjusted for bone and trim waste, at 2026 US national grocery prices.",
    csv: "/data/meat-per-dollar-protein-ranked-2026.csv",
    rows: 11,
    variables: ["protein grams per dollar", "package price (USD)"],
    temporal: "2026",
  },
  "no-cook-protein-per-dollar": {
    name: "The Cheapest Protein That Needs Zero Cooking (15 foods, 2026)",
    description:
      "Fifteen protein foods that need no cooking at all, ranked by protein grams per dollar for anyone without a working kitchen.",
    csv: "/data/no-cook-protein-per-dollar-2026.csv",
    rows: 15,
    variables: ["protein grams per dollar", "package price (USD)"],
    temporal: "2026",
  },
  "one-dollar-fiber-what-it-buys": {
    name: "What One Dollar of Fiber Buys, Food by Food (15 foods, 2026)",
    description:
      "Fifteen foods showing how many grams of fiber a single dollar buys, converted from package prices into one comparable unit.",
    csv: "/data/one-dollar-fiber-what-it-buys-2026.csv",
    rows: 15,
    variables: ["fiber grams per dollar", "package price (USD)"],
    temporal: "2026",
    provenance: {
      nutritionSourceClass: "grocery",
      nutritionSource: "USDA FoodData Central",
      nutritionSourceUrl: "https://fdc.nal.usda.gov/",
      nutritionSourceIsPrimary: true,
      additionalSourceNote:
        "Popcorn is unresolved: its 14.5-gram value matches air-popped popcorn, while the priced item is unpopped kernels",
      sourceAuditSummary:
        "Joined to the flagship fiber audit: 12 exact USDA matches, 1 close USDA proxy, and 2 unresolved rows; proxy and unresolved rows are not independently re-verified",
    },
  },
  "one-dollar-protein-what-it-buys": {
    name: "What One Dollar of Protein Buys, Food by Food (15 foods, 2026)",
    description:
      "Fifteen foods showing how many grams of protein a single dollar buys, converted from package prices into one comparable unit.",
    csv: "/data/one-dollar-protein-what-it-buys-2026.csv",
    rows: 15,
    variables: ["protein grams per dollar", "package price (USD)"],
    temporal: "2026",
  },
  "plant-protein-per-dollar-ranked": {
    name: "Plant Protein per Dollar: 18 Sources Ranked (18 foods, 2026)",
    description:
      "Eighteen plant protein sources ranked by protein grams per dollar, covering beans, lentils, tofu, nuts, seeds and meat substitutes.",
    csv: "/data/plant-protein-per-dollar-ranked-2026.csv",
    rows: 18,
    variables: ["protein grams per dollar", "package price (USD)"],
    temporal: "2026",
    provenance: {
      nutritionSourceClass: "mixed-label",
      nutritionSource: "USDA FoodData Central",
      nutritionSourceUrl: "https://fdc.nal.usda.gov/",
      nutritionSourceIsPrimary: true,
      additionalSourceNote:
        "TVP is unresolved: its recorded product-label value no longer matches the current product page",
      sourceAuditSummary:
        "Joined to the flagship protein audit: 13 exact USDA matches, 0 close USDA proxies, and 5 unresolved rows; proxy and unresolved rows are not independently re-verified",
    },
  },
  "produce-fiber-per-dollar-ranked": {
    name: "Fruits and Vegetables Ranked by Fiber per Dollar (22 foods, 2026)",
    description:
      "Twenty-two fruits and vegetables ranked by fiber grams per dollar after edible-fraction adjustment for peels, pits, rinds and other waste.",
    csv: "/data/produce-fiber-per-dollar-ranked-2026.csv",
    rows: 22,
    variables: ["fiber grams per dollar", "package price (USD)"],
    temporal: "2026",
  },
  "shelf-stable-pantry-per-dollar": {
    name: "The Shelf-Stable Pantry, Ranked by Protein per Dollar (27 foods, 2026)",
    description:
      "Twenty-seven shelf-stable pantry foods ranked by protein grams per dollar, covering canned, dried and jarred items that need no refrigeration.",
    csv: "/data/shelf-stable-pantry-per-dollar-2026.csv",
    rows: 27,
    variables: ["protein grams per dollar", "package price (USD)"],
    temporal: "2026",
  },
  "fiber-per-dollar-cheapest-high-fiber-foods": {
    name: "The Fiber per Dollar Index: 53 High-Fiber Foods Ranked by Cost Efficiency (2026)",
    alternateName: "Fiber per Dollar Index",
    description:
      "The full Fiber per Dollar Index: 53 high-fiber foods ranked by dietary fiber grams per dollar, with package prices, edible fractions and price per 100g.",
    csv: "/data/fiber-per-dollar-2026.csv",
    rows: 53,
    variables: ["dietary fiber (g per 100g)", "price (USD)", "fiber grams per dollar"],
    temporal: "2026",
    provenance: {
      nutritionSourceClass: "grocery",
      nutritionSource: "USDA FoodData Central",
      nutritionSourceUrl: "https://fdc.nal.usda.gov/",
      nutritionSourceIsPrimary: true,
      sourceAuditSummary:
        "Current row-level source audit: 38 exact USDA matches, 4 close USDA proxies, and 11 unresolved rows; proxy and unresolved rows are not independently re-verified",
    },
  },
  "protein-per-dollar-cheapest-protein-sources": {
    name: "The Protein per Dollar Index: 49 Protein Sources Ranked by Cost Efficiency (2026)",
    alternateName: "Protein per Dollar Index",
    description:
      "The full Protein per Dollar Index: 49 protein sources ranked by protein grams per dollar, with package prices, edible fractions and price per 100g.",
    csv: "/data/protein-per-dollar-2026.csv",
    rows: 49,
    variables: ["protein (g per 100g)", "price (USD)", "protein grams per dollar"],
    temporal: "2026",
    provenance: {
      nutritionSourceClass: "mixed-label",
      nutritionSource: "USDA FoodData Central",
      nutritionSourceUrl: "https://fdc.nal.usda.gov/",
      nutritionSourceIsPrimary: true,
      additionalSourceNote:
        "TVP is unresolved: its recorded product-label value no longer matches the current product page",
      sourceAuditSummary:
        "Current row-level source audit: 36 exact USDA matches, 5 close USDA proxies, and 8 unresolved rows; proxy and unresolved rows are not independently re-verified",
    },
  },
  "what-30-grams-of-fiber-costs-per-day": {
    name: "Daily Cost of 30 Grams of Fiber: 5 Real Menu Plans Priced (2026)",
    description:
      "Twenty-seven priced meal rows across five complete daily menus that each reach roughly 30 grams of fiber, with the total cost of every plan.",
    csv: "/data/fiber-day-cost-2026.csv",
    rows: 27,
    variables: ["dietary fiber (g per day)", "daily cost (USD)"],
    temporal: "2026",
    provenance: {
      nutritionSourceClass: "mixed",
      nutritionSource:
        "USDA FoodData Central and restaurant chains' published nutrition data",
      sourceAuditSummary:
        "The 23 grocery rows join to the flagship fiber audit: 16 exact USDA matches, 1 close USDA proxy, and 6 unresolved rows; the 4 restaurant rows use chain-published nutrition data",
    },
  },
  "what-50-grams-of-protein-costs-per-day": {
    name: "Daily Cost of 50 Grams of Protein: 5 Real Menu Plans Priced (2026)",
    description:
      "Twenty-one priced meal rows across five complete daily menus that each reach roughly 50 grams of protein, with the total cost of every plan.",
    csv: "/data/protein-day-cost-2026.csv",
    rows: 21,
    variables: ["protein (g per day)", "daily cost (USD)"],
    temporal: "2026",
    provenance: {
      nutritionSourceClass: "mixed",
      nutritionSource:
        "USDA FoodData Central and McDonald's published nutrition data",
    },
  },
  "protein-per-dollar-adjusted-for-quality": {
    name: "Protein per Dollar Adjusted for Quality (DIAAS): 25 Foods (2026)",
    description:
      "Twenty-five protein foods re-ranked after adjusting protein per dollar by DIAAS digestibility scores, with the source and method behind every score.",
    csv: "/data/protein-quality-per-dollar-2026.csv",
    rows: 25,
    variables: ["protein grams per dollar", "DIAAS score", "quality-adjusted grams per dollar"],
    temporal: "2026",
    provenance: {
      nutritionSourceClass: "mixed-research",
      nutritionSource: "USDA FoodData Central",
      nutritionSourceUrl: "https://fdc.nal.usda.gov/",
      additionalSourceNote:
        "DIAAS values use the row-level literature and institutional sources cited in the raw CSV",
    },
  },
  "fast-food-protein-per-dollar-ranked": {
    name: "Fast Food Protein per Dollar: 30 Menu Items Ranked (2026)",
    description:
      "Thirty fast-food menu items from major US chains ranked by protein grams per dollar, using each chain's published nutrition data and menu prices.",
    csv: "/data/fastfood-protein-per-dollar-2026.csv",
    rows: 30,
    variables: ["protein (g per item)", "menu price (USD)", "protein grams per dollar"],
    temporal: "2026",
    provenance: {
      nutritionSourceClass: "restaurant",
      nutritionSource: "each chain's published nutrition data",
    },
  },
};

/**
 * Named metrics (method #60). Use these exact strings everywhere: a named index is
 * quotable and searchable in a way a generic phrase is not, which is what makes an
 * unlinked mention attributable back to us.
 */
export const FIBER_INDEX_NAME = "the Fiber per Dollar Index";
export const PROTEIN_INDEX_NAME = "the Protein per Dollar Index";

/** Human-readable reuse terms, including the exact scope and attribution examples. */
export const DATA_TERMS_URL = "https://www.daily-life-hacks.com/data-reuse/";

/**
 * Machine-readable license for the original Daily Life Hacks contribution to
 * the datasets: selection, arrangement, calculations, field descriptions and
 * explanatory material. Upstream facts and third-party material aren't
 * relicensed; /data-reuse/ spells that boundary out.
 */
export const DATA_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";

/** Display order on /data/: the two named indexes first, then day-cost studies, then category cuts. */
export const STUDY_DATASET_ORDER: string[] = [
  "fiber-per-dollar-cheapest-high-fiber-foods",
  "protein-per-dollar-cheapest-protein-sources",
  "what-30-grams-of-fiber-costs-per-day",
  "what-50-grams-of-protein-costs-per-day",
  "low-sodium-budget-foods-ranked",
  "protein-per-dollar-adjusted-for-quality",
  "fast-food-protein-per-dollar-ranked",
  "eggs-vs-everything-protein-value",
  "shelf-stable-pantry-per-dollar",
  "produce-fiber-per-dollar-ranked",
  "animal-protein-per-dollar-ranked",
  "cheapest-complete-protein-pairs",
  "plant-protein-per-dollar-ranked",
  "no-cook-protein-per-dollar",
  "one-dollar-fiber-what-it-buys",
  "one-dollar-protein-what-it-buys",
  "meat-per-dollar-protein-ranked",
  "grains-fiber-per-dollar-ranked",
  "beans-double-win-fiber-protein",
  "canned-vs-dry-beans-cost",
  "high-fiber-snacks-per-dollar",
  "breakfast-staples-per-dollar",
  "dairy-protein-per-dollar-ranked",
];

/** Every dataset in display order, with its article id attached. Used by /data/. */
export const STUDY_DATASETS: Array<DatasetMeta & { id: string }> = [
  ...STUDY_DATASET_ORDER.filter((id) => id in DATASETS).map((id) => ({ id, ...DATASETS[id] })),
  ...Object.keys(DATASETS)
    .filter((id) => !STUDY_DATASET_ORDER.includes(id))
    .map((id) => ({ id, ...DATASETS[id] })),
];

/** Total data rows published across every CSV, header rows excluded. */
export const TOTAL_DATA_ROWS = STUDY_DATASETS.reduce((sum, d) => sum + d.rows, 0);


/** Chart discovered inside an article body. */
export interface ArticleChart {
  /** Absolute site path, e.g. /images/fiber-per-dollar-top-20-chart.jpg */
  src: string;
  /** Alt text authored in the markdown. */
  alt: string;
}

/**
 * Charts live inside the markdown body (`![alt](/images/{name}-chart.jpg)`),
 * not in frontmatter. Pull the first one out so the embed route and the
 * "Embed this chart" snippet stay in sync with the article automatically.
 */
export function findChartInBody(body: string): ArticleChart | null {
  const match = body.match(/!\[([^\]]*)\]\((\/images\/[^)\s]*-chart\.jpg)\)/);
  if (!match) return null;
  return { alt: match[1].trim(), src: match[2] };
}
