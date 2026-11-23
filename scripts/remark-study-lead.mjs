/**
 * Lift the opening answer paragraph (two paragraphs when the first line is
 * the shared unit boilerplate) into remark frontmatter so the study page can
 * render it, then the price box, then the rest of the article.
 */

import { GROCERY_STUDY_PAGES, UNIT_BOILERPLATE } from "../src/content/price-basis.mjs";

function inlineText(node) {
  if (!node) return "";
  if (node.type === "text") return node.value;
  if (node.type === "inlineCode") return `\`${node.value}\``;
  if (node.type === "link") {
    return `[${(node.children ?? []).map(inlineText).join("")}](${node.url})`;
  }
  if (node.type === "strong") {
    return `**${(node.children ?? []).map(inlineText).join("")}**`;
  }
  if (node.type === "emphasis") {
    return `*${(node.children ?? []).map(inlineText).join("")}*`;
  }
  return (node.children ?? []).map(inlineText).join("");
}

function slugFromFile(file) {
  const path = file.path || file.history?.[0] || "";
  return path.match(/([a-z0-9-]+)\.md$/)?.[1] ?? "";
}

export default function remarkStudyLead() {
  return (tree, file) => {
    const slug = slugFromFile(file);
    if (!GROCERY_STUDY_PAGES[slug]) return;

    const paragraphs = tree.children.filter((node) => node.type === "paragraph");
    if (!paragraphs.length) return;

    const firstText = inlineText(paragraphs[0]).trim();
    const take =
      firstText === UNIT_BOILERPLATE && paragraphs[1] ? [paragraphs[0], paragraphs[1]] : [paragraphs[0]];
    const lead = take.map((node) => inlineText(node).trim()).filter(Boolean);
    if (!lead.length) return;

    file.data.astro ??= { frontmatter: {} };
    file.data.astro.frontmatter ??= {};
    file.data.astro.frontmatter.studyLeadMarkdown = lead.join("\n\n");

    const drop = new Set(take);
    tree.children = tree.children.filter((node) => !drop.has(node));
  };
}
