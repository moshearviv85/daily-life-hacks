/**
 * Rewrite `data-affiliate` anchors only when AFFILIATE_LINKS_ENABLED is true.
 * With the flag off this plugin is not registered, and if it were it would
 * leave the tree untouched.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  AFFILIATE_DISCLOSURE_AFTER,
  AFFILIATE_DISCLOSURE_BEFORE,
  AFFILIATE_DISCLOSURE_LINK,
  AFFILIATE_MARKER,
  AFFILIATE_REL,
  DISCLOSURE_PATH,
  affiliateLinksEnabled,
  pageExclusion,
  readArticleFields,
  studySlugsFromRegistry,
} from "../src/content/affiliate-policy.mjs";

const NUTRITION_HEADING = /^(nutrition facts|nutrition information|nutrition)$/i;
const FLOW_PARENTS = new Set([
  "div",
  "section",
  "article",
  "main",
  "li",
  "blockquote",
  "body",
  "td",
  "th",
]);

let cachedStudySlugs;

function studySlugs() {
  if (!cachedStudySlugs) {
    const source = readFileSync(
      fileURLToPath(new URL("../src/content/datasets.ts", import.meta.url)),
      "utf8",
    );
    cachedStudySlugs = studySlugsFromRegistry(source);
  }
  return cachedStudySlugs;
}

function classList(node) {
  const value = node?.properties?.className;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(/\s+/).filter(Boolean);
  return [];
}

function nodeText(node) {
  if (!node) return "";
  if (node.type === "text") return node.value || "";
  if (!Array.isArray(node.children)) return "";
  return node.children.map(nodeText).join("");
}

function isAffiliateAnchor(node) {
  if (!node || node.type !== "element" || node.tagName !== "a") return false;
  const props = node.properties || {};
  if (props.dataAffiliate != null || props["data-affiliate"] != null) return true;
  const rel = Array.isArray(props.rel) ? props.rel.join(" ") : String(props.rel || "");
  return /\bsponsored\b/.test(rel);
}

function disclosureElement() {
  return {
    type: "element",
    tagName: "p",
    properties: { className: ["affiliate-disclosure"] },
    children: [
      { type: "text", value: AFFILIATE_DISCLOSURE_BEFORE },
      {
        type: "element",
        tagName: "a",
        properties: { href: DISCLOSURE_PATH },
        children: [{ type: "text", value: AFFILIATE_DISCLOSURE_LINK }],
      },
      { type: "text", value: AFFILIATE_DISCLOSURE_AFTER },
    ],
  };
}

function walk(node, ancestors, visit) {
  if (!node || typeof node !== "object") return;
  visit(node, ancestors);
  if (!Array.isArray(node.children)) return;
  for (let index = 0; index < node.children.length; index += 1) {
    walk(node.children[index], ancestors.concat({ node, index }), visit);
  }
}

function slugFromFile(file) {
  const raw = file?.path || file?.history?.[0] || "";
  return String(raw).split(/[/\\]/).pop().replace(/\.mdx?$/i, "");
}

/**
 * @param {object} tree
 * @param {{ enabled?: boolean, slug?: string, title?: string, category?: string, tags?: string[], studySlugs?: Set<string> }} article
 */
export function transformAffiliateTree(tree, article) {
  if (!article?.enabled) return;
  const slugs = article.studySlugs ?? new Set();
  let inNutrition = false;
  let nutritionLevel = 0;
  const anchors = [];

  walk(tree, [], (node, ancestors) => {
    if (node.type === "element" && /^h[1-6]$/.test(node.tagName || "")) {
      const level = Number(node.tagName.slice(1));
      if (inNutrition && level <= nutritionLevel) inNutrition = false;
      if (NUTRITION_HEADING.test(nodeText(node).trim())) {
        inNutrition = true;
        nutritionLevel = level;
      }
    }
    if (!isAffiliateAnchor(node)) return;
    anchors.push({
      node,
      ancestors,
      inNutrition,
      inTable: ancestors.some((ancestor) => ancestor.node.tagName === "table"),
    });
  });

  if (anchors.length === 0) return;

  const slug = article.slug || "page";
  if (article.category === "recipes" && anchors.some((anchor) => anchor.inNutrition)) {
    throw new Error(`${slug}: affiliate link inside a recipe nutrition block`);
  }
  if (slugs.has(slug) && anchors.some((anchor) => anchor.inTable)) {
    throw new Error(`${slug}: affiliate link inside a study data table`);
  }
  const exclusion = pageExclusion(
    { slug, title: article.title || "", tags: article.tags || [] },
    slugs,
  );
  if (exclusion) {
    throw new Error(`${slug}: affiliate link on a ${exclusion}`);
  }

  let disclosed = false;
  for (const anchor of anchors) {
    anchor.node.properties = {
      ...(anchor.node.properties || {}),
      rel: AFFILIATE_REL.split(" "),
      target: "_blank",
      dataAffiliate: "true",
    };
    if (!nodeText(anchor.node).includes(AFFILIATE_MARKER)) {
      anchor.node.children = anchor.node.children || [];
      anchor.node.children.push(
        { type: "text", value: " " },
        {
          type: "element",
          tagName: "span",
          properties: { className: ["affiliate-marker"] },
          children: [{ type: "text", value: AFFILIATE_MARKER }],
        },
      );
    }
    if (disclosed) continue;
    insertDisclosure(anchor.ancestors);
    disclosed = true;
  }
}

function insertDisclosure(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i -= 1) {
    const parent = ancestors[i].node;
    const flow = parent.type === "root" || FLOW_PARENTS.has(parent.tagName);
    if (!flow) continue;
    const index = ancestors[i].index;
    const previous = parent.children[index - 1];
    if (classList(previous).includes("affiliate-disclosure")) return;
    parent.children.splice(index, 0, disclosureElement());
    return;
  }
}

export default function rehypeAffiliateLinks() {
  return (tree, file) => {
    if (!affiliateLinksEnabled()) return;
    const slug = slugFromFile(file);
    let fields = {
      slug,
      title: "",
      category: "",
      tags: [],
      affiliateEligible: false,
    };
    if (file?.data?.affiliateArticle) {
      fields = { ...fields, ...file.data.affiliateArticle, slug };
    } else if (file?.path && existsSync(file.path)) {
      fields = readArticleFields(readFileSync(file.path, "utf8"), slug);
    }
    transformAffiliateTree(tree, {
      ...fields,
      enabled: true,
      studySlugs: file?.data?.studySlugs || studySlugs(),
    });
  };
}
