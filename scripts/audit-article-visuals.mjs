#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";


const ROOT = process.cwd();
const DEFAULT_ARTICLES_DIR = path.join(ROOT, "src", "data", "articles");
const DEFAULT_LONG_FORM_WORDS = 1500;
const CHART_TERMS = /\b(chart|graph|diagram|infographic|plot|visualization)\b|(?:^|[-_/])(breakdown|ladder)(?:[-_. /]|$)/i;


function unquoteScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed.split(/\s+#/, 1)[0].trim();
}


export function splitArticle(raw) {
  const match = raw.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/);
  if (!match) return { frontmatter: "", body: raw };
  return {
    frontmatter: match[1],
    body: raw.slice(match[0].length),
  };
}


export function readFrontmatterImage(frontmatter) {
  const line = frontmatter.match(/^image:\s*(.*?)\s*$/m);
  return line ? unquoteScalar(line[1]) : "";
}


function cleanTarget(target) {
  const trimmed = target.trim();
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed.slice(1, -1);
  }
  return trimmed.split(/\s+["']/, 1)[0];
}


export function extractBodyImages(body) {
  const images = [];
  const markdownImage = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const htmlImage = /<img\b([^>]*?)>/gi;
  let match;

  while ((match = markdownImage.exec(body))) {
    images.push({
      kind: "markdown",
      alt: match[1].trim(),
      src: cleanTarget(match[2]),
    });
  }
  while ((match = htmlImage.exec(body))) {
    const attributes = match[1];
    const src = attributes.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    const alt = attributes.match(/\balt\s*=\s*["']([^"']*)["']/i);
    images.push({
      kind: "html",
      alt: alt ? alt[1].trim() : "",
      src: src ? src[1].trim() : "",
    });
  }
  return images;
}


export function countArticleWords(body) {
  const cleaned = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ");
  return (cleaned.match(/[A-Za-z0-9]+(?:[’'][A-Za-z0-9]+)*/g) || []).length;
}


function isRemoteAsset(src) {
  return /^(?:https?:)?\/\//i.test(src) || /^data:/i.test(src);
}


function resolveLocalAsset(src, { root, articleFile }) {
  if (!src || isRemoteAsset(src)) return "";
  const withoutQuery = decodeURIComponent(src.split(/[?#]/, 1)[0]);
  if (withoutQuery.startsWith("/")) {
    return path.join(root, "public", withoutQuery.replace(/^\/+/, ""));
  }
  return path.resolve(path.dirname(articleFile), withoutQuery);
}


function assetExists(src, context) {
  if (!src) return false;
  if (isRemoteAsset(src)) return true;
  const resolved = resolveLocalAsset(src, context);
  return Boolean(resolved && fs.existsSync(resolved));
}


function problem(code, detail) {
  return { code, detail };
}


export function auditArticleFiles(
  files,
  {
    root = ROOT,
    longFormWords = DEFAULT_LONG_FORM_WORDS,
  } = {},
) {
  const rows = [];

  for (const file of files) {
    const absolute = path.resolve(file);
    const slug = path.basename(absolute, path.extname(absolute));
    if (!fs.existsSync(absolute)) {
      rows.push({
        file: absolute,
        slug,
        hero: "",
        heroExists: false,
        wordCount: 0,
        bodyImageCount: 0,
        chartCount: 0,
        longFormHeroOnly: false,
        bodyImages: [],
        problems: [problem("file_not_found", `File does not exist: ${file}`)],
      });
      continue;
    }

    const raw = fs.readFileSync(absolute, "utf8");
    const { frontmatter, body } = splitArticle(raw);
    const hero = readFrontmatterImage(frontmatter);
    const heroExists = assetExists(hero, { root, articleFile: absolute });
    const wordCount = countArticleWords(body);
    const bodyImages = extractBodyImages(body).map((image) => ({
      ...image,
      exists: assetExists(image.src, { root, articleFile: absolute }),
      chartLike: CHART_TERMS.test(`${image.alt} ${image.src}`),
    }));
    const chartCount = bodyImages.filter((image) => image.chartLike).length;
    const longFormHeroOnly = wordCount >= longFormWords && bodyImages.length === 0;
    const problems = [];

    if (!hero) problems.push(problem("missing_hero", "frontmatter image is not set"));
    else if (!heroExists) {
      problems.push(problem("missing_hero_asset", `Hero asset does not exist: ${hero}`));
    }
    if (longFormHeroOnly) {
      problems.push(
        problem(
          "long_form_hero_only",
          `${wordCount} words with no body images (threshold: ${longFormWords})`,
        ),
      );
    }
    for (const image of bodyImages) {
      if (!image.src) {
        problems.push(problem("body_image_missing_src", "Body image has no src"));
      } else if (!image.exists) {
        problems.push(
          problem("missing_body_asset", `Body image asset does not exist: ${image.src}`),
        );
      }
      if (!image.alt) {
        problems.push(problem("body_image_missing_alt", `Body image has no alt: ${image.src}`));
      }
    }

    rows.push({
      file: absolute,
      slug,
      hero,
      heroExists,
      wordCount,
      bodyImageCount: bodyImages.length,
      chartCount,
      longFormHeroOnly,
      bodyImages,
      problems,
    });
  }

  const counts = {};
  for (const row of rows) {
    for (const item of row.problems) counts[item.code] = (counts[item.code] || 0) + 1;
  }
  return {
    scanned: rows.length,
    longFormWords,
    withHero: rows.filter((row) => row.hero).length,
    withExistingHero: rows.filter((row) => row.heroExists).length,
    withBodyImages: rows.filter((row) => row.bodyImageCount > 0).length,
    withCharts: rows.filter((row) => row.chartCount > 0).length,
    totalBodyImages: rows.reduce((sum, row) => sum + row.bodyImageCount, 0),
    totalCharts: rows.reduce((sum, row) => sum + row.chartCount, 0),
    longFormHeroOnly: rows.filter((row) => row.longFormHeroOnly).length,
    articlesWithIssues: rows.filter((row) => row.problems.length > 0).length,
    counts,
    rows,
  };
}


function parseArgs(argv) {
  const options = {
    strict: false,
    json: false,
    files: [],
    filesFrom: "",
    report: "",
    longFormWords: DEFAULT_LONG_FORM_WORDS,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--strict") options.strict = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--files") {
      options.files.push(
        ...(argv[++index] || "").split(",").map((item) => item.trim()).filter(Boolean),
      );
    } else if (arg === "--files-from") options.filesFrom = argv[++index] || "";
    else if (arg === "--report") options.report = argv[++index] || "";
    else if (arg === "--long-form-words") {
      options.longFormWords = Number.parseInt(argv[++index] || "", 10);
    } else if (!arg.startsWith("-")) options.files.push(arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(options.longFormWords) || options.longFormWords < 1) {
    throw new Error("--long-form-words must be a positive integer");
  }
  return options;
}


function listInventory(articlesDir = DEFAULT_ARTICLES_DIR) {
  return fs
    .readdirSync(articlesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(articlesDir, entry.name))
    .sort();
}


function summaryLine(result) {
  return (
    `scanned=${result.scanned} hero=${result.withHero} ` +
    `hero_assets=${result.withExistingHero} body_images=${result.totalBodyImages} ` +
    `articles_with_body_images=${result.withBodyImages} charts=${result.totalCharts} ` +
    `long_form_hero_only=${result.longFormHeroOnly} issues=${result.articlesWithIssues}`
  );
}


function printHuman(result, strict) {
  console.log(`[audit-visuals] mode=${strict ? "strict" : "report-only"}`);
  console.log(`[audit-visuals] ${summaryLine(result)}`);
  console.log(`[audit-visuals] long_form_threshold=${result.longFormWords}`);
  for (const [code, count] of Object.entries(result.counts).sort()) {
    console.log(`[audit-visuals] ${code}=${count}`);
  }
  for (const row of result.rows.filter((item) => item.problems.length).slice(0, 40)) {
    console.log(
      `[audit-visuals] ${row.slug}: words=${row.wordCount} body_images=${row.bodyImageCount} ` +
        `charts=${row.chartCount} problems=${row.problems.map((item) => item.code).join(",")}`,
    );
  }
  if (!strict && result.articlesWithIssues > 0) {
    console.log(
      "[audit-visuals] Legacy gaps are report-only. Use --strict with --files or --files-from for a bounded gate.",
    );
  }
}


function markdownReport(result) {
  const generated = new Date().toISOString();
  const issueRows = result.rows
    .filter((row) => row.problems.length > 0)
    .sort((a, b) => b.wordCount - a.wordCount || a.slug.localeCompare(b.slug));
  const lines = [
    "# Article visual baseline",
    "",
    `Generated: ${generated}`,
    "",
    `Long-form threshold: ${result.longFormWords.toLocaleString("en-US")} words`,
    "",
    "## Inventory",
    "",
    "| Metric | Count |",
    "|---|---:|",
    `| Articles scanned | ${result.scanned} |`,
    `| Articles with a hero reference | ${result.withHero} |`,
    `| Articles with an existing hero asset | ${result.withExistingHero} |`,
    `| Articles with body images | ${result.withBodyImages} |`,
    `| Body images | ${result.totalBodyImages} |`,
    `| Articles with charts or diagrams | ${result.withCharts} |`,
    `| Charts or diagrams | ${result.totalCharts} |`,
    `| Long-form, hero-only articles | ${result.longFormHeroOnly} |`,
    `| Articles with quality issues | ${result.articlesWithIssues} |`,
    "",
    "## Issue counts",
    "",
    "| Issue | Count |",
    "|---|---:|",
    ...Object.entries(result.counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, count]) => `| \`${code}\` | ${count} |`),
    "",
    "## Articles requiring attention",
    "",
    "| Article | Words | Body images | Charts | Issues |",
    "|---|---:|---:|---:|---|",
    ...issueRows.map(
      (row) =>
        `| ${row.slug} | ${row.wordCount} | ${row.bodyImageCount} | ${row.chartCount} | ` +
        `${row.problems.map((item) => `\`${item.code}\``).join(", ")} |`,
    ),
    "",
    "## Gate behavior",
    "",
    "The default command is report-only and never fails on legacy inventory. Strict mode requires an explicit `--files` or `--files-from` list and evaluates only that bounded batch.",
    "",
  ];
  return lines.join("\n");
}


export function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`[audit-visuals] ${error.message}`);
    return 2;
  }

  if (options.filesFrom) {
    try {
      const listed = fs
        .readFileSync(path.resolve(options.filesFrom), "utf8")
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
      options.files.push(...listed);
    } catch (error) {
      console.error(`[audit-visuals] Could not read --files-from: ${error.message}`);
      return 2;
    }
  }
  if (options.strict && options.files.length === 0) {
    console.error(
      "[audit-visuals] Strict mode requires --files or --files-from so legacy inventory cannot break production by accident.",
    );
    return 2;
  }

  const files = options.files.length
    ? options.files.map((file) => path.resolve(file))
    : listInventory();
  const result = auditArticleFiles(files, { longFormWords: options.longFormWords });
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else printHuman(result, options.strict);

  if (options.report) {
    const reportPath = path.resolve(options.report);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, markdownReport(result), "utf8");
    console.log(`[audit-visuals] report=${reportPath}`);
  }
  return options.strict && result.articlesWithIssues > 0 ? 1 : 0;
}


const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) process.exitCode = main();
