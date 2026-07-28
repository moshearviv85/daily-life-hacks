/**
 * Build-time CSV loading for the calculator pages.
 *
 * Astro ignores anything under src/pages/ whose path segment starts with "_",
 * so this file is a module, not a route.
 *
 * Every number rendered by a tool page must trace back to one of these audited
 * CSVs. Nothing here invents a value, and nothing hardcodes a price: when the
 * price study is re-run the CSVs change and the pages change with them.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Row = Record<string, string>;

/**
 * Minimal RFC-4180-ish reader. Fields may be quoted and contain commas
 * (several price_basis values do).
 *
 * process.cwd() is the project root during `astro build`. Do NOT use
 * import.meta.url: it resolves against the bundled module in dist/, whose
 * depth differs per page.
 */
export function parseCsv(publicPath: string): Row[] {
  const text = readFileSync(join(process.cwd(), "public", publicPath), "utf-8");
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') {
          field += '"';
          i++;
        } else if (c === '"') inQuotes = false;
        else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") {
        cells.push(field);
        field = "";
      } else field += c;
    }
    cells.push(field);
    const row: Row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

export const num = (v: string | undefined): number => Number(v ?? 0);

/** $1.23 */
export const usd = (n: number): string =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Round to n decimals and drop a trailing ".0" so 12.0 renders as 12. */
export const round = (n: number, places = 1): number =>
  Math.round(n * 10 ** places) / 10 ** places;

export const SITE = "https://www.daily-life-hacks.com";

export const SOURCE_LINE =
  "Source: Daily Life Hacks grocery price study. Prices observed July 2026 at US national grocery prices; nutrition values from USDA FoodData Central.";

/** Shared breadcrumb builder so every tool page agrees on the trail. */
export function breadcrumb(path: string, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${SITE}${path}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE}/tools/` },
      { "@type": "ListItem", position: 3, name, item: `${SITE}${path}` },
    ],
  };
}

/**
 * WebApplication markup.
 *
 * Two deliberate choices, both checked against the live Google Search Central
 * "Software app" doc (last updated 2025-12-10) and schema.org:
 *
 * 1. applicationCategory MUST come from Google's published list of supported
 *    app types. "UtilityApplication" is NOT on that list; the correct token is
 *    "UtilitiesApplication" (plural). "HealthApplication" is the other
 *    defensible value for the nutrition-facing tools.
 *
 * 2. aggregateRating / review is a REQUIRED property for the Software App rich
 *    result, and it is omitted here on purpose. We have no real user reviews.
 *    Google's structured-data policies treat invented ratings as grounds for a
 *    manual action, so the honest trade is: valid schema, no star rich result.
 *    Do not "fix" this by adding a rating.
 */
export type AppCategory = "UtilitiesApplication" | "HealthApplication";

export function webAppSchema(opts: {
  path: string;
  name: string;
  description: string;
  featureList: string[];
  category?: AppCategory;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${SITE}${opts.path}#webapp`,
    name: opts.name,
    url: `${SITE}${opts.path}`,
    description: opts.description,
    applicationCategory: opts.category ?? "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements:
      "Requires JavaScript for the interactive calculator; the full data table renders without it.",
    isAccessibleForFree: true,
    featureList: opts.featureList,
    inLanguage: "en-US",
    isPartOf: { "@id": `${SITE}/#website` },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@id": `${SITE}/#organization` },
  };
}

/**
 * WebPage wrapper that points at the tool as its mainEntity. Breadcrumb is the
 * only rich result a plain calculator page can realistically earn today, and
 * the WebPage/mainEntity pairing is what feeds entity understanding.
 */
export function toolPageSchema(opts: {
  path: string;
  name: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE}${opts.path}#webpage`,
    name: opts.name,
    url: `${SITE}${opts.path}`,
    description: opts.description,
    inLanguage: "en-US",
    isPartOf: { "@id": `${SITE}/#website` },
    publisher: { "@id": `${SITE}/#organization` },
    breadcrumb: { "@id": `${SITE}${opts.path}#breadcrumb` },
    mainEntity: { "@id": `${SITE}${opts.path}#webapp` },
    license: `${SITE}/methodology/#data-license`,
  };
}
