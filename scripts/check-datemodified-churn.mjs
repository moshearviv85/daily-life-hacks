#!/usr/bin/env node
/**
 * Fail a pull request that changes `dateModified` in more than 5 article files
 * unless the PR carries the `content-refresh` label.
 *
 * Compares DATEMODIFIED_BASE (GitHub's pull_request base SHA, or origin/main)
 * with the working tree, so a local run sees uncommitted edits and CI sees
 * the checked-out PR.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const DATEMODIFIED_FILE_LIMIT = 5;
const ARTICLE_PREFIX = "src/data/articles/";

export function extractDateModified(markdown) {
  if (!markdown) return null;
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return null;
  const match = frontmatter[1].match(
    /^dateModified:\s*["']?([^"'\n#]+?)["']?\s*$/m,
  );
  return match ? match[1].trim() : null;
}

export function dateModifiedChurn(entries, labels = []) {
  const changed = entries.filter((entry) => entry.before !== entry.after);
  const labeled = labels.some((label) => label.trim() === "content-refresh");
  return {
    changed,
    labeled,
    ok: labeled || changed.length <= DATEMODIFIED_FILE_LIMIT,
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

function collectEntries(base) {
  return changedArticlePaths(base).map((path) => ({
    path,
    before: extractDateModified(showAt(base, path)),
    after: extractDateModified(readWorking(path)),
  }));
}

function report(result) {
  const count = result.changed.length;
  if (result.labeled) {
    console.log(
      `dateModified churn: content-refresh label present (${count} article file(s) changed).`,
    );
    return;
  }
  console.log(
    `dateModified churn: ${count} article file(s) changed (limit ${DATEMODIFIED_FILE_LIMIT}).`,
  );
  if (!result.ok) {
    console.error(
      `dateModified changed in ${count} article files. The limit is ${DATEMODIFIED_FILE_LIMIT} unless the PR label is content-refresh.`,
    );
    for (const entry of result.changed) {
      console.error(`- ${entry.path}: ${entry.before ?? "(none)"} -> ${entry.after ?? "(none)"}`);
    }
  }
}

function main() {
  const base = resolveBase();
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
