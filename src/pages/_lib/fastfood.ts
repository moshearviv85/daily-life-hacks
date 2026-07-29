/**
 * Shared build-time loader for the per-chain fast-food protein-per-dollar pages.
 *
 * Astro ignores any path segment under src/pages/ that starts with "_", so this
 * is a module, not a route.
 *
 * SCOPE OF THIS MODULE: data, maths and schema only. Every word of prose on the
 * chain pages is hand-written in the page itself. That split is deliberate. A
 * templated table over audited data is a computed asset; templated *prose* over
 * the same table would be five near-identical pages, which is exactly the
 * scaled-content shape `reports/growth/query-family-plan-2026-07-28.md` (§4.3,
 * §4.4) warns against on a site with 486 unindexed URLs.
 *
 * EVERY number rendered by these pages comes from
 * public/data/fastfood-protein-per-dollar-2026.csv. Nothing is hardcoded from
 * memory, and no derived figure is invented: the only arithmetic done here is
 * division and subtraction over CSV columns.
 *
 * THERE IS NO CALORIE COLUMN in that CSV, or in any of the 22 datasets this
 * site publishes. Do not add one by pasting figures from elsewhere.
 */
import { parseCsv, num, usd, round, SITE } from "../tools/_lib/data";

export { num, usd, round, SITE };

export const CSV_PATH = "/data/fastfood-protein-per-dollar-2026.csv";
export const PARENT_PATH = "/fast-food-protein-per-dollar-ranked/";

/**
 * Possessive form of a chain name. Four of the seven chains in this dataset
 * already end in "s" ("McDonald's", "Wendy's"), so a naive `${chain}'s`
 * renders "Wendy's's" in the table caption and in the ItemList description.
 */
export const possessive = (name: string): string =>
  name.endsWith("s") ? `${name}'` : `${name}'s`;

export interface Item {
  chain: string;
  item: string;
  proteinG: number;
  priceUsd: number;
  perDollar: number;
  /** Where the protein grams come from, verbatim from the CSV `source` column. */
  proteinSource: string;
  /** Where the price comes from and when it was observed, verbatim from `price_basis`. */
  priceBasis: string;
}

const ALL: Item[] = parseCsv(CSV_PATH).map((r) => ({
  chain: r.chain,
  item: r.item,
  proteinG: num(r.protein_g),
  priceUsd: num(r.price_usd),
  perDollar: num(r.protein_g_per_dollar),
  proteinSource: r.source,
  priceBasis: r.price_basis,
}));

/** Every item in the study, best ratio first. Used for cross-chain rank claims. */
export const ALL_RANKED: Item[] = [...ALL].sort((a, b) => b.perDollar - a.perDollar);

export const STUDY_SIZE = ALL.length;
export const STUDY_CHAINS = new Set(ALL.map((i) => i.chain)).size;
export const STUDY_BEST = ALL_RANKED[0];
export const STUDY_WORST = ALL_RANKED[ALL_RANKED.length - 1];

/** 1-based rank of an item within the whole 30-item study. */
export function studyRank(item: Item): number {
  return ALL_RANKED.findIndex((i) => i.chain === item.chain && i.item === item.item) + 1;
}

export function itemsFor(chain: string): Item[] {
  return ALL.filter((i) => i.chain === chain).sort((a, b) => b.perDollar - a.perDollar);
}

/**
 * Per-chain page configuration.
 *
 * `observed` is the human-readable price-observation window shown in the page
 * body. It is NOT invented: it is read off the `price_basis` strings of that
 * chain's own rows, which are rendered in full in the table underneath, so any
 * reader can check the summary against the per-row basis. The comment on each
 * entry names the rows it was derived from.
 *
 * Chains present in the CSV but deliberately NOT given a page: Subway (3 items)
 * and Chick-fil-A (3 items). Three rows is a podium, not a ranking. See the
 * "What this page doesn't cover" section on each page and the parent study.
 */
export interface ChainPage {
  chain: string;
  /** URL path, always with the trailing slash the site's routing enforces. */
  path: string;
  display: string;
  /** Price-observation window, derived from this chain's price_basis strings. */
  observed: string;
  /** Sibling chain pages a reader would genuinely compare against. */
  siblings: Array<{ path: string; label: string; why: string }>;
}

const P = {
  mcdonalds: "/mcdonalds-protein-per-dollar/",
  kfc: "/kfc-protein-per-dollar/",
  tacoBell: "/taco-bell-protein-per-dollar/",
  chipotle: "/chipotle-protein-per-dollar/",
  wendys: "/wendys-protein-per-dollar/",
} as const;

export const CHAIN_PAGES: Record<string, ChainPage> = {
  mcdonalds: {
    chain: "McDonald's",
    path: P.mcdonalds,
    display: "McDonald's",
    // All 6 McDonald's rows: "PriceListo national average, Jul 6 2026 snapshot; a la carte".
    observed: "July 6, 2026",
    siblings: [
      { path: P.wendys, label: "Wendy's", why: "the other national burger counter, and the one with the tightest spread in the study" },
      { path: P.tacoBell, label: "Taco Bell", why: "the other place people go when the budget, not the craving, is doing the ordering" },
      { path: P.kfc, label: "KFC", why: "if the McNuggets number bothered you, tenders are the same idea priced differently" },
    ],
  },
  kfc: {
    chain: "KFC",
    path: P.kfc,
    display: "KFC",
    // Rows: breast/tenders/drumstick "mealsprices.com national average Apr 2026";
    // bucket "kf-menu.com Jul 2026"; Famous Bowl "PriceListo national average, seen Jul 17 2026".
    observed: "April to July 2026",
    siblings: [
      { path: P.chipotle, label: "Chipotle", why: "the other chain where you can buy chicken without buying bread" },
      { path: P.mcdonalds, label: "McDonald's", why: "McNuggets against Original Recipe tenders is the cleanest head-to-head in the study" },
      { path: P.wendys, label: "Wendy's", why: "the spicy chicken sandwich is the direct competitor to everything on this page" },
    ],
  },
  tacoBell: {
    chain: "Taco Bell",
    path: P.tacoBell,
    display: "Taco Bell",
    // All 5 Taco Bell rows: "Taco Bell store menu API snapshot, Apr 2026".
    observed: "April 2026",
    siblings: [
      { path: P.chipotle, label: "Chipotle", why: "roughly the same food at roughly four times the price, and the ratios do not go the way you would guess" },
      { path: P.mcdonalds, label: "McDonald's", why: "the other value menu, and the one where cheap items also win" },
      { path: P.kfc, label: "KFC", why: "where the quesadilla money would have gone further" },
    ],
  },
  chipotle: {
    chain: "Chipotle",
    path: P.chipotle,
    display: "Chipotle",
    // High Protein Cup: "Chipotle's own published national weighted average at launch, Dec 2025 press release".
    // The three bowls: chipotlemenus.us / bowl tracker averages, Jun 2026.
    observed: "December 2025 for the High Protein Cup, June 2026 for the bowls",
    siblings: [
      { path: P.tacoBell, label: "Taco Bell", why: "the cheap version of the same burrito, and it holds up better than the price gap suggests" },
      { path: P.kfc, label: "KFC", why: "the other way to buy a pile of chicken with no bread attached" },
      { path: P.wendys, label: "Wendy's", why: "if you want the steak-bowl money to do something useful instead" },
    ],
  },
  wendys: {
    chain: "Wendy's",
    path: P.wendys,
    display: "Wendy's",
    // All 4 Wendy's rows: "Wendy's own national baseline menu price, order.wendys.com, Jul 16 2026; a la carte".
    observed: "July 16, 2026",
    siblings: [
      { path: P.mcdonalds, label: "McDonald's", why: "the burger comparison everyone actually wants, and it is not close" },
      { path: P.kfc, label: "KFC", why: "where the chicken sandwich money buys more grams" },
      { path: P.tacoBell, label: "Taco Bell", why: "the only chain in the study that goes cheaper per item than the Jr. Bacon Cheeseburger" },
    ],
  },
};

/**
 * Structured data for a chain page.
 *
 * WHAT IS HERE AND WHY, checked against the live Google Search Central
 * structured-data gallery (developers.google.com/search/docs/appearance/
 * structured-data/search-gallery) rather than assumed:
 *
 *  - Dataset   -> a currently supported feature ("Large data sets that appear in
 *                 Google Dataset Search"). This is the only type on the page
 *                 that can earn a real Google feature, and a dated, sourced,
 *                 downloadable price table is exactly what it is for.
 *  - Breadcrumb-> a currently supported feature.
 *  - WebPage   -> no rich result of its own; it is the entity glue that ties the
 *                 page to #website / #organization and names the Dataset as its
 *                 mainEntity.
 *  - ItemList  -> NOT a standalone feature in the gallery, and no rich result is
 *                 expected from it. It is included anyway because the brief is
 *                 machine-readability, not rich results: ItemList with explicit
 *                 `position` is the one unambiguous way to tell a crawler or an
 *                 LLM extractor that these rows are *ranked* and in what order.
 *                 It is valid schema.org and it is not retired.
 *
 * WHAT IS DELIBERATELY ABSENT:
 *
 *  - FAQPage   -> RETIRED. Google stopped showing FAQ rich results in May 2026
 *                 and is removing the search appearance, the rich result report
 *                 and Rich Results Test support during June-August 2026.
 *                 (developers.google.com/search/blog/2023/08/howto-faq-changes)
 *  - HowTo     -> RETIRED, September 2023, desktop and mobile.
 *  - Product / Offer -> we do not sell these items and we are not the merchant.
 *                 Marking a Big Mac as our Product with our price would be a
 *                 misrepresentation of a national-average tracker figure as a
 *                 live offer, and Google's structured-data policies treat that
 *                 as grounds for a manual action. Skipped on purpose.
 *  - Review / aggregateRating -> no real reviews exist. Never invent them.
 */
export function chainSchemas(opts: {
  page: ChainPage;
  items: Item[];
  title: string;
  description: string;
}) {
  const { page, items, title, description } = opts;
  const url = `${SITE}${page.path}`;

  const dataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${url}#dataset`,
    name: `${page.chain} protein per dollar, ${items.length} menu items`,
    description,
    url,
    inLanguage: "en-US",
    license: `${SITE}/methodology/#data-license`,
    isAccessibleForFree: true,
    creator: { "@id": `${SITE}/#organization` },
    publisher: { "@id": `${SITE}/#organization` },
    spatialCoverage: "United States",
    keywords: [
      `${page.chain} protein per dollar`,
      "protein per dollar fast food",
      "high protein fast food",
      "fast food protein",
    ],
    variableMeasured: [
      { "@type": "PropertyValue", name: "Protein per item", unitText: "grams" },
      { "@type": "PropertyValue", name: "Menu price", unitText: "USD" },
      { "@type": "PropertyValue", name: "Protein per dollar", unitText: "grams per USD" },
    ],
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: `${SITE}${CSV_PATH}`,
      },
    ],
    // The parent study, as a nested Dataset. It needs its own description and
    // distribution: the technical-SEO test walks every node recursively, and a
    // Dataset without them is not eligible for Dataset Search either.
    isPartOf: {
      "@type": "Dataset",
      "@id": `${SITE}${CSV_PATH}#dataset`,
      name: `Fast food protein per dollar, ${STUDY_SIZE} items across ${STUDY_CHAINS} US chains`,
      description: `Protein grams and menu prices for ${STUDY_SIZE} fast food items across ${STUDY_CHAINS} US chains, with protein per dollar computed for each. Protein from each chain's own published nutrition data, prices observed 2025 to 2026 with the basis named per row.`,
      url: `${SITE}${PARENT_PATH}`,
      license: `${SITE}/methodology/#data-license`,
      isAccessibleForFree: true,
      distribution: [
        {
          "@type": "DataDownload",
          encodingFormat: "text/csv",
          contentUrl: `${SITE}${CSV_PATH}`,
        },
      ],
    },
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${url}#ranking`,
    name: `${page.chain} menu items ranked by protein per dollar`,
    description: `Prices observed ${page.observed}. Protein grams from ${possessive(page.chain)} own published nutrition data.`,
    numberOfItems: items.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.item,
      description:
        `${it.proteinG} g protein for ${usd(it.priceUsd)}, ` +
        `${it.perDollar} g of protein per dollar. ` +
        `Price basis: ${it.priceBasis}. Protein source: ${it.proteinSource}.`,
    })),
  };

  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Fast Food Protein per Dollar",
        item: `${SITE}${PARENT_PATH}`,
      },
      { "@type": "ListItem", position: 3, name: `${page.chain} Protein per Dollar`, item: url },
    ],
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    name: title,
    url,
    description,
    inLanguage: "en-US",
    isPartOf: { "@id": `${SITE}/#website` },
    publisher: { "@id": `${SITE}/#organization` },
    breadcrumb: { "@id": `${url}#breadcrumb` },
    mainEntity: { "@id": `${url}#dataset` },
    significantLink: `${SITE}${PARENT_PATH}`,
    datePublished: "2026-07-28",
  };

  return [webPage, dataset, itemList, breadcrumbList];
}
