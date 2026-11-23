/**
 * Drop templated flagship anchors from article HTML unless the article is a
 * nutrition page with a budget or per-dollar tag. The markdown source is not
 * rewritten; ineligible pages keep the link text as plain text.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  contextualFlagshipLinkAllowed,
  isContextualFlagshipHref,
} from "../src/content/contextual-flagship-links.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function articleSlug(file) {
  const raw = file?.path || file?.history?.[0] || "";
  const name = String(raw).split(/[/\\]/).pop() || "";
  return name.replace(/\.mdx?$/i, "");
}

function readFrontmatter(slug) {
  const path = join(root, "src", "data", "articles", `${slug}.md`);
  if (!slug || !existsSync(path)) return null;
  const raw = readFileSync(path, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const frontmatter = match[1];
  const category = (frontmatter.match(/^category:\s*(.+)$/m)?.[1] ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
  const tags = [];
  const inline = frontmatter.match(/^tags:\s*\[(.*)\]\s*$/m);
  if (inline) {
    for (const tag of inline[1].matchAll(/['"]([^'"]+)['"]/g)) tags.push(tag[1]);
  } else {
    let inTags = false;
    for (const line of frontmatter.split(/\r?\n/)) {
      if (line.startsWith("tags:")) {
        inTags = true;
        continue;
      }
      if (!inTags) continue;
      const item = line.match(/^\s+-\s+['"]?(.+?)['"]?\s*$/);
      if (item) tags.push(item[1]);
      else if (line.trim() && !line.startsWith(" ")) inTags = false;
    }
  }
  return { category, tags };
}

function walk(node, fn) {
  if (!node || typeof node !== "object") return;
  const children = node.children;
  if (!Array.isArray(children)) return;
  for (let index = children.length - 1; index >= 0; index -= 1) {
    const child = children[index];
    walk(child, fn);
    fn(child, children, index);
  }
}

export function applyContextualFlagshipLinks(tree, file = {}) {
  const meta = readFrontmatter(articleSlug(file));
  if (!meta) return tree;
  if (contextualFlagshipLinkAllowed(meta)) return tree;

  walk(tree, (node, children, index) => {
    if (node?.type !== "element" || node.tagName !== "a") return;
    const href = node.properties?.href;
    if (!isContextualFlagshipHref(href)) return;
    const replacement = Array.isArray(node.children) && node.children.length
      ? node.children
      : [];
    children.splice(index, 1, ...replacement);
  });
  return tree;
}

export default function rehypeContextualFlagshipLinks() {
  return (tree, file) => {
    applyContextualFlagshipLinks(tree, file);
  };
}
