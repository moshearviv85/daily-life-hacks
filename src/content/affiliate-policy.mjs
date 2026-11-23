/**
 * Affiliate links stay off until AFFILIATE_LINKS_ENABLED is explicitly true.
 * affiliateEligible in article frontmatter also defaults to false.
 *
 * Hard exclusions, whether or not the flag is on:
 * - health-claim pages (constipation, weight loss, gut health)
 * - recipe nutrition blocks (the calories bar, the NutritionInformation
 *   schema, and a markdown section titled Nutrition)
 * - study data tables and data pages
 */
import { extractFrontmatterField } from "./modified-date.mjs";

export const AFFILIATE_REL = "sponsored nofollow noopener";
export const DISCLOSURE_PATH = "/disclaimer/";
export const AFFILIATE_MARKER = "(affiliate)";
export const AFFILIATE_DISCLOSURE_BEFORE =
  "This page includes affiliate links. If you buy through one, we may earn a commission at no extra cost to you. See our ";
export const AFFILIATE_DISCLOSURE_LINK = "disclosure";
export const AFFILIATE_DISCLOSURE_AFTER = ".";

const HEALTH_CLAIM = /constipation|weight loss|gut health|gut friendly/i;
const NUTRITION_HEADING = /^(nutrition facts|nutrition information|nutrition)$/i;
const AFFILIATE_MARKER_RE = /data-affiliate\b|<AffiliateLink\b|rel\s*=\s*["'][^"']*\bsponsored\b/i;

export function affiliateLinksEnabled(env = process.env) {
  const raw = env.AFFILIATE_LINKS_ENABLED;
  if (raw == null || String(raw).trim() === "") return false;
  return ["1", "true", "yes", "on"].includes(String(raw).trim().toLowerCase());
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function assertAffiliateHref(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    throw new Error("Affiliate link needs an absolute http(s) URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Affiliate link must be an http(s) URL");
  }
  return url;
}

export function affiliateDisclosureHtml() {
  return (
    `<p class="affiliate-disclosure">${AFFILIATE_DISCLOSURE_BEFORE}` +
    `<a href="${DISCLOSURE_PATH}">${AFFILIATE_DISCLOSURE_LINK}</a>` +
    `${AFFILIATE_DISCLOSURE_AFTER}</p>`
  );
}

/**
 * Render one affiliate anchor. When the flag is off, the original text is
 * returned unchanged so a disabled component adds no sponsored markup.
 */
export function renderAffiliateLink({ enabled, href, text, html, disclose = true }) {
  const inner = html != null ? String(html) : escapeHtml(text ?? "");
  if (!enabled) return inner;
  assertAffiliateHref(href);
  const marker = inner.includes(AFFILIATE_MARKER)
    ? ""
    : ` <span class="affiliate-marker">${AFFILIATE_MARKER}</span>`;
  const link =
    `<a href="${escapeHtml(href)}" rel="${AFFILIATE_REL}" target="_blank">` +
    `${inner}${marker}</a>`;
  if (!disclose) return link;
  return `${affiliateDisclosureHtml()}${link}`;
}

export function affiliateContextBlock(context) {
  switch (context) {
    case "recipe-nutrition":
      return "recipe nutrition block";
    case "study-table":
      return "study data table";
    case "health-claim":
      return "health-claim page";
    case "data-page":
      return "data page";
    default:
      return null;
  }
}

export function hasAffiliateMarker(source) {
  return AFFILIATE_MARKER_RE.test(source ?? "");
}

export function isHealthClaimPage({ slug = "", title = "", tags = [] } = {}) {
  const hay = [slug, title, ...tags].join(" ").replace(/[-_]/g, " ");
  return HEALTH_CLAIM.test(hay);
}

export function isDataPagePath(relPath) {
  const path = String(relPath).replace(/\\/g, "/");
  return (
    path.startsWith("src/pages/data/") ||
    path === "src/pages/data/index.astro" ||
    path.startsWith("src/pages/statistics/") ||
    path === "src/pages/statistics/index.astro" ||
    path.startsWith("src/pages/food-value-database/") ||
    path === "src/pages/food-value-database/index.astro"
  );
}

export function pageExclusion(article, studySlugs) {
  if (isHealthClaimPage(article)) return "health-claim page";
  if (studySlugs?.has(article.slug)) return "study data page";
  return null;
}

export function extractTags(markdown) {
  const frontmatter = String(markdown ?? "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return [];
  const block = frontmatter[1];
  const inline = block.match(/^tags:\s*\[(.*)\]\s*$/m);
  if (inline) {
    return [...inline[1].matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
  }
  const lines = block.split(/\n/);
  const start = lines.findIndex((line) => /^tags:\s*$/.test(line));
  if (start === -1) return [];
  const tags = [];
  for (const line of lines.slice(start + 1)) {
    const item = line.match(/^\s*-\s+["']?(.+?)["']?\s*$/);
    if (!item) break;
    tags.push(item[1]);
  }
  return tags;
}

export function parseAffiliateEligible(raw) {
  if (raw == null || raw === "") return false;
  if (/^(true|yes|1)$/i.test(raw)) return true;
  if (/^(false|no|0)$/i.test(raw)) return false;
  throw new Error(`affiliateEligible must be true or false, got ${raw}`);
}

export function readArticleFields(markdown, slug) {
  return {
    slug,
    title: extractFrontmatterField(markdown, "title") || "",
    category: extractFrontmatterField(markdown, "category") || "",
    tags: extractTags(markdown),
    affiliateEligible: parseAffiliateEligible(
      extractFrontmatterField(markdown, "affiliateEligible"),
    ),
    body: String(markdown).replace(/^---\r?\n[\s\S]*?\r?\n---/, ""),
    raw: String(markdown),
  };
}

export function recipeNutritionSection(body) {
  const lines = String(body ?? "").split(/\n/);
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const marks = lines[i].match(/^(#{1,6})\s+(.*)$/);
    if (!marks) continue;
    const headingLevel = marks[1].length;
    if (start === -1) {
      if (NUTRITION_HEADING.test(marks[2].trim())) {
        start = i + 1;
        level = headingLevel;
      }
    } else if (headingLevel <= level) {
      return lines.slice(start, i).join("\n");
    }
  }
  return start === -1 ? "" : lines.slice(start).join("\n");
}

export function markdownTables(body) {
  const tables = [];
  let current = [];
  for (const line of String(body ?? "").split(/\n/)) {
    if (/^\s*\|/.test(line)) {
      current.push(line);
    } else if (current.length) {
      tables.push(current.join("\n"));
      current = [];
    }
  }
  if (current.length) tables.push(current.join("\n"));
  return tables;
}

export function studySlugsFromRegistry(source) {
  const start = source.indexOf("export const DATASETS");
  const end = source.indexOf("export const FIBER_INDEX_NAME");
  if (start < 0 || end < start) {
    throw new Error("Could not find the DATASETS block in datasets.ts");
  }
  const block = source.slice(start, end);
  return new Set(
    [...block.matchAll(/^\s*"([a-z0-9-]+)":\s*\{/gm)].map((match) => match[1]),
  );
}

/**
 * @returns {string[]} human-readable build failures
 */
export function articleViolations(article, studySlugs, { enabled = false } = {}) {
  const violations = [];
  const exclusion = pageExclusion(article, studySlugs);
  const marked = hasAffiliateMarker(article.raw ?? article.body ?? "");
  if (article.affiliateEligible && exclusion) {
    violations.push(
      `${article.slug}: affiliateEligible cannot be set on a ${exclusion}`,
    );
  }
  if (marked && exclusion) {
    violations.push(`${article.slug}: affiliate link on a ${exclusion}`);
  }
  if (marked && !enabled) {
    violations.push(
      `${article.slug}: affiliate link in content while AFFILIATE_LINKS_ENABLED is off`,
    );
  }
  if (article.category === "recipes" && hasAffiliateMarker(recipeNutritionSection(article.body))) {
    violations.push(`${article.slug}: affiliate link inside a recipe nutrition block`);
  }
  if (studySlugs?.has(article.slug)) {
    for (const table of markdownTables(article.body)) {
      if (hasAffiliateMarker(table)) {
        violations.push(`${article.slug}: affiliate link inside a study data table`);
        break;
      }
    }
  }
  return violations;
}

export function collectAffiliateViolations({
  articles,
  dataPages = [],
  recipeMetaBar = "",
  nutritionSchema = "",
  studySlugs,
  enabled = false,
}) {
  const violations = [];
  for (const article of articles) {
    violations.push(...articleViolations(article, studySlugs, { enabled }));
  }
  for (const page of dataPages) {
    if (hasAffiliateMarker(page.source)) {
      violations.push(`${page.path}: affiliate link on a data page`);
    }
  }
  if (hasAffiliateMarker(recipeMetaBar)) {
    violations.push(
      "src/components/RecipeMetaBar.astro: affiliate link inside a recipe nutrition block",
    );
  }
  if (hasAffiliateMarker(nutritionSchema)) {
    violations.push("recipe nutrition schema: affiliate link inside a recipe nutrition block");
  }
  return violations;
}
