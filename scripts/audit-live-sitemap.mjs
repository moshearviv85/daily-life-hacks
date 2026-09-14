import { mkdir, writeFile } from 'node:fs/promises';

const origin = 'https://www.daily-life-hacks.com';
const output = process.argv[2] || 'reports/growth/2026-09-14-live-sitemap.json';
const headers = { 'User-Agent': 'DLH-owner-audit/1.0' };
async function get(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(25000) });
  return { response, text: await response.text() };
}
const { text: sitemap } = await get(`${origin}/sitemap-0.xml`);
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
if (!urls.length) throw new Error('Empty sitemap');
const rows = [];
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    try {
      const { response, text } = await get(url);
      const tags = [...text.matchAll(/<(?:link|meta)\b[^>]*>/gi)].map(m => m[0]);
      const attr = (tag, name) => tag?.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1] || '';
      const canonical = attr(tags.find(t => attr(t, 'rel') === 'canonical'), 'href');
      const robots = tags.filter(t => /^(robots|googlebot|bingbot)$/i.test(attr(t, 'name'))).map(t => attr(t, 'content')).join('; ');
      const links = [...text.matchAll(/<a\b[^>]*\bhref=["']([^"']*)["']/gi)].flatMap(m => {
        try { const link = new URL(m[1], url); return link.origin === origin ? [link.pathname] : []; } catch { return []; }
      });
      rows.push({ url, status: response.status, finalUrl: response.url, canonical, robots,
        xRobots: response.headers.get('x-robots-tag'), h1Count: [...text.matchAll(/<h1\b/gi)].length,
        title: text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1], links: [...new Set(links)] });
    } catch (error) { rows.push({ url, error: error.message }); }
    if (rows.length % 40 === 0) console.log(`Checked ${rows.length}/${urls.length}`);
  }
}));
rows.sort((a,b) => a.url.localeCompare(b.url));
const issues = rows.filter(r => r.error || r.status !== 200 || r.canonical !== r.url || /noindex/i.test(`${r.robots} ${r.xRobots}`) || r.h1Count !== 1);
const incoming = new Map(urls.map(u => [new URL(u).pathname, new Set()]));
for (const row of rows) for (const path of row.links || []) if (incoming.has(path) && path !== new URL(row.url).pathname) incoming.get(path).add(row.url);
const orphans = [...incoming].filter(([,parents]) => !parents.size).map(([path])=>path);
await mkdir(new URL('../', new URL(output, `file:///${process.cwd().replaceAll('\\','/')}/`)), { recursive: true });
await writeFile(output, JSON.stringify({ checkedAt: new Date().toISOString(), checked: rows.length, issues, orphans, rows }, null, 2));
console.log(JSON.stringify({ output, checked: rows.length, issues, orphans }, null, 2));
if (issues.length) process.exitCode = 1;
