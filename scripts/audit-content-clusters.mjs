#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";


const ROOT = process.cwd();
const ARTICLES_DIR = path.join(ROOT, "src", "data", "articles");
const REGISTRY_PATH = path.join(ROOT, "src", "content", "clusters.ts");


function parseStringTuple(source, exportName) {
  const pattern = new RegExp(
    `export const ${exportName} = \\[([\\s\\S]*?)\\] as const;`,
  );
  const match = source.match(pattern);
  if (!match) throw new Error(`Could not read ${exportName} from cluster registry`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}


export function loadClusterRegistry(registryPath = REGISTRY_PATH) {
  const source = fs.readFileSync(registryPath, "utf8");
  const ids = parseStringTuple(source, "CONTENT_CLUSTER_IDS");
  const labels = parseStringTuple(source, "CONTENT_CLUSTER_LABELS");
  const parents = parseStringTuple(source, "CONTENT_PARENT_PILLARS");
  if (!ids.length || ids.length !== labels.length || ids.length !== parents.length) {
    throw new Error("Cluster registry tuples must be non-empty and have equal lengths");
  }
  return ids.map((id, index) => ({
    id,
    label: labels[index],
    parentPillar: parents[index],
  }));
}


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


export function readClusterFrontmatter(raw) {
  const match = raw.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/);
  if (!match) return { cluster: "", parentPillar: "" };
  const read = (key) => {
    const line = match[1].match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, "m"));
    return line ? unquoteScalar(line[1]) : "";
  };
  return {
    cluster: read("cluster"),
    parentPillar: read("parentPillar"),
  };
}


function problem(code, detail) {
  return { code, detail };
}


export function auditArticleFiles(
  files,
  {
    registry = loadClusterRegistry(),
    knownArticleSlugs = new Set(),
  } = {},
) {
  const byCluster = new Map(registry.map((entry) => [entry.id, entry]));
  const knownParents = new Set(registry.map((entry) => entry.parentPillar));
  const rows = [];

  for (const file of files) {
    const absolute = path.resolve(file);
    const slug = path.basename(absolute, path.extname(absolute));
    const problems = [];
    if (!fs.existsSync(absolute)) {
      problems.push(problem("file_not_found", `File does not exist: ${file}`));
      rows.push({ file: absolute, slug, cluster: "", parentPillar: "", problems });
      continue;
    }

    const metadata = readClusterFrontmatter(fs.readFileSync(absolute, "utf8"));
    const definition = byCluster.get(metadata.cluster);

    if (!metadata.cluster) {
      problems.push(problem("missing_cluster", "cluster is not assigned"));
    } else if (!definition) {
      problems.push(
        problem("unknown_cluster", `cluster is not registered: ${metadata.cluster}`),
      );
    }

    if (metadata.parentPillar === slug) {
      problems.push(
        problem("self_referential_parent", "parentPillar points to the article itself"),
      );
    }

    if (metadata.parentPillar && !knownParents.has(metadata.parentPillar)) {
      problems.push(
        problem(
          "unknown_parent",
          `parentPillar is not registered: ${metadata.parentPillar}`,
        ),
      );
    }

    if (definition) {
      const isRegisteredParent = slug === definition.parentPillar;
      if (!metadata.parentPillar && !isRegisteredParent) {
        problems.push(
          problem(
            "missing_parent",
            `parentPillar must be ${definition.parentPillar}`,
          ),
        );
      } else if (
        metadata.parentPillar &&
        metadata.parentPillar !== definition.parentPillar
      ) {
        problems.push(
          problem(
            "parent_mismatch",
            `cluster ${metadata.cluster} expects ${definition.parentPillar}`,
          ),
        );
      }
      if (
        knownArticleSlugs.size > 0 &&
        !knownArticleSlugs.has(definition.parentPillar)
      ) {
        problems.push(
          problem(
            "parent_file_missing",
            `registered parent article is missing: ${definition.parentPillar}`,
          ),
        );
      }
    }

    rows.push({ file: absolute, slug, ...metadata, problems });
  }

  const counts = {};
  for (const row of rows) {
    for (const item of row.problems) counts[item.code] = (counts[item.code] || 0) + 1;
  }
  return {
    scanned: rows.length,
    assigned: rows.filter((row) => row.cluster).length,
    articlesWithIssues: rows.filter((row) => row.problems.length > 0).length,
    counts,
    rows,
  };
}


function parseArgs(argv) {
  const options = { strict: false, json: false, files: [], filesFrom: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--strict") options.strict = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--files") {
      options.files.push(
        ...(argv[++index] || "").split(",").map((item) => item.trim()).filter(Boolean),
      );
    } else if (arg === "--files-from") options.filesFrom = argv[++index] || "";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}


function listInventory() {
  return fs
    .readdirSync(ARTICLES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(ARTICLES_DIR, entry.name))
    .sort();
}


function printHuman(result, strict) {
  console.log(`[audit-clusters] mode=${strict ? "strict" : "report-only"}`);
  console.log(
    `[audit-clusters] scanned=${result.scanned} assigned=${result.assigned} ` +
      `articles_with_issues=${result.articlesWithIssues}`,
  );
  for (const [code, count] of Object.entries(result.counts).sort()) {
    console.log(`[audit-clusters] ${code}=${count}`);
  }
  for (const row of result.rows.filter((item) => item.problems.length).slice(0, 25)) {
    console.log(
      `[audit-clusters] ${row.slug}: ${row.problems.map((item) => item.code).join(", ")}`,
    );
  }
  if (!strict && result.articlesWithIssues > 0) {
    console.log(
      "[audit-clusters] Legacy gaps are reported only. Use --strict with --files or --files-from for a bounded batch gate.",
    );
  }
}


export function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`[audit-clusters] ${error.message}`);
    return 2;
  }

  if (options.filesFrom) {
    const listed = fs
      .readFileSync(path.resolve(options.filesFrom), "utf8")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    options.files.push(...listed);
  }
  if (options.strict && options.files.length === 0) {
    console.error(
      "[audit-clusters] Strict mode requires --files or --files-from so legacy inventory cannot break production by accident.",
    );
    return 2;
  }

  const inventory = listInventory();
  const files = options.files.length ? options.files.map((file) => path.resolve(file)) : inventory;
  const knownArticleSlugs = new Set(
    inventory.map((file) => path.basename(file, path.extname(file))),
  );
  const result = auditArticleFiles(files, { knownArticleSlugs });
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else printHuman(result, options.strict);
  return options.strict && result.articlesWithIssues > 0 ? 1 : 0;
}


const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) process.exitCode = main();
