import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const SITE_ORIGIN = "https://www.daily-life-hacks.com";

function fail(message) {
  console.error(`\n[verify-internal-links] ERROR: ${message}\n`);
  process.exit(1);
}

function walkHtmlFiles(directory) {
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkHtmlFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(entryPath);
  }

  return files;
}

function getAttribute(tag, attributeName) {
  const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(
    new RegExp(`\\b${escapedName}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"),
  );
  return match?.[2] ?? "";
}

function getCanonicalPath(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = getAttribute(tag, "rel").toLowerCase().split(/\s+/);
    if (!rel.includes("canonical")) continue;

    const href = getAttribute(tag, "href");
    if (!href) return null;

    try {
      const url = new URL(href, SITE_ORIGIN);
      return url.origin === SITE_ORIGIN ? url.pathname : null;
    } catch {
      return null;
    }
  }

  return null;
}

function isIndexable(html) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    if (getAttribute(tag, "name").toLowerCase() !== "robots") continue;
    return !getAttribute(tag, "content").toLowerCase().includes("noindex");
  }
  return true;
}

function stripNonDocumentMarkup(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");
}

function shouldIgnoreHref(href) {
  const value = href.trim();
  if (!value || value.startsWith("#")) return true;
  if (/^(?:mailto|tel|javascript|data):/i.test(value)) return true;
  return false;
}

function isIgnoredPath(pathname) {
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_astro/") ||
    pathname.startsWith("/_image/") ||
    pathname.startsWith("/downloads/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/data/")
  ) {
    return true;
  }

  return /\.[a-z0-9]{2,8}$/i.test(pathname);
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    fail('Missing dist/ output. Run "npm run build" before this check.');
  }

  const htmlFiles = walkHtmlFiles(DIST_DIR);
  const documents = htmlFiles.map((filePath) => {
    const html = fs.readFileSync(filePath, "utf8");
    return {
      filePath,
      html,
      canonicalPath: getCanonicalPath(html),
    };
  });

  const indexableCanonicalPaths = new Set(
    documents
      .filter(({ html }) => isIndexable(html))
      .map(({ canonicalPath }) => canonicalPath)
      .filter(Boolean),
  );

  const failures = [];
  let internalAnchorsChecked = 0;

  for (const { filePath, html, canonicalPath } of documents) {
    const source = path.relative(DIST_DIR, filePath).replaceAll("\\", "/");
    const documentHtml = stripNonDocumentMarkup(html);
    const sourceUrl = new URL(canonicalPath || "/", SITE_ORIGIN);

    for (const match of documentHtml.matchAll(/<a\b[^>]*>/gi)) {
      const href = getAttribute(match[0], "href");
      if (shouldIgnoreHref(href)) continue;

      let target;
      try {
        target = new URL(href, sourceUrl);
      } catch {
        continue;
      }

      if (target.origin !== SITE_ORIGIN || isIgnoredPath(target.pathname)) continue;
      internalAnchorsChecked += 1;

      if (target.pathname === "/" || target.pathname.endsWith("/")) continue;
      const canonicalCandidate = `${target.pathname}/`;
      if (!indexableCanonicalPaths.has(canonicalCandidate)) continue;

      failures.push({ source, href, canonicalCandidate });
    }
  }

  if (failures.length) {
    console.error(
      `[verify-internal-links] Found ${failures.length} internal link(s) to indexable non-canonical paths:`,
    );
    for (const failure of failures.slice(0, 50)) {
      console.error(
        `- ${failure.source}: href="${failure.href}" (use "${failure.canonicalCandidate}")`,
      );
    }
    if (failures.length > 50) {
      console.error(`- ...and ${failures.length - 50} more`);
    }
    process.exit(1);
  }

  console.log(
    `[verify-internal-links] OK: checked ${internalAnchorsChecked} internal anchor(s) across ${htmlFiles.length} HTML file(s); indexable canonical targets=${indexableCanonicalPaths.size}`,
  );
}

main();
