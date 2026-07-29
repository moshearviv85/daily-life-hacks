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
  const items = articles.map((article) => {
    const url = `${FEED_SITE}/${article.id}/`;
    const image = absoluteFeedImage(article.data.image);
    const published = article.data.publishAt ?? article.data.date;
    const modified = article.data.dateModified ?? published;
    const author = article.data.author ?? "David Miller";

    return {
      id: url,
      url,
      title: article.data.title,
      summary: article.data.excerpt,
      content_html: `<p><img src="${escapeXml(image)}" alt="${escapeXml(article.data.imageAlt ?? article.data.title)}"></p><p>${escapeXml(article.data.excerpt)}</p><p><a href="${url}">Read the full article with the tables, numbers, and sources.</a></p>`,
      image,
      date_published: published.toISOString(),
      date_modified: modified.toISOString(),
      authors: [{ name: author }],
      tags: [article.data.category, ...article.data.tags],
      attachments: [
        {
          url: image,
          mime_type: "image/jpeg",
          title: article.data.imageAlt ?? article.data.title,
        },
      ],
    };
  });

  return new Response(
    JSON.stringify({
      version: "https://jsonfeed.org/version/1.1",
      title: FEED_TITLE,
      home_page_url: `${FEED_SITE}/`,
      feed_url: `${FEED_SITE}/feed.json`,
      description: FEED_DESCRIPTION,
      icon: `${FEED_SITE}/icon-192.png`,
      favicon: `${FEED_SITE}/favicon.ico`,
      language: "en-US",
      authors: [{ name: "David Miller", url: `${FEED_SITE}/about/` }],
      items,
    }),
    {
      headers: {
        "Content-Type": "application/feed+json; charset=utf-8",
        "Cache-Control": "public, max-age=1800",
      },
    },
  );
};
