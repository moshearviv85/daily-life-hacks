import type { APIRoute } from "astro";
import {
  absoluteFeedImage,
  escapeXml,
  FEED_DESCRIPTION,
  FEED_SITE,
  FEED_TITLE,
  getFeedArticles,
} from "../content/feed";

export const GET: APIRoute = async () => {
  const articles = await getFeedArticles();
  const updated =
    articles[0]?.data.dateModified ??
    articles[0]?.data.publishAt ??
    articles[0]?.data.date ??
    new Date();

  const entries = articles
    .map((article) => {
      const url = `${FEED_SITE}/${article.id}/`;
      const image = absoluteFeedImage(article.data.image);
      const published = (article.data.publishAt ?? article.data.date).toISOString();
      const modified = (
        article.data.dateModified ??
        article.data.publishAt ??
        article.data.date
      ).toISOString();
      const author = article.data.author ?? "David Miller";
      const content = `<p><img src="${escapeXml(image)}" alt="${escapeXml(article.data.imageAlt ?? article.data.title)}" /></p><p>${escapeXml(article.data.excerpt)}</p><p><a href="${url}">Read the full article with the tables, numbers, and sources.</a></p>`;

      return `  <entry>
    <id>${url}</id>
    <title>${escapeXml(article.data.title)}</title>
    <link rel="alternate" type="text/html" href="${url}" />
    <link rel="enclosure" type="image/jpeg" href="${escapeXml(image)}" />
    <published>${published}</published>
    <updated>${modified}</updated>
    <author><name>${escapeXml(author)}</name></author>
    <category term="${escapeXml(article.data.category)}" />
    <summary>${escapeXml(article.data.excerpt)}</summary>
    <content type="html">${escapeXml(content)}</content>
  </entry>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${FEED_SITE}/</id>
  <title>${FEED_TITLE}</title>
  <subtitle>${escapeXml(FEED_DESCRIPTION)}</subtitle>
  <link rel="alternate" type="text/html" href="${FEED_SITE}/" />
  <link rel="self" type="application/atom+xml" href="${FEED_SITE}/atom.xml" />
  <link rel="related" type="application/rss+xml" href="${FEED_SITE}/rss.xml" />
  <updated>${updated.toISOString()}</updated>
${entries}
</feed>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800",
    },
  });
};
