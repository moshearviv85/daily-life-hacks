/**
 * Rehype plugin: give "full ranking" markdown tables stay-power, and inject
 * flagship shortlists / mid-article pull quotes from the shared config.
 *
 * The heading ID Astro already generated stays on the H2 so the table of
 * contents does not become a dead click. The stable jump target lives on the
 * wrapping <section id="full-ranking">.
 */
import { FLAGSHIP_ENGAGEMENT } from "../src/content/flagship-engagement.mjs";

export const RANKING_HEADING = /full ranking/i;
export const TOP_N = 5;

function articleSlug(file) {
  const raw = file?.path || file?.history?.[0] || "";
  const name = String(raw).split(/[/\\]/).pop() || "";
  return name.replace(/\.mdx?$/i, "");
}

function nodeText(node) {
  if (!node) return "";
  if (node.type === "text") return node.value || "";
  if (!Array.isArray(node.children)) return "";
  return node.children.map(nodeText).join("");
}

function classList(node) {
  const value = node?.properties?.className;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(/\s+/).filter(Boolean);
  return [];
}

function addClass(node, ...names) {
  const next = new Set([...classList(node), ...names]);
  node.properties = { ...(node.properties || {}), className: [...next] };
}

function el(tagName, properties, children = []) {
  return { type: "element", tagName, properties, children };
}

function text(value) {
  return { type: "text", value };
}

function findChild(node, tagName) {
  return (node.children || []).find(
    (child) => child.type === "element" && child.tagName === tagName,
  );
}

function enhanceRankingTable(table) {
  addClass(table, "ranking-table");
  const tbody = findChild(table, "tbody");
  if (!tbody) return;

  for (const row of tbody.children || []) {
    if (row.type !== "element" || row.tagName !== "tr") continue;
    const firstCell = (row.children || []).find(
      (child) => child.type === "element" && child.tagName === "td",
    );
    const rank = Number.parseInt(nodeText(firstCell).replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(rank) || rank < 1) continue;

    row.properties = { ...(row.properties || {}), id: `rank-${rank}` };
    if (rank <= 3) {
      addClass(row, "ranking-row-top", `ranking-row-top-${rank}`);
    } else if (rank <= TOP_N) {
      addClass(row, "ranking-row-top5");
    }
  }
}

function pullQuoteNode(highlight, disclosure) {
  return el("figure", { className: ["study-pull-quote"] }, [
    el("blockquote", {}, [
      el("p", { className: ["study-pull-quote-value"] }, [text(highlight.value)]),
      el("p", { className: ["study-pull-quote-claim"] }, [text(highlight.claim)]),
    ]),
    el("figcaption", { className: ["study-pull-quote-note"] }, [text(disclosure)]),
  ]);
}

function shortlistNode(shortlist) {
  return el(
    "nav",
    {
      className: ["ranking-shortlist"],
      ariaLabel: shortlist.label,
    },
    [
      el("p", { className: ["ranking-shortlist-kicker"] }, [text(shortlist.label)]),
      el(
        "ul",
        {},
        shortlist.items.map((item) =>
          el("li", {}, [
            el("a", { href: `#rank-${item.rank}` }, [
              text(`${item.label}: ${item.food}, ${item.grams} g`),
            ]),
          ]),
        ),
      ),
    ],
  );
}

/**
 * @param {object} tree
 * @param {{ path?: string, history?: string[] }} [file]
 */
export function applyRankingTables(tree, file = {}) {
  const children = tree.children;
  if (!Array.isArray(children)) return tree;

  const slug = articleSlug(file);
  const config = FLAGSHIP_ENGAGEMENT[slug];

  if (config) {
    const answerHeading = children.findIndex(
      (node) => node.type === "element" && node.tagName === "h2",
    );
    if (answerHeading !== -1) {
      let insertAt = answerHeading + 1;
      while (insertAt < children.length) {
        const node = children[insertAt];
        if (node.type === "element" && node.tagName === "h2") break;
        insertAt += 1;
      }
      const extras = (config.highlights || [])
        .filter((highlight) => highlight.place === "after-answer")
        .map((highlight) => pullQuoteNode(highlight, config.disclosure));
      if (extras.length) {
        children.splice(insertAt, 0, ...extras);
      }
    }
  }

  for (let i = 0; i < children.length; i += 1) {
    const node = children[i];
    if (node.type !== "element" || node.tagName !== "h2") continue;
    if (!RANKING_HEADING.test(nodeText(node))) continue;

    let tableIndex = -1;
    for (let j = i + 1; j < children.length; j += 1) {
      const next = children[j];
      if (next.type === "element" && next.tagName === "h2") break;
      if (next.type === "element" && next.tagName === "table") {
        tableIndex = j;
        break;
      }
    }
    if (tableIndex === -1) continue;

    let end = tableIndex;
    const after = children[tableIndex + 1];
    if (after && after.type === "element" && after.tagName === "p") {
      end = tableIndex + 1;
    }

    const slice = children.slice(i, end + 1);
    const tableNode = slice.find(
      (item) => item.type === "element" && item.tagName === "table",
    );
    if (tableNode) enhanceRankingTable(tableNode);

    const wrapped = slice.flatMap((item) => {
      if (item !== tableNode) return [item];
      const beforeTable = [];
      if (config?.shortlist) beforeTable.push(shortlistNode(config.shortlist));
      return [
        ...beforeTable,
        el("div", { className: ["ranking-table-wrap"] }, [tableNode]),
      ];
    });

    children.splice(
      i,
      end - i + 1,
      el(
        "section",
        { id: "full-ranking", className: ["ranking-section"] },
        wrapped,
      ),
    );
    break;
  }

  return tree;
}

export default function rehypeRankingTables() {
  return (tree, file) => {
    applyRankingTables(tree, file);
  };
}
