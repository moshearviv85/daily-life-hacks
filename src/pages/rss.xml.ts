import type { APIRoute } from "astro";
import {
  absoluteFeedImage,
  escapeXml,
  FEED_DESCRIPTION,
  FEED_SITE,
  FEED_TITLE,
  getFeedArticles,
} from "../content/feed";

/**
 * RSS 2.0 feed with per-item enclosures + media:content.
 * Feeds are a prerequisite for aggregator surfaces (Flipboard, MSN, Apple News,
 * newsreaders) and give crawlers a freshness signal the sitemap alone doesn't.
 * Note: /feed is a legacy WordPress path returning 410, so this lives at /rss.xml.
 */
export const GET: APIRoute = async () => {
  const articles = await getFeedArticles();

  const items = articles
    .map((a) => {
      const url = `${FEED_SITE}/${a.id}/`;
      const image = absoluteFeedImage(a.data.image);
      const pub = (a.data.publishAt ?? a.data.date).toUTCString();
      const category = a.data.category;
      return `    <item>
      <title>${escapeXml(a.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(a.data.excerpt)}</description>
      <content:encoded><![CDATA[<p><img src="${image}" alt="${a.data.imageAlt ?? a.data.title}" /></p><p>${a.data.excerpt}</p><p><a href="${url}">Read the full article with the data tables and sources.</a></p>]]></content:encoded>
      <pubDate>${pub}</pubDate>
      <category>${escapeXml(category)}</category>
      <dc:creator>${escapeXml(a.data.author ?? "David Miller")}</dc:creator>
      <enclosure url="${escapeXml(image)}" type="image/jpeg" length="0" />
      <media:content url="${escapeXml(image)}" medium="image">
        <media:description type="plain">${escapeXml(a.data.imageAlt ?? a.data.title)}</media:description>
      </media:content>
    </item>`;
    })
    .join("\n");

  const now = new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${FEED_TITLE}</title>
    <link>${FEED_SITE}/</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en-US</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${FEED_SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${FEED_SITE}/logo.png</url>
      <title>${FEED_TITLE}</title>
      <link>${FEED_SITE}/</link>
    </image>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800",
    },
  });
};
