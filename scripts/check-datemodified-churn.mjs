#!/usr/bin/env node
/**
 * Fail a pull request that advances the public modified day on too many
 * articles, or that advances it without `substantiveUpdate`.
 *
 * The public day is `substantiveUpdate`, then legacy `dateModified`. It moves
 * forward only when `substantiveUpdate: YYYY-MM-DD` is set to that new day,
 * which means a changed number or claim, or a body change of at least 15%.
 * Link insertions, citation-only edits, Keep Reading, title rewrites, author
 * fixes, captions, and template changes must not set it.
 *
 * Restoring a date (the new day is earlier, or the field is removed) is not
 * churn. Deleting an article is not churn.
 *
 * How a content-refresh ships
 * ----------------------------
 * The `content-refresh` label allows more than 5 articles to advance. It does
 * not write dates. On each advanced article set the same day on both fields:
 *
 *   dateModified: 2026-11-23
 *   substantiveUpdate: 2026-11-23
 *
 * Or stamp the field from dates you already edited, then review the diff:
 *
 *   node scripts/check-datemodified-churn.mjs --stamp
 *
 * Do not stamp a link-only, citation-only, title-only, author-only, or
 * caption-only edit. Those must keep the previous public day.
 *
 * Compares DATEMODIFIED_BASE (GitHub's pull_request base SHA, or origin/main)
 * with the working tree, so a local run sees uncommitted edits and CI sees
 * the checked-out PR.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

import {
  extractFrontmatterField,
  isForwardModifiedDay,
} from "../src/content/modified-date.mjs";

export const DATEMODIFIED_FILE_LIMIT = 5;
const ARTICLE_PREFIX = "src/data/articles/";

export function extractDateModified(markdown) {
  return extractFrontmatterField(markdown, "dateModified");
}

function publicDay(markdown) {
  return (
    extractFrontmatterField(markdown, "substantiveUpdate") ||
    extractFrontmatterField(markdown, "dateModified")
  );
}

export function dateModifiedChurn(entries, labels = []) {
  // A deleted article takes its date with it. A restored (earlier) date is
  // the opposite of a freshness bump.
  const changed = entries.filter((entry) => {
    if (entry.deleted) return false;
    const before = entry.beforePublic ?? entry.before ?? null;
    const after = entry.afterPublic ?? entry.after ?? null;
    return isForwardModifiedDay(before, after);
  });
  const missingSubstantive = changed.filter((entry) => {
    const after = entry.afterPublic ?? entry.after ?? null;
    return entry.afterSubstantive !== after;
  });
  const labeled = labels.some((label) => label.trim() === "content-refresh");
  const withinLimit = changed.length <= DATEMODIFIED_FILE_LIMIT;
  return {
    changed,
    missingSubstantive,
    labeled,
    ok: missingSubstantive.length === 0 && (labeled || withinLimit),
  };
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function resolveBase() {
  const requested = (process.env.DATEMODIFIED_BASE || "").trim();
  const candidates = requested
    ? [requested]
    : ["origin/main", "main"];
  for (const candidate of candidates) {
    try {
      git(["rev-parse", "--verify", "--quiet", `${candidate}^{commit}`]);
      return candidate;
    } catch {
      // try the next ref
    }
  }
  throw new Error(
    `No base ref to compare (${candidates.join(", ")}). Fetch the PR base first.`,
  );
}

function labelsFromEnv() {
  return (process.env.PR_LABELS || "")
    .split(/[,\n]/)
    .map((label) => label.trim())
    .filter(Boolean);
}

function changedArticlePaths(base) {
  const names = git([
    "diff",
    "--name-only",
    "--diff-filter=ACMRD",
    base,
    "--",
    ARTICLE_PREFIX,
  ]);
  return names
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".md"));
}

function showAt(base, path) {
  try {
    return git(["show", `${base}:${path}`]);
  } catch {
    return null;
  }
}

function readWorking(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function entryFromSources(path, beforeSource, afterSource) {
  const beforeSubstantive = extractFrontmatterField(beforeSource, "substantiveUpdate");
  const afterSubstantive = extractFrontmatterField(afterSource, "substantiveUpdate");
  return {
    path,
    before: extractDateModified(beforeSource),
    after: extractDateModified(afterSource),
    beforePublic: publicDay(beforeSource),
    afterPublic: publicDay(afterSource),
    beforeSubstantive,
    afterSubstantive,
    deleted: afterSource === null,
  };
}

function collectEntries(base) {
  return changedArticlePaths(base).map((path) =>
    entryFromSources(path, showAt(base, path), readWorking(path)),
  );
}

function stampSubstantiveUpdate(markdown, day) {
  if (!markdown || extractFrontmatterField(markdown, "substantiveUpdate") === day) {
    return markdown;
  }
  const line = `substantiveUpdate: ${day}`;
  if (/^substantiveUpdate:\s*.+$/m.test(markdown)) {
    return markdown.replace(/^substantiveUpdate:\s*.+$/m, line);
  }
  if (/^dateModified:\s*.+$/m.test(markdown)) {
    return markdown.replace(/^(dateModified:\s*.+)$/m, `$1\n${line}`);
  }
  if (/^date:\s*.+$/m.test(markdown)) {
    return markdown.replace(/^(date:\s*.+)$/m, `$1\n${line}`);
  }
  return markdown;
}

function stampAdvances(entries) {
  let stamped = 0;
  for (const entry of entries) {
    if (entry.deleted) continue;
    const day = entry.afterPublic ?? entry.after;
    if (!day || entry.afterSubstantive === day) continue;
    if (!isForwardModifiedDay(entry.beforePublic ?? entry.before ?? null, day)) continue;
    const source = readWorking(entry.path);
    if (!source) continue;
    writeFileSync(entry.path, stampSubstantiveUpdate(source, day));
    stamped += 1;
    console.log(`stamped substantiveUpdate: ${day} on ${entry.path}`);
  }
  return stamped;
}

function report(result) {
  const count = result.changed.length;
  if (result.missingSubstantive.length > 0) {
    console.error(
      `dateModified advanced in ${result.missingSubstantive.length} article file(s) without substantiveUpdate.`,
    );
    console.error(
      "Set substantiveUpdate to the same day when a number or claim changed, or the body changed by at least 15%. The content-refresh label allows more than 5 of those files. It does not write the date.",
    );
    console.error("Example:");
    console.error("  dateModified: 2026-11-23");
    console.error("  substantiveUpdate: 2026-11-23");
    console.error("Or: node scripts/check-datemodified-churn.mjs --stamp");
    for (const entry of result.missingSubstantive) {
      const before = entry.beforePublic ?? entry.before ?? "(none)";
      const after = entry.afterPublic ?? entry.after ?? "(none)";
      console.error(`- ${entry.path}: ${before} -> ${after}`);
    }
    return;
  }
  if (result.labeled) {
    console.log(
      `dateModified churn: content-refresh label present (${count} article file(s) advanced, each with substantiveUpdate).`,
    );
    return;
  }
  console.log(
    `dateModified churn: ${count} article file(s) advanced (limit ${DATEMODIFIED_FILE_LIMIT}).`,
  );
  if (!result.ok) {
    console.error(
      `dateModified advanced in ${count} article files. The limit is ${DATEMODIFIED_FILE_LIMIT} unless the PR label is content-refresh and each file sets substantiveUpdate.`,
    );
    for (const entry of result.changed) {
      const before = entry.beforePublic ?? entry.before ?? "(none)";
      const after = entry.afterPublic ?? entry.after ?? "(none)";
      console.error(`- ${entry.path}: ${before} -> ${after}`);
    }
  }
}

function main() {
  const stamp = process.argv.includes("--stamp");
  const base = resolveBase();
  if (stamp) {
    const stamped = stampAdvances(collectEntries(base));
    console.log(`substantiveUpdate stamped on ${stamped} article file(s). Review the diff before committing.`);
  }
  const result = dateModifiedChurn(collectEntries(base), labelsFromEnv());
  report(result);
  process.exit(result.ok ? 0 : 1);
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
