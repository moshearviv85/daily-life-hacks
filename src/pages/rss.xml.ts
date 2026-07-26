import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { isReleased } from "../content/release";

const SITE = "https://www.daily-life-hacks.com";
const MAX_ITEMS = 25;  // MSN wants fewer than 30 fresh items

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * RSS 2.0 feed with per-item enclosures + media:content.
 * Feeds are a prerequisite for aggregator surfaces (Flipboard, MSN, Apple News,
 * newsreaders) and give crawlers a freshness signal the sitemap alone doesn't.
 * Note: /feed is a legacy WordPress path returning 410, so this lives at /rss.xml.
 */
export const GET: APIRoute = async () => {
  const articles = (await getCollection("articles"))
    .filter((a) => isReleased(a))
    .sort((a, b) => {
      const da = (a.data.dateModified ?? a.data.publishAt ?? a.data.date).valueOf();
      const db = (b.data.dateModified ?? b.data.publishAt ?? b.data.date).valueOf();
      return db - da;
    })
    .slice(0, MAX_ITEMS);

  const items = articles
    .map((a) => {
      const url = `${SITE}/${a.id}/`;
      const image = a.data.image.startsWith("http")
        ? a.data.image
        : `${SITE}${a.data.image}`;
      const pub = (a.data.publishAt ?? a.data.date).toUTCString();
      const category = a.data.category;
      return `    <item>
      <title>${esc(a.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(a.data.excerpt)}</description>
      <content:encoded><![CDATA[<p><img src="${image}" alt="${a.data.imageAlt ?? a.data.title}" /></p><p>${a.data.excerpt}</p><p><a href="${url}">Read the full article with the data tables and sources.</a></p>]]></content:encoded>
      <pubDate>${pub}</pubDate>
      <category>${esc(category)}</category>
      <dc:creator>${esc(a.data.author ?? "David Miller")}</dc:creator>
      <enclosure url="${esc(image)}" type="image/jpeg" length="0" />
      <media:content url="${esc(image)}" medium="image">
        <media:description type="plain">${esc(a.data.imageAlt ?? a.data.title)}</media:description>
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
    <title>Daily Life Hacks</title>
    <link>${SITE}/</link>
    <description>What eating healthy actually costs. Original priced-food data studies, budget recipes, and practical kitchen answers.</description>
    <language>en-US</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE}/logo.png</url>
      <title>Daily Life Hacks</title>
      <link>${SITE}/</link>
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
