import { readPublicCsv } from "./public-csv.mjs";

export const PROTEIN_FILE = "fastfood-protein-per-dollar-2026.csv";
export const FIBER_FILE = "high-fiber-fast-food-2026.csv";

/** Half-up to one decimal. Empty input stays null so a missing sheet is not a zero. */
export function tenths(values) {
  if (!values.length) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.floor(mean * 10 + 0.5) / 10;
}

export function loadFastFoodIndex() {
  const protein = readPublicCsv(`data/${PROTEIN_FILE}`);
  const fiber = readPublicCsv(`data/${FIBER_FILE}`);
  if (protein.length !== 30) {
    throw new Error(`expected 30 fast-food protein rows, got ${protein.length}`);
  }
  if (fiber.length !== 29) {
    throw new Error(`expected 29 fast-food fiber rows, got ${fiber.length}`);
  }

  const rows = [
    ...protein.map((row) => ({
      chain: row.chain,
      item: row.item,
      sheet: "protein",
      sheetLabel: "Protein per dollar",
      protein: row.protein_g,
      fiber: "",
      calories: "",
      sodium: "",
      price: row.price_usd,
      perDollar: row.protein_g_per_dollar,
    })),
    ...fiber.map((row) => ({
      chain: row.chain,
      item: row.item,
      sheet: "fiber",
      sheetLabel: "Fiber order",
      protein: row.protein_g,
      fiber: row.fiber_g,
      calories: row.calories,
      sodium: row.sodium_mg,
      price: "",
      perDollar: "",
    })),
  ];

  const chains = [...new Set(rows.map((row) => row.chain))].sort((a, b) => a.localeCompare(b));
  const summary = chains
    .map((chain) => {
      const proteinRows = rows.filter((row) => row.chain === chain && row.sheet === "protein");
      const fiberRows = rows.filter((row) => row.chain === chain && row.sheet === "fiber");
      return {
        chain,
        proteinCount: proteinRows.length,
        proteinMean: tenths(proteinRows.map((row) => Number(row.perDollar))),
        fiberCount: fiberRows.length,
        fiberMean: tenths(fiberRows.map((row) => Number(row.fiber))),
      };
    })
    .sort((a, b) => {
      const proteinGap = (b.proteinMean ?? -1) - (a.proteinMean ?? -1);
      if (proteinGap !== 0) return proteinGap;
      return a.chain.localeCompare(b.chain);
    });

  return { rows, chains, summary };
}
