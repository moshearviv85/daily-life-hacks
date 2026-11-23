/**
 * Canonical identity for David Miller, the site's disclosed pen name.
 * Article, recipe, feed, and dataset author nodes should point here.
 */
export const AUTHOR_NAME = "David Miller";
export const AUTHOR_PATH = "/author/david-miller/";
export const AUTHOR_SITE_URL = "https://www.daily-life-hacks.com";
export const AUTHOR_URL = `${AUTHOR_SITE_URL}${AUTHOR_PATH}`;
/** Stable Person @id. The profile page is the node this fragment belongs to. */
export const AUTHOR_ID = `${AUTHOR_URL}#person`;
export const AUTHOR_PAGE_ID = `${AUTHOR_URL}#webpage`;
export const AUTHOR_JOB_TITLE = "Founder and Editor";

/**
 * Pen-name disclosure plus the grocery-cost work. No degrees, licenses,
 * or job titles beyond Founder and Editor.
 */
export const AUTHOR_DESCRIPTION =
  "Pen name of the founder and editor of Daily Life Hacks, used for privacy and disclosed as such. Publishes grocery cost research and nutrition-per-dollar studies from USDA FoodData Central and published price data, with the calculation rows public. Not a chef, registered dietitian, or medical professional. Daily Life Hacks is the publisher of record for the data studies.";

export const AUTHOR_KNOWS_ABOUT = [
  "Grocery Cost Research",
  "Nutrition per Dollar",
  "USDA Food Data",
  "Budget Cooking",
] as const;

/** Frontmatter values that are not a different person. */
const GENERIC_AUTHORS = new Set(["", "Daily Life Hacks Team"]);

export function resolveAuthorName(raw: string | undefined | null): string {
  const name = (raw ?? "").trim();
  if (GENERIC_AUTHORS.has(name)) return AUTHOR_NAME;
  return name;
}
