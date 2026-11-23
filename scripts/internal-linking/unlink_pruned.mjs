/**
 * One-off rewrite: stop article markdown from linking to INDEX_PRUNE_SLUGS.
 *
 * Default: drop the link and keep the anchor text.
 * RETARGET: point the listed pruned slugs at an indexable merge target.
 * If the target file is missing, still pruned, or is the file being edited,
 * the link is removed instead. A second link to the same target in one
 * paragraph is removed so we don't leave duplicate adjacent links.
 *
 * Run: node scripts/internal-linking/unlink_pruned.mjs
 * This rewrites src/data/articles/*.md in place. It is not a build step.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INDEX_PRUNE_SLUGS } from "../../src/content/index-prune.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ARTICLES_DIR = path.join(ROOT, "src/data/articles");
const SITE = "https://www.daily-life-hacks.com";

const RETARGET = new Map([
  ["cauliflower-fried-rice-with-eggs", "/high-fiber-stir-fry-vegetables/"],
  ["how-to-cool-rice-for-fried-rice", "/can-you-eat-rice-and-beans-everyday/"],
  ["do-you-have-to-cook-canned-beans", "/canned-beans-vs-dried-beans-nutrition/"],
  ["how-long-do-canned-beans-last-after-the-best-by-date", "/canned-beans-vs-dried-beans-nutrition/"],
  ["how-long-do-opened-canned-beans-last", "/canned-beans-vs-dried-beans-nutrition/"],
  ["how-much-dried-beans-per-person", "/canned-beans-vs-dried-beans-nutrition/"],
  ["how-much-is-a-can-of-beans", "/canned-beans-vs-dried-beans-nutrition/"],
  ["how-much-protein-in-a-can-of-beans", "/canned-beans-vs-dried-beans-nutrition/"],
  ["nutritional-value-of-beans-compared", "/canned-beans-vs-dried-beans-nutrition/"],
  ["do-you-have-to-cook-frozen-vegetables", "/can-you-refreeze-frozen-vegetables-after-thawing/"],
  ["how-long-do-frozen-vegetables-last-in-the-freezer", "/can-you-refreeze-frozen-vegetables-after-thawing/"],
  ["how-to-cook-frozen-vegetables-without-the-mush", "/can-you-refreeze-frozen-vegetables-after-thawing/"],
  ["how-to-freeze-fresh-vegetables-at-home", "/can-you-refreeze-frozen-vegetables-after-thawing/"],
  ["how-long-can-rice-and-beans-sit-out", "/can-you-eat-rice-and-beans-everyday/"],
  ["how-much-lentils-per-person-per-day", "/can-you-eat-rice-and-beans-everyday/"],
  ["how-much-rice-and-beans-per-person-per-day", "/can-you-eat-rice-and-beans-everyday/"],
  ["what-beans-for-red-beans-and-rice", "/can-you-eat-rice-and-beans-everyday/"],
  ["how-long-do-dried-beans-last", "/how-to-cook-dried-beans-from-scratch/"],
  ["how-much-protein-in-lentils", "/foods-highest-in-protein-per-100-grams/"],
  ["how-much-protein-in-oatmeal", "/foods-highest-in-protein-per-100-grams/"],
  ["how-much-protein-in-peanut-butter", "/foods-highest-in-protein-per-100-grams/"],
  ["how-much-protein-in-two-eggs", "/foods-highest-in-protein-per-100-grams/"],
  ["how-to-keep-bread-fresh-longer-without-mold", "/how-to-keep-sandwiches-from-getting-soggy/"],
  ["how-to-make-sourdough-pizza-dough-same-day", "/easy-sourdough-discard-pizza-dough-no-yeast/"],
  ["which-foods-are-complete-proteins", "/beans-and-rice-complete-protein-meal/"],
]);

const MD_LINK = /(?<!!)\[([^\]\n]+)\]\(([^)\n]+)\)/g;
const HTML_LINK = /<a\b[^>]*href\s*=\s*(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi;

function canonicalPath(href) {
  try {
    const url = new URL(href, SITE);
    if (url.hostname !== "www.daily-life-hacks.com" && url.hostname !== "daily-life-hacks.com") {
      return null;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (!parts.length) return null;
    return `/${parts.join("/")}/`;
  } catch {
    return null;
  }
}

function pruneSlugFromHref(href) {
  const raw = String(href ?? "").trim();
  if (!raw || raw.startsWith("#")) return null;
  if (!raw.startsWith("/") && !/^https?:\/\//i.test(raw)) return null;
  const pathName = canonicalPath(raw);
  if (!pathName) return null;
  const parts = pathName.split("/").filter(Boolean);
  if (parts.length !== 1) return null;
  return INDEX_PRUNE_SLUGS.has(parts[0]) ? parts[0] : null;
}

function resolveRetarget(slug) {
  const target = RETARGET.get(slug);
  if (!target) return null;
  const targetSlug = target.replace(/^\/+|\/+$/g, "");
  const articlePath = path.join(ARTICLES_DIR, `${targetSlug}.md`);
  if (!fs.existsSync(articlePath) || INDEX_PRUNE_SLUGS.has(targetSlug)) return null;
  return `/${targetSlug}/`;
}

function formatTarget(originalHref, targetPath) {
  if (/^https?:\/\//i.test(originalHref)) {
    const url = new URL(originalHref, SITE);
    const host = url.hostname === "daily-life-hacks.com" ? "www.daily-life-hacks.com" : url.hostname;
    return `${url.protocol}//${host}${targetPath}`;
  }
  return targetPath;
}

function splitMarkdownDest(dest) {
  const trimmed = dest.trim();
  const angle = trimmed.match(/^<([^>]+)>([\s\S]*)$/);
  if (angle) return { href: angle[1], suffix: angle[2] || "" };
  const spaced = trimmed.match(/^(\S+)([\s\S]*)$/);
  return { href: spaced?.[1] ?? trimmed, suffix: spaced?.[2] ?? "" };
}

function skippedRanges(text) {
  const ranges = [];
  for (const match of text.matchAll(/```[\s\S]*?```/g)) {
    ranges.push([match.index, match.index + match[0].length]);
  }
  for (const match of text.matchAll(/`[^`\n]+`/g)) {
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges;
}

function inside(ranges, index) {
  return ranges.some(([start, end]) => index >= start && index < end);
}

function paragraphRanges(text) {
  const ranges = [];
  let start = 0;
  for (const match of text.matchAll(/\n[ \t]*\n/g)) {
    ranges.push([start, match.index]);
    start = match.index + match[0].length;
  }
  ranges.push([start, text.length]);
  return ranges;
}

function collectLinks(text) {
  const skip = skippedRanges(text);
  const found = [];
  for (const match of text.matchAll(MD_LINK)) {
    if (inside(skip, match.index)) continue;
    const dest = splitMarkdownDest(match[2]);
    found.push({
      kind: "md",
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
      href: dest.href,
      suffix: dest.suffix,
      raw: match[0],
    });
  }
  for (const match of text.matchAll(HTML_LINK)) {
    if (inside(skip, match.index)) continue;
    found.push({
      kind: "html",
      start: match.index,
      end: match.index + match[0].length,
      inner: match[3],
      href: match[2],
      raw: match[0],
    });
  }
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = [];
  let cursor = -1;
  for (const link of found) {
    if (link.start < cursor) continue;
    kept.push(link);
    cursor = link.end;
  }
  return kept;
}

function rewriteFile(filePath, stats) {
  const original = fs.readFileSync(filePath, "utf8");
  const fileSlug = path.basename(filePath, ".md");
  const links = collectLinks(original);
  if (!links.length) return;

  const paragraphs = paragraphRanges(original);
  const groups = new Map();
  for (const link of links) {
    const range = paragraphs.find(([start, end]) => link.start >= start && link.start < end) ?? paragraphs.at(-1);
    const key = range[0];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(link);
  }

  const edits = [];
  for (const group of groups.values()) {
    const occupied = new Set();
    for (const link of group) {
      link.slug = pruneSlugFromHref(link.href);
      if (!link.slug) {
        const existing = canonicalPath(link.href);
        if (existing) occupied.add(existing);
      }
    }
    for (const link of group) {
      if (!link.slug) continue;
      const target = resolveRetarget(link.slug);
      const targetSlug = target?.replace(/^\/+|\/+$/g, "") ?? "";
      if (!target || targetSlug === fileSlug || occupied.has(target)) {
        link.action = "unlink";
        stats.unlinked += 1;
        if (target && occupied.has(target)) stats.unlinkedDuplicate += 1;
        else if (target && targetSlug === fileSlug) stats.unlinkedSelf += 1;
        else if (RETARGET.has(link.slug)) stats.unlinkedInvalidTarget += 1;
      } else {
        link.action = "retarget";
        link.target = formatTarget(link.href, target);
        occupied.add(target);
        stats.retargeted += 1;
      }
      edits.push(link);
    }
  }

  if (!edits.length) return;
  let next = original;
  for (const link of edits.sort((a, b) => b.start - a.start)) {
    const replacement = link.action === "unlink"
      ? (link.kind === "md" ? link.text : link.inner)
      : (link.kind === "md"
        ? `[${link.text}](${link.target}${link.suffix})`
        : link.raw.replace(
          new RegExp(`href\\s*=\\s*(["'])${link.href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\1`),
          `href="${link.target}"`,
        ));
    next = next.slice(0, link.start) + replacement + next.slice(link.end);
  }
  if (next !== original) {
    fs.writeFileSync(filePath, next);
    stats.files += 1;
    stats.links += edits.length;
  }
}

function main() {
  const stats = {
    files: 0,
    links: 0,
    unlinked: 0,
    retargeted: 0,
    unlinkedDuplicate: 0,
    unlinkedSelf: 0,
    unlinkedInvalidTarget: 0,
  };
  for (const name of fs.readdirSync(ARTICLES_DIR)) {
    if (!name.endsWith(".md")) continue;
    rewriteFile(path.join(ARTICLES_DIR, name), stats);
  }
  console.log(JSON.stringify(stats));
}

main();
