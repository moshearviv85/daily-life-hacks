/**
 * Derive routing artifacts from pin-destinations.json (single source of truth).
 *
 * Writes:
 * - pipeline-data/slug-aliases.json
 * - pipeline-data/router-mapping.json  (pin-origin only, for CSV/compat)
 * - public/data/pin-destinations-flat.json
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

export function normalizeSlug(slug) {
  return String(slug || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

export function derivePinRouting(doc, { root = ROOT } = {}) {
  const aliases = {};
  const routerMapping = {};
  const flat = {};

  for (const [canonicalRaw, entry] of Object.entries(doc.articles || {})) {
    const canonical = normalizeSlug(entry?.canonical || canonicalRaw);
    if (!canonical) continue;

    const pinVariants = {};
    let pinIdx = 0;

    for (const dest of entry.destinations || []) {
      const urlSlug = normalizeSlug(dest.url_slug);
      if (!urlSlug || urlSlug === canonical) continue;

      aliases[urlSlug] = canonical;
      flat[urlSlug] = canonical;

      if (dest.origin === "pin") {
        pinIdx += 1;
        const id = dest.id && /^v\d+$/i.test(dest.id) ? dest.id.toLowerCase() : `v${pinIdx}`;
        pinVariants[id] = {
          url_slug: urlSlug,
          title: dest.title || "",
          created_at: dest.created_at || null,
        };
      }
    }

    if (Object.keys(pinVariants).length) {
      routerMapping[canonical] = pinVariants;
    }
  }

  const aliasesPath = path.join(root, "pipeline-data", "slug-aliases.json");
  const mappingPath = path.join(root, "pipeline-data", "router-mapping.json");
  const flatPath = path.join(root, "public", "data", "pin-destinations-flat.json");

  fs.mkdirSync(path.dirname(flatPath), { recursive: true });

  const sortedAliases = Object.fromEntries(
    Object.keys(aliases)
      .sort()
      .map((k) => [k, aliases[k]]),
  );
  const sortedMapping = Object.fromEntries(
    Object.keys(routerMapping)
      .sort()
      .map((k) => [k, routerMapping[k]]),
  );
  const sortedFlat = Object.fromEntries(
    Object.keys(flat)
      .sort()
      .map((k) => [k, flat[k]]),
  );

  fs.writeFileSync(aliasesPath, `${JSON.stringify(sortedAliases, null, 2)}\n`, "utf8");
  fs.writeFileSync(mappingPath, `${JSON.stringify(sortedMapping, null, 2)}\n`, "utf8");
  fs.writeFileSync(flatPath, `${JSON.stringify(sortedFlat, null, 2)}\n`, "utf8");

  return {
    aliases: Object.keys(sortedAliases).length,
    routerBases: Object.keys(sortedMapping).length,
    flat: Object.keys(sortedFlat).length,
  };
}

export function derivePinRoutingFromFile({ root = ROOT } = {}) {
  const docPath = path.join(root, "pipeline-data", "pin-destinations.json");
  const doc = JSON.parse(fs.readFileSync(docPath, "utf8"));
  return derivePinRouting(doc, { root });
}
