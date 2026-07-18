const SITE_ORIGIN = "https://www.daily-life-hacks.com";

function getAttribute(tag, attributeName) {
  const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(
    new RegExp(`\\b${escapedName}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"),
  );
  return match?.[2] ?? "";
}

function articleDocument(document) {
  if (!document.canonicalPath || !document.indexable) return null;

  const mainMatch = document.html.match(/<main\b[^>]*data-base-slug=(['"])([^'"]+)\1[^>]*>[\s\S]*?<\/main>/i);
  if (!mainMatch) return null;

  const slug = mainMatch[2];
  const mainHtml = mainMatch[0];
  const contentStart = mainHtml.search(/<div\b[^>]*class=(['"])[^'"]*\barticle-content\b[^'"]*\1[^>]*>/i);
  let contextualHtml = "";

  if (contentStart >= 0) {
    const contentAndAfter = mainHtml.slice(contentStart);
    const contentEnd = contentAndAfter.indexOf("<!-- Tags -->");
    contextualHtml = contentEnd >= 0
      ? contentAndAfter.slice(0, contentEnd)
      : contentAndAfter;
  }

  return {
    slug,
    canonicalPath: document.canonicalPath,
    mainHtml,
    contextualHtml,
  };
}

function collectArticleTargets(html, sourcePath, articlePaths) {
  const targets = new Set();
  const sourceUrl = new URL(sourcePath, SITE_ORIGIN);

  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = getAttribute(match[0], "href").trim();
    if (!href || href.startsWith("#")) continue;

    let target;
    try {
      target = new URL(href, sourceUrl);
    } catch {
      continue;
    }

    if (target.origin !== SITE_ORIGIN) continue;
    const targetPath = target.pathname.endsWith("/")
      ? target.pathname
      : `${target.pathname}/`;
    if (articlePaths.has(targetPath) && targetPath !== sourcePath) {
      targets.add(targetPath);
    }
  }

  return targets;
}

/**
 * Build an article-to-article inbound graph from rendered HTML.
 *
 * `mainInbound` includes contextual links and rendered related cards, but never
 * global navigation or the footer. `contextualInbound` only counts anchors in
 * the rendered Markdown body.
 */
export function buildRenderedArticleLinkGraph(documents) {
  const articles = documents.map(articleDocument).filter(Boolean);
  const articlePaths = new Set(articles.map((article) => article.canonicalPath));
  const mainInbound = new Map(articles.map((article) => [article.canonicalPath, new Set()]));
  const contextualInbound = new Map(articles.map((article) => [article.canonicalPath, new Set()]));

  for (const source of articles) {
    for (const targetPath of collectArticleTargets(source.mainHtml, source.canonicalPath, articlePaths)) {
      mainInbound.get(targetPath)?.add(source.slug);
    }
    for (const targetPath of collectArticleTargets(source.contextualHtml, source.canonicalPath, articlePaths)) {
      contextualInbound.get(targetPath)?.add(source.slug);
    }
  }

  const rows = articles
    .map((article) => ({
      slug: article.slug,
      canonicalPath: article.canonicalPath,
      mainInbound: mainInbound.get(article.canonicalPath)?.size ?? 0,
      contextualInbound: contextualInbound.get(article.canonicalPath)?.size ?? 0,
    }))
    .sort((a, b) =>
      a.mainInbound - b.mainInbound ||
      a.contextualInbound - b.contextualInbound ||
      a.slug.localeCompare(b.slug),
    );

  return {
    articleCount: articles.length,
    rows,
    orphans: rows.filter((row) => row.mainInbound === 0),
  };
}
