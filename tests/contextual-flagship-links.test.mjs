import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { applyContextualFlagshipLinks } from "../scripts/rehype-contextual-flagship-links.mjs";
import {
  contextualFlagshipLinkAllowed,
  contextualFlagshipPathname,
  isContextualFlagshipHref,
} from "../src/content/contextual-flagship-links.mjs";

const root = join(import.meta.dirname, "..");

test("flagship anchors render only on nutrition pages with a budget or per-dollar tag", () => {
  assert.equal(
    contextualFlagshipLinkAllowed({
      category: "nutrition",
      tags: ["high fiber on a budget"],
    }),
    true,
  );
  assert.equal(
    contextualFlagshipLinkAllowed({
      category: "nutrition",
      tags: ["protein per dollar"],
    }),
    true,
  );
  assert.equal(
    contextualFlagshipLinkAllowed({
      category: "nutrition",
      tags: ["fiber"],
    }),
    false,
  );
  assert.equal(
    contextualFlagshipLinkAllowed({
      category: "recipes",
      tags: ["budget", "per dollar"],
    }),
    false,
  );
  assert.equal(
    contextualFlagshipLinkAllowed({
      category: "tips",
      tags: ["grocery budget"],
    }),
    false,
  );
  assert.equal(isContextualFlagshipHref("/methodology/#data-license"), true);
  assert.equal(
    isContextualFlagshipHref("/fiber-per-dollar-cheapest-high-fiber-foods/#grains"),
    true,
  );
  assert.equal(isContextualFlagshipHref("/recipes/"), false);
});

test("ineligible article markdown keeps flagship link text without the anchor", () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "p",
        children: [
          { type: "text", value: "See the " },
          {
            type: "element",
            tagName: "a",
            properties: { href: "/fiber-per-dollar-cheapest-high-fiber-foods/" },
            children: [{ type: "text", value: "fiber per dollar ranking" }],
          },
          { type: "text", value: " and the " },
          {
            type: "element",
            tagName: "a",
            properties: { href: "/easy-black-bean-tacos-weeknight-dinner/" },
            children: [{ type: "text", value: "taco recipe" }],
          },
          { type: "text", value: "." },
        ],
      },
    ],
  };

  applyContextualFlagshipLinks(tree, {
    path: join(root, "src/data/articles/easy-black-bean-tacos-weeknight-dinner.md"),
  });

  const paragraph = tree.children[0];
  assert.equal(
    paragraph.children.some((child) => child.tagName === "a" && child.properties.href.includes("fiber-per-dollar")),
    false,
  );
  assert.equal(
    paragraph.children.some((child) => child.type === "text" && child.value === "fiber per dollar ranking"),
    true,
  );
  assert.equal(
    paragraph.children.some((child) => child.tagName === "a" && child.properties.href.includes("easy-black-bean")),
    true,
  );
});

test("an eligible nutrition article keeps its flagship anchor", () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "p",
        children: [
          {
            type: "element",
            tagName: "a",
            properties: { href: "/protein-per-dollar-cheapest-protein-sources/" },
            children: [{ type: "text", value: "protein per dollar ranking" }],
          },
        ],
      },
    ],
  };

  applyContextualFlagshipLinks(tree, {
    path: join(root, "src/data/articles/high-protein-on-a-budget-complete-guide.md"),
  });

  assert.equal(tree.children[0].children[0].tagName, "a");
});

const flagships = [
  "/fiber-per-dollar-cheapest-high-fiber-foods/",
  "/protein-per-dollar-cheapest-protein-sources/",
  "/methodology/",
  "/how-to-eat-more-fiber-on-a-budget/",
  "/how-to-eat-more-fiber-on-a-budget-complete-guide/",
  "/high-protein-on-a-budget-complete-guide/",
];

function categoryFor(slug) {
  const path = join(root, "src/data/articles", `${slug}.md`);
  if (!existsSync(path)) return "";
  const frontmatter = readFileSync(path, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  return (frontmatter.match(/^category:\s*(.+)$/m)?.[1] ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

function contextualHtml(html) {
  const start = html.search(/<div\b[^>]*class=(['"])[^'"]*\barticle-content\b[^'"]*\1[^>]*>/i);
  if (start < 0) return "";
  const rest = html.slice(start);
  const end = rest.indexOf("<!-- Tags -->");
  return end >= 0 ? rest.slice(0, end) : rest;
}

function flagshipHits(html) {
  const hits = new Set();
  for (const match of html.matchAll(/<a\b[^>]*href=(['"])(.*?)\1/gi)) {
    const path = contextualFlagshipPathname(match[2]);
    if (!path || !isContextualFlagshipHref(match[2])) continue;
    const canonical = path === "/how-to-eat-more-fiber-on-a-budget"
      ? "/how-to-eat-more-fiber-on-a-budget-complete-guide"
      : path;
    hits.add(`${canonical}/`);
  }
  return hits;
}

test("built articles keep flagship in-body links contextual", () => {
  const dist = join(root, "dist");
  if (!existsSync(join(dist, "index.html"))) return;

  const counts = Object.fromEntries(flagships.map((flagship) => [flagship, new Set()]));
  const recipePages = [];

  for (const entry of readdirSync(dist, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const htmlPath = join(dist, entry.name, "index.html");
    if (!existsSync(htmlPath)) continue;
    const html = readFileSync(htmlPath, "utf8");
    const slug = html.match(/data-base-slug=(['"])([^'"]+)\1/)?.[2];
    if (!slug) continue;
    const hits = flagshipHits(contextualHtml(html));
    if (categoryFor(slug) === "recipes" && hits.size) recipePages.push(slug);
    for (const flagship of hits) counts[flagship].add(slug);
  }

  const recipesHub = readFileSync(join(dist, "recipes", "index.html"), "utf8");
  const recipesMain = recipesHub.split(/<footer\b/i)[0];
  assert.equal(flagshipHits(recipesMain).size, 0, "recipe category page should not link flagships");
  assert.deepEqual(recipePages, []);
  for (const [flagship, sources] of Object.entries(counts)) {
    assert.ok(
      sources.size <= 25,
      `${flagship} has ${sources.size} in-body article inlinks`,
    );
  }
});
