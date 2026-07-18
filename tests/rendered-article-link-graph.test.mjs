import assert from "node:assert/strict";
import test from "node:test";

import { buildRenderedArticleLinkGraph } from "../scripts/lib/rendered-article-link-graph.mjs";

function article(slug, body = "", related = "") {
  return {
    canonicalPath: `/${slug}/`,
    indexable: true,
    html: `<html><body>
      <nav><a href="/target/">Global nav must not count</a></nav>
      <main data-base-slug="${slug}">
        <div class="article-content order-[20]">${body}</div>
        <!-- Tags -->
        <section aria-label="Related articles">${related}</section>
      </main>
      <footer><a href="/target/">Footer must not count</a></footer>
    </body></html>`,
  };
}

test("doesn't count navigation or footer links as article inbound links", () => {
  const graph = buildRenderedArticleLinkGraph([
    article("source"),
    article("target"),
  ]);

  assert.deepEqual(graph.orphans.map((row) => row.slug), ["source", "target"]);
});

test("separates contextual links from rendered related-card links", () => {
  const graph = buildRenderedArticleLinkGraph([
    article("source", '<p><a href="/target/">Useful context</a></p>'),
    article("target", "", '<a href="/source/">Related source</a>'),
  ]);
  const bySlug = new Map(graph.rows.map((row) => [row.slug, row]));

  assert.equal(graph.orphans.length, 0);
  assert.deepEqual(bySlug.get("target"), {
    slug: "target",
    canonicalPath: "/target/",
    mainInbound: 1,
    contextualInbound: 1,
  });
  assert.deepEqual(bySlug.get("source"), {
    slug: "source",
    canonicalPath: "/source/",
    mainInbound: 1,
    contextualInbound: 0,
  });
});

test("ignores noindex article documents", () => {
  const hidden = article("hidden");
  hidden.indexable = false;
  const graph = buildRenderedArticleLinkGraph([article("visible"), hidden]);

  assert.equal(graph.articleCount, 1);
  assert.deepEqual(graph.rows.map((row) => row.slug), ["visible"]);
});
