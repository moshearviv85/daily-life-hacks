/**
 * Bridge between `seo_regression_check.py` and the real sitemap rules in
 * `astro.config.mjs`.
 *
 * The regression harness must never re-implement (or guess at) which URLs the
 * sitemap excludes -- that is exactly the kind of drift that lets a broken
 * sitemap ship unnoticed. Instead this script imports `astro.config.mjs` with
 * its three bare imports stubbed out, pulls the *actual* `serialize()` the
 * build uses, and applies it to the URLs the harness asks about.
 *
 * Protocol
 *   stdin : {"urls": ["https://.../slug/", ...]}
 *   stdout: {"ok": true, "site": "...", "trailingSlash": "always",
 *            "results": {"<url>": {"excluded": bool, "priority": number|null,
 *                                  "images": number, "lastmod": string|null}}}
 *   On failure: {"ok": false, "error": "..."} and a non-zero exit code.
 *
 * Usage: node scripts/seo_config_bridge.mjs [path/to/astro.config.mjs]
 */

import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function fail(message) {
  process.stdout.write(JSON.stringify({ ok: false, error: message }) + '\n');
  process.exit(1);
}

function readStdin() {
  try {
    const raw = readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : { urls: [] };
  } catch (err) {
    fail(`could not read/parse stdin JSON: ${err.message}`);
  }
}

async function main() {
  const configPath = resolvePath(
    process.argv[2] || resolvePath(HERE, '..', 'astro.config.mjs'),
  );

  register('./seo_config_loader.mjs', import.meta.url);

  let config;
  try {
    config = (await import(pathToFileURL(configPath).href)).default;
  } catch (err) {
    fail(`could not import ${configPath}: ${err.message}`);
  }

  const integration = (config?.integrations || []).find(
    (i) => i && i.__sitemapOptions && typeof i.__sitemapOptions.serialize === 'function',
  );
  if (!integration) {
    fail(
      'astro.config.mjs no longer exposes a sitemap integration with a serialize() ' +
        'function -- the SEO harness can no longer read the real exclusion rules. ' +
        'Update scripts/seo_config_bridge.mjs to match the new config shape.',
    );
  }

  const serialize = integration.__sitemapOptions.serialize;
  const { urls = [] } = readStdin();
  const results = {};

  for (const url of urls) {
    let item;
    try {
      item = serialize({ url });
    } catch (err) {
      results[url] = { excluded: null, error: err.message };
      continue;
    }
    if (item === undefined || item === null) {
      results[url] = { excluded: true, priority: null, images: 0, lastmod: null };
      continue;
    }
    results[url] = {
      excluded: false,
      priority: typeof item.priority === 'number' ? item.priority : null,
      images: Array.isArray(item.img) ? item.img.length : 0,
      lastmod: item.lastmod ?? null,
    };
  }

  process.stdout.write(
    JSON.stringify({
      ok: true,
      site: config.site ?? null,
      trailingSlash: config.trailingSlash ?? null,
      results,
    }) + '\n',
  );
}

main().catch((err) => fail(err && err.stack ? err.stack : String(err)));
