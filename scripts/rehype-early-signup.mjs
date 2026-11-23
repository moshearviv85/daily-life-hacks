/**
 * Insert one compact signup after the first early table, or after the first
 * paragraph when the page has no opening answer block to hang it on.
 * Pages whose plan is "after-quick-answer" get the form from the article
 * template instead, so it sits under that block rather than inside the body.
 */
import fs from "node:fs";
import path from "node:path";
import { earlySignupNode } from "../src/content/early-signup-form.mjs";
import { getFlagshipEngagement } from "../src/content/flagship-engagement.mjs";
import {
  earlySignupPlan,
  signupContextFromMarkdown,
} from "../src/content/newsletter-variant.mjs";

function articlePath(file) {
  return file?.path || file?.history?.[0] || "";
}

function findParent(tree, target, parent = null) {
  if (tree === target) return parent;
  for (const child of tree.children || []) {
    const found = findParent(child, target, tree);
    if (found) return found;
  }
  return null;
}

function findFirst(node, tagName) {
  if (node?.type === "element" && node.tagName === tagName) return node;
  for (const child of node?.children || []) {
    const found = findFirst(child, tagName);
    if (found) return found;
  }
  return null;
}

export default function rehypeEarlySignup() {
  return (tree, file) => {
    const filePath = articlePath(file);
    if (!filePath.endsWith(".md")) return;
    const slug = path.basename(filePath).replace(/\.md$/i, "");
    if (getFlagshipEngagement(slug)?.emailCapture) return;

    let raw = "";
    try {
      raw = fs.readFileSync(filePath, "utf8");
    } catch {
      return;
    }
    const context = signupContextFromMarkdown(slug, raw);
    const plan = earlySignupPlan(context);
    if (!plan || plan.where === "after-quick-answer") return;

    const anchor = plan.where === "after-table" ? findFirst(tree, "table") : findFirst(tree, "p");
    if (!anchor) return;
    const parent = findParent(tree, anchor);
    if (!parent?.children) return;
    const index = parent.children.indexOf(anchor);
    if (index < 0) return;
    const node = earlySignupNode({
      variant: plan.variant,
      category: context.category,
      baseSlug: slug,
    });
    if (!node) return;
    parent.children.splice(index + 1, 0, node);
  };
}
