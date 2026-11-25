/**
 * Markdown tables and explicit heading ids for article HTML.
 *
 * Runs in Astro's rehype pipeline before Astro assigns heading ids, so an
 * author-written `{#id}` is kept and the table of contents uses that slug.
 * Every markdown table gets a visually hidden caption and column scope on
 * header cells. The caption comes from a `Table: ...` line directly above
 * the table, otherwise the nearest preceding heading, otherwise the page
 * title (the H1, which lives in frontmatter when the table leads the body).
 */
import { readFileSync } from "node:fs";
import { extractFrontmatterField } from "../src/content/modified-date.mjs";

const HEADING = /^h[1-6]$/;
const EXPLICIT_HEADING_ID = /\s*\{#([A-Za-z0-9][A-Za-z0-9_-]*)\}\s*$/;
const TABLE_INTRO = /^Table:\s+(\S[\s\S]*)$/;

function walk(node, fn) {
  if (!node || typeof node !== "object") return;
  fn(node);
  if (!Array.isArray(node.children)) return;
  for (const child of node.children) walk(child, fn);
}

function nodeText(node) {
  if (!node) return "";
  if (node.type === "text") return node.value || "";
  if (node.type !== "element" || !Array.isArray(node.children)) return "";
  return node.children.map(nodeText).join("");
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parentMap(tree) {
  const parents = new Map();
  walk(tree, (node) => {
    for (const child of node.children || []) parents.set(child, node);
  });
  return parents;
}

function collectTextNodes(node, out) {
  if (!node) return;
  if (node.type === "text") {
    out.push(node);
    return;
  }
  if (node.type !== "element") return;
  for (const child of node.children || []) collectTextNodes(child, out);
}

/**
 * `## Question? {#existing-anchor}` keeps the old id when the heading is renamed.
 * Astro's own slugger leaves an id that is already set.
 */
export function applyExplicitHeadingIds(tree) {
  walk(tree, (node) => {
    if (node.type !== "element" || !HEADING.test(node.tagName)) return;
    const textNodes = [];
    collectTextNodes(node, textNodes);
    if (!textNodes.length) return;
    const full = textNodes.map((item) => item.value).join("");
    const match = full.match(EXPLICIT_HEADING_ID);
    if (!match) return;

    let remaining = match[0].length;
    for (let i = textNodes.length - 1; i >= 0 && remaining > 0; i -= 1) {
      const value = textNodes[i].value;
      if (value.length <= remaining) {
        remaining -= value.length;
        textNodes[i].value = "";
      } else {
        textNodes[i].value = value.slice(0, value.length - remaining);
        remaining = 0;
      }
    }

    node.properties = { ...(node.properties || {}), id: match[1] };
  });
}

function lastHeading(node) {
  if (!node || node.type !== "element") return null;
  if (HEADING.test(node.tagName)) return node;
  let found = null;
  for (const child of node.children || []) {
    const next = lastHeading(child);
    if (next) found = next;
  }
  return found;
}

function nearestHeadingText(table, parents) {
  let current = table;
  while (current) {
    const parent = parents.get(current);
    if (!parent?.children) break;
    const index = parent.children.indexOf(current);
    for (let i = index - 1; i >= 0; i -= 1) {
      const heading = lastHeading(parent.children[i]);
      if (heading) return clean(nodeText(heading));
    }
    current = parent;
  }
  return "";
}

function tableIntro(table, parents) {
  const parent = parents.get(table);
  if (!parent?.children) return null;
  const index = parent.children.indexOf(table);
  for (let i = index - 1; i >= 0; i -= 1) {
    const sibling = parent.children[i];
    if (sibling.type === "text" && !String(sibling.value || "").trim()) continue;
    if (sibling.type !== "element" || sibling.tagName !== "p") return null;
    const match = clean(nodeText(sibling)).match(TABLE_INTRO);
    if (!match) return null;
    return { parent, node: sibling, caption: clean(match[1]) };
  }
  return null;
}

function pageTitle(file) {
  const rawPath = file?.path || file?.history?.[0] || "";
  if (!rawPath) return "";
  try {
    return clean(extractFrontmatterField(readFileSync(rawPath, "utf8"), "title") || "");
  } catch {
    return "";
  }
}

function hasCaption(table) {
  return (table.children || []).some(
    (child) => child.type === "element" && child.tagName === "caption",
  );
}

function scopeHeaderCells(table) {
  const thead = (table.children || []).find(
    (child) => child.type === "element" && child.tagName === "thead",
  );
  if (!thead) return;
  walk(thead, (node) => {
    if (node.type !== "element" || node.tagName !== "th") return;
    if (typeof node.properties?.scope === "string" && node.properties.scope) return;
    node.properties = { ...(node.properties || {}), scope: "col" };
  });
}

function captionElement(value) {
  return {
    type: "element",
    tagName: "caption",
    properties: { className: ["sr-only"] },
    children: [{ type: "text", value }],
  };
}

export function applyTableSemantics(tree, file) {
  const parents = parentMap(tree);
  const tables = [];
  walk(tree, (node) => {
    if (node.type === "element" && node.tagName === "table") tables.push(node);
  });

  const removals = [];
  for (const table of tables) {
    scopeHeaderCells(table);
    if (hasCaption(table)) continue;
    const intro = tableIntro(table, parents);
    const caption =
      intro?.caption || nearestHeadingText(table, parents) || pageTitle(file) || "Table";
    table.children = [captionElement(caption), ...(table.children || [])];
    if (intro) removals.push(intro);
  }

  for (const intro of removals) {
    const index = intro.parent.children.indexOf(intro.node);
    if (index !== -1) intro.parent.children.splice(index, 1);
  }
  return tree;
}

export function applyArticleSemantics(tree, file) {
  applyExplicitHeadingIds(tree);
  applyTableSemantics(tree, file);
  return tree;
}

export default function rehypeArticleSemantics() {
  return (tree, file) => {
    applyArticleSemantics(tree, file);
  };
}
