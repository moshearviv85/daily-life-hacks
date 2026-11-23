/**
 * Post-deploy check: every public/_redirects rule must be a real HTTP redirect.
 *
 * The Pages function owns HTML routes, so a green build does not prove production
 * returns 301. Run this against the deployed origin after the function ships:
 *
 *   node scripts/check-live-redirects.mjs --base https://www.daily-life-hacks.com
 *
 * It does not follow redirects. A 200 that serves the destination HTML fails.
 */
import { readFileSync } from "node:fs";
import { parseRedirectRules } from "../functions/site-redirects.js";

const rules = parseRedirectRules(
  readFileSync(new URL("../public/_redirects", import.meta.url), "utf8"),
);

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const base = arg("--base", process.env.REDIRECT_CHECK_BASE || "https://www.daily-life-hacks.com")
  .replace(/\/+$/, "");

function samplePath(source) {
  if (!source.includes("*")) return source;
  return source.replaceAll("*", "redirect-check");
}

function pathnameOf(location, requestUrl) {
  return new URL(location, requestUrl).pathname;
}

const failures = [];
let checked = 0;

for (const rule of rules) {
  const path = samplePath(rule.source);
  const url = `${base}${path}`;
  let response;
  try {
    response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      headers: { "user-agent": "dlh-redirect-check" },
    });
  } catch (error) {
    failures.push(`${path}  request failed: ${error.message}`);
    continue;
  }
  checked += 1;
  const location = response.headers.get("location");
  if (response.status !== rule.status) {
    failures.push(`${path}  HTTP ${response.status}, expected ${rule.status}`);
    continue;
  }
  if (!location) {
    failures.push(`${path}  HTTP ${response.status} with no Location header`);
    continue;
  }
  const actual = pathnameOf(location, url);
  const expected = pathnameOf(rule.destination, url);
  if (actual !== expected) {
    failures.push(`${path}  Location ${actual}, expected ${expected}`);
  }
}

if (failures.length) {
  console.error(`[check-live-redirects] ${failures.length} of ${checked} rule(s) failed against ${base}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`[check-live-redirects] OK: ${checked} rule(s) returned the configured redirect on ${base}`);
