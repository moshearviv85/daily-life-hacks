/**
 * Read-only post-deploy QA for https://www.daily-life-hacks.com.
 *
 * Runs after Deploy Cloudflare Pages succeeds. It never deploys, writes, or
 * calls anything except GET against the live site and a local git diff of the
 * deployed commit against the previous production deploy.
 *
 * Fails when:
 *   - a sitemap URL is not 200, is noindex, or is not self-canonical
 *   - a public/_redirects destination is not 200 (HTML destinations must also
 *     be indexable)
 *   - an internal link on a sitemap page returns 3xx or 4xx
 *   - /author/david-miller/ lists an article that is not indexable
 *   - more than DATEMODIFIED_DEPLOY_CAP articles changed their public
 *     modified day since the previous production deploy without
 *     substantiveUpdate set to that new day
 *   - llms.txt or datapackage.json cites a public/_redirects source
 */
import { appendFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { parseRedirectRules } from "../functions/site-redirects.js";
import {
  extractFrontmatterField,
  publicModifiedDay,
} from "../src/content/modified-date.mjs";

export const DATEMODIFIED_DEPLOY_CAP = 15;
export const AUTHOR_PATH = "/author/david-miller/";
const SITE_HOSTS = new Set(["www.daily-life-hacks.com", "daily-life-hacks.com"]);
const ASSET_EXT = /\.(?:css|js|mjs|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|eot|pdf|csv|zip|mp4|webm|xml|json|txt|webmanifest)$/i;

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function canonicalHost(url) {
  url.protocol = "https:";
  if (url.hostname === "daily-life-hacks.com") url.hostname = "www.daily-life-hacks.com";
  return url;
}

/** Identity for HTML pages: https, www, no query or hash, trailing slash. */
export function normalizeUrl(value, base) {
  const url = canonicalHost(new URL(value, base));
  url.hash = "";
  url.search = "";
  if (url.pathname !== "/" && !url.pathname.endsWith("/") && !ASSET_EXT.test(url.pathname)) {
    url.pathname += "/";
  }
  return url.href;
}

/** The URL an href actually requests. Hash is ignored. Tracking params are ignored. */
export function linkedUrl(value, base) {
  const url = canonicalHost(new URL(value, base));
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
  }
  return url.href;
}

export function dayOf(value) {
  const match = String(value ?? "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

export function parseSitemapXml(xml) {
  const urls = [];
  for (const block of String(xml).matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/gi)) {
    const loc = block[1].match(/<loc>\s*([^<]+?)\s*<\/loc>/i)?.[1]?.trim();
    const lastmod = block[1].match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/i)?.[1]?.trim() ?? null;
    if (loc) urls.push({ loc, lastmod });
  }
  const children = [];
  for (const block of String(xml).matchAll(/<sitemap\b[^>]*>([\s\S]*?)<\/sitemap>/gi)) {
    const loc = block[1].match(/<loc>\s*([^<]+?)\s*<\/loc>/i)?.[1]?.trim();
    if (loc) children.push(loc);
  }
  return { urls, children };
}

function attr(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1] ?? null;
}

export function robotsContent(html) {
  for (const tag of String(html).matchAll(/<meta\b[^>]*>/gi)) {
    const name = attr(tag[0], "name");
    if (name && name.toLowerCase() === "robots") return attr(tag[0], "content");
  }
  return null;
}

export function isNoindex(robots) {
  return /\bnoindex\b/i.test(robots || "");
}

export function canonicalHref(html) {
  for (const tag of String(html).matchAll(/<link\b[^>]*>/gi)) {
    const rel = attr(tag[0], "rel");
    if (rel && rel.toLowerCase().split(/\s+/).includes("canonical")) return attr(tag[0], "href");
  }
  return null;
}

export function isHtml(contentType, body) {
  if (/html/i.test(contentType || "")) return true;
  return /^\s*</.test(body || "") && /<html[\s>]/i.test(body || "");
}

export function internalLinkTargets(html, pageUrl) {
  const targets = [];
  for (const tag of String(html).matchAll(/<a\b[^>]*>/gi)) {
    const href = attr(tag[0], "href");
    if (!href) continue;
    const raw = href.trim();
    if (!raw || raw.startsWith("#") || /^(?:mailto:|tel:|javascript:)/i.test(raw)) continue;
    let url;
    try {
      url = new URL(raw, pageUrl);
    } catch {
      continue;
    }
    if (!SITE_HOSTS.has(url.hostname)) continue;
    // Cloudflare Email Obfuscation rewrites mailto links to /cdn-cgi/l/email-protection.
    // That path is reserved and 404s on GET. It is not a site URL.
    if (url.pathname === "/cdn-cgi" || url.pathname.startsWith("/cdn-cgi/")) continue;
    if (ASSET_EXT.test(url.pathname)) continue;
    targets.push(linkedUrl(url.href, pageUrl));
  }
  return targets;
}

export function authorArticleUrls(html) {
  const found = [];
  for (const script of String(html).matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    let data;
    try {
      data = JSON.parse(script[1]);
    } catch {
      continue;
    }
    const nodes = Array.isArray(data) ? data : [data];
    for (const node of nodes) {
      const id = String(node?.["@id"] ?? "");
      if (node?.["@type"] !== "ItemList" || !id.endsWith("#articles")) continue;
      for (const item of node.itemListElement ?? []) {
        if (typeof item?.url === "string") found.push(item.url);
      }
    }
  }
  return found;
}

export function normalizeSitePath(value) {
  const path = String(value ?? "").split("#")[0].split("?")[0];
  if (!path.startsWith("/")) return path;
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

export function redirectSourcePaths(rules) {
  const sources = new Set();
  for (const rule of rules) {
    if (!rule.source || rule.source.includes("*")) continue;
    sources.add(normalizeSitePath(rule.source));
  }
  return sources;
}

export function citedSitePaths(text) {
  const paths = [];
  for (const match of String(text).matchAll(/https:\/\/(?:www\.)?daily-life-hacks\.com([^"'\\\s<]*)/g)) {
    const raw = match[1].split(/[?#]/)[0] || "/";
    paths.push(normalizeSitePath(raw.startsWith("/") ? raw : `/${raw}`));
  }
  return paths;
}

export function redirectCitationFailures(text, sources, label) {
  const failures = [];
  const seen = new Set();
  for (const path of citedSitePaths(text)) {
    if (!sources.has(path) || seen.has(path)) continue;
    seen.add(path);
    failures.push(`${label} cites redirect source ${path}`);
  }
  return failures;
}

export function redirectDestinations(rules) {
  const destinations = new Set();
  for (const rule of rules) {
    if (!rule.destination || rule.destination === "/") {
      destinations.add("/");
      continue;
    }
    const path = rule.destination.split("#")[0].split("?")[0];
    if (!path.startsWith("/")) continue;
    destinations.add(path.startsWith("/") ? path : `/${path}`);
  }
  return [...destinations];
}

export function classifyDateChanges(entries, cap = DATEMODIFIED_DEPLOY_CAP) {
  const explained = [];
  const unexplained = [];
  for (const entry of entries) {
    if (!entry.beforeDay || !entry.afterDay || entry.beforeDay === entry.afterDay) continue;
    const row = {
      slug: entry.slug,
      beforeDay: entry.beforeDay,
      afterDay: entry.afterDay,
      substantiveDay: entry.substantiveDay || null,
    };
    if (row.substantiveDay && row.substantiveDay === row.afterDay) explained.push(row);
    else unexplained.push(row);
  }
  return { explained, unexplained, cap, ok: unexplained.length <= cap };
}

export function articleDateEntry(slug, beforeMarkdown, afterMarkdown) {
  return {
    slug,
    beforeDay: dayOf(publicModifiedDay(beforeMarkdown)),
    afterDay: dayOf(publicModifiedDay(afterMarkdown)),
    substantiveDay: dayOf(extractFrontmatterField(afterMarkdown, "substantiveUpdate")),
  };
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function dateChangesSince(previousSha, currentSha, cap = DATEMODIFIED_DEPLOY_CAP) {
  if (!previousSha || previousSha === currentSha) {
    return classifyDateChanges([], cap);
  }
  const names = git([
    "diff",
    "--name-only",
    "--diff-filter=M",
    previousSha,
    currentSha,
    "--",
    "src/data/articles",
  ])
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".md") && !line.includes("/production/"));

  const entries = names.map((file) => {
    const slug = file.split("/").pop().replace(/\.md$/, "");
    const before = git(["show", `${previousSha}:${file}`]);
    const after = git(["show", `${currentSha}:${file}`]);
    return articleDateEntry(slug, before, after);
  });
  return classifyDateChanges(entries, cap);
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index], index);
    }
  }
  const workers = Math.min(limit, items.length);
  if (workers > 0) await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

async function fetchText(url) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        headers: {
          "user-agent": "dlh-post-deploy-qa",
          accept: "text/html,application/xml,text/xml,*/*",
        },
        signal: AbortSignal.timeout(20000),
      });
      const body = await response.text();
      if (response.status === 429 || response.status === 503) {
        lastError = new Error(`HTTP ${response.status}`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      return {
        url,
        status: response.status,
        body,
        contentType: response.headers.get("content-type") || "",
        error: null,
      };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  return {
    url,
    status: 0,
    body: "",
    contentType: "",
    error: lastError instanceof Error ? lastError.message : String(lastError),
  };
}

async function loadSitemap(base, concurrency) {
  const indexUrl = new URL("/sitemap-index.xml", base).href;
  const seen = new Set();
  const pages = [];
  async function walk(url) {
    const normalized = normalizeUrl(url, base);
    if (seen.has(normalized)) return;
    seen.add(normalized);
    const response = await fetchText(url);
    if (response.status !== 200) {
      pages.push({ loc: url, lastmod: null, response, indexError: true });
      return;
    }
    const parsed = parseSitemapXml(response.body);
    if (parsed.children.length) {
      for (const child of parsed.children) await walk(child);
      return;
    }
    pages.push(...parsed.urls.map((entry) => ({ ...entry, response: null, indexError: false })));
  }
  await walk(indexUrl);
  const indexFailures = pages.filter((page) => page.indexError);
  const urlEntries = pages.filter((page) => !page.indexError);
  const fetched = await mapPool(urlEntries, concurrency, async (entry) => ({
    ...entry,
    response: await fetchText(entry.loc),
  }));
  return { indexUrl, indexFailures, pages: fetched };
}

function sitemapFailures(pages) {
  const failures = [];
  for (const page of pages) {
    const response = page.response;
    const label = page.loc;
    if (!response || response.error) {
      failures.push(`${label}  request failed: ${response?.error || "no response"}`);
      continue;
    }
    if (response.status !== 200) {
      failures.push(`${label}  HTTP ${response.status}`);
      continue;
    }
    if (!isHtml(response.contentType, response.body)) {
      failures.push(`${label}  not HTML`);
      continue;
    }
    const robots = robotsContent(response.body);
    if (isNoindex(robots)) failures.push(`${label}  noindex (${robots})`);
    const canonical = canonicalHref(response.body);
    if (!canonical) {
      failures.push(`${label}  missing canonical`);
      continue;
    }
    if (normalizeUrl(canonical, label) !== normalizeUrl(label, label)) {
      failures.push(`${label}  canonical ${canonical}`);
    }
  }
  return failures;
}

function redirectTargetFailures(destinations, base, fetched) {
  const failures = [];
  for (const destination of destinations) {
    const url = new URL(destination, base).href;
    const key = linkedUrl(url, base);
    const response = fetched.get(key);
    if (!response || response.error) {
      failures.push(`${destination}  request failed: ${response?.error || "no response"}`);
      continue;
    }
    if (response.status !== 200) {
      failures.push(`${destination}  HTTP ${response.status}`);
      continue;
    }
    if (!isHtml(response.contentType, response.body)) continue;
    const robots = robotsContent(response.body);
    if (isNoindex(robots)) failures.push(`${destination}  noindex (${robots})`);
  }
  return failures;
}

function internalLinkFailures(pages, fetched) {
  const failures = [];
  const reported = new Set();
  for (const page of pages) {
    if (!page.response || page.response.status !== 200) continue;
    if (!isHtml(page.response.contentType, page.response.body)) continue;
    for (const target of internalLinkTargets(page.response.body, page.loc)) {
      const response = fetched.get(target);
      if (!response) continue;
      const bad = Boolean(response.error)
      || response.status === 0
      || response.status >= 300;
      if (!bad || reported.has(target)) continue;
      reported.add(target);
      const detail = response.error ? `request failed: ${response.error}` : `HTTP ${response.status}`;
      failures.push(`${target}  ${detail}  (from ${page.loc})`);
    }
  }
  return failures;
}

function authorFailures(authorUrl, response, fetched) {
  const failures = [];
  if (!response || response.error || response.status !== 200) {
    failures.push(`${authorUrl}  ${response?.error || `HTTP ${response?.status ?? 0}`}`);
    return failures;
  }
  const articles = authorArticleUrls(response.body);
  if (!articles.length) {
    failures.push(`${authorUrl}  article list is empty`);
    return failures;
  }
  for (const article of articles) {
    const key = linkedUrl(article, authorUrl);
    const page = fetched.get(key);
    if (!page || page.error) {
      failures.push(`${article}  request failed: ${page?.error || "no response"}`);
      continue;
    }
    if (page.status !== 200) {
      failures.push(`${article}  HTTP ${page.status}`);
      continue;
    }
    const robots = robotsContent(page.body);
    if (isNoindex(robots)) failures.push(`${article}  noindex (${robots})`);
    const canonical = canonicalHref(page.body);
    if (!canonical || normalizeUrl(canonical, key) !== normalizeUrl(key, key)) {
      failures.push(`${article}  canonical ${canonical || "(missing)"}`);
    }
  }
  return failures;
}

function formatSection(name, failures) {
  if (!failures.length) return `${name}: ok`;
  return [`${name}: ${failures.length} failure(s)`, ...failures.map((line) => `- ${line}`)].join("\n");
}

function writeStepSummary(markdown) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

export async function runPostDeployQa({
  base,
  previousSha = "",
  currentSha = "",
  cap = DATEMODIFIED_DEPLOY_CAP,
  concurrency = 6,
  redirectsSource,
} = {}) {
  const origin = new URL(base).origin;
  const sitemap = await loadSitemap(origin, concurrency);
  const byUrl = new Map();
  for (const page of sitemap.pages) {
    if (page.response) byUrl.set(linkedUrl(page.loc, origin), page.response);
  }

  const sitemapProblems = [
    ...sitemap.indexFailures.map(
      (page) => `${page.loc}  sitemap fetch HTTP ${page.response?.status || 0} ${page.response?.error || ""}`.trim(),
    ),
    ...sitemapFailures(sitemap.pages),
  ];

  const rules = parseRedirectRules(redirectsSource);
  const destinations = redirectDestinations(rules);
  const sourcePaths = redirectSourcePaths(rules);
  const machineFiles = ["/llms.txt", "/data/datapackage.json"];
  const machineResponses = await mapPool(machineFiles, concurrency, async (path) => {
    const url = new URL(path, origin).href;
    return { path, response: await fetchText(url) };
  });
  const machineFailures = [];
  for (const file of machineResponses) {
    const response = file.response;
    if (!response || response.error || response.status !== 200) {
      machineFailures.push(
        `${file.path}  ${response?.error || `HTTP ${response?.status ?? 0}`}`,
      );
      continue;
    }
    machineFailures.push(...redirectCitationFailures(response.body, sourcePaths, file.path));
  }
  const missingDestinations = destinations
    .map((destination) => linkedUrl(destination, origin))
    .filter((url) => !byUrl.has(url));
  const destinationResponses = await mapPool(missingDestinations, concurrency, (url) => fetchText(url));
  for (const response of destinationResponses) byUrl.set(linkedUrl(response.url, origin), response);

  const linkTargets = new Set();
  for (const page of sitemap.pages) {
    if (!page.response || page.response.status !== 200) continue;
    if (!isHtml(page.response.contentType, page.response.body)) continue;
    for (const target of internalLinkTargets(page.response.body, page.loc)) linkTargets.add(target);
  }
  const missingLinks = [...linkTargets].filter((url) => !byUrl.has(url));
  const linkResponses = await mapPool(missingLinks, concurrency, (url) => fetchText(url));
  for (const response of linkResponses) byUrl.set(linkedUrl(response.url, origin), response);

  const authorUrl = new URL(AUTHOR_PATH, origin).href;
  const authorKey = linkedUrl(authorUrl, origin);
  if (!byUrl.has(authorKey)) {
    const authorResponse = await fetchText(authorUrl);
    byUrl.set(authorKey, authorResponse);
  }

  const dates = previousSha
    ? dateChangesSince(previousSha, currentSha || git(["rev-parse", "HEAD"]).trim(), cap)
    : null;

  const sections = {
    sitemap: sitemapProblems,
    redirects: redirectTargetFailures(destinations, origin, byUrl),
    internalLinks: internalLinkFailures(sitemap.pages, byUrl),
    author: authorFailures(authorUrl, byUrl.get(authorKey), byUrl),
    machineReadable: machineFailures,
    dateModified: [],
  };

  let dateSummary = "dateModified: skipped (no previous production deploy)";
  if (dates) {
    if (!dates.ok) {
      sections.dateModified = dates.unexplained.map(
        (row) => `${row.slug}  ${row.beforeDay} -> ${row.afterDay} without substantiveUpdate`,
      );
    }
    dateSummary = dates.ok
      ? `dateModified: ok (${dates.unexplained.length} unexplained, ${dates.explained.length} with substantiveUpdate, cap ${cap})`
      : `dateModified: ${dates.unexplained.length} page(s) changed without substantiveUpdate (cap ${cap})`;
  }

  const failed = Object.values(sections).some((items) => items.length);
  const lines = [
    failed ? "Post-deploy live QA: FAIL" : "Post-deploy live QA: PASS",
    `base: ${origin}`,
    previousSha ? `previous deploy: ${previousSha}` : "previous deploy: (none)",
    formatSection(`sitemap (${sitemap.pages.length} URL(s))`, sections.sitemap),
    formatSection(`redirect targets (${destinations.length})`, sections.redirects),
    formatSection(`internal links (${linkTargets.size} unique)`, sections.internalLinks),
    formatSection(
      `author articles (${authorArticleUrls(byUrl.get(authorKey)?.body || "").length})`,
      sections.author,
    ),
    formatSection("llms.txt and datapackage.json", sections.machineReadable),
    dateSummary,
    ...sections.dateModified.map((line) => `- ${line}`),
  ];
  return { ok: !failed, summary: lines.join("\n"), sections, dates };
}

async function main() {
  const base = arg("--base", "https://www.daily-life-hacks.com").replace(/\/+$/, "");
  const previousSha = arg("--previous-sha", process.env.PREVIOUS_DEPLOY_SHA || "").trim();
  const cap = Number(arg("--cap", String(DATEMODIFIED_DEPLOY_CAP)));
  const concurrency = Number(arg("--concurrency", "6"));
  const redirectsSource = readFileSync(new URL("../public/_redirects", import.meta.url), "utf8");
  const currentSha = git(["rev-parse", "HEAD"]).trim();
  const result = await runPostDeployQa({
    base,
    previousSha,
    currentSha,
    cap: Number.isFinite(cap) ? cap : DATEMODIFIED_DEPLOY_CAP,
    concurrency: Number.isFinite(concurrency) ? concurrency : 6,
    redirectsSource,
  });
  console.log(result.summary);
  writeStepSummary(`\`\`\`\n${result.summary}\n\`\`\``);
  process.exit(result.ok ? 0 : 1);
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exit(1);
  });
}
