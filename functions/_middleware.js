/**
 * Close the production pages.dev mirror without touching www.
 *
 * Cloudflare Pages `_redirects` matches paths only (domain-level redirects are
 * unsupported), so a host check has to live in a Function. This middleware
 * runs before functions/[[path]].js on every route that `_routes.json` includes.
 *
 * - daily-life-hacks.pages.dev → 301 to the same path and query on www
 * - <preview>.daily-life-hacks.pages.dev (hash previews and branch aliases
 *   such as staging) → serve the deployment, with X-Robots-Tag: noindex
 * - www.daily-life-hacks.com and the apex domain → unchanged
 *
 * Paths excluded in public/_routes.json are served by the asset server and
 * never reach this file. Those are static files (images, CSS, data, robots,
 * sitemap), not the HTML duplicate.
 */

const PAGES_PRODUCTION_HOST = "daily-life-hacks.pages.dev";
const PAGES_PREVIEW_SUFFIX = ".daily-life-hacks.pages.dev";
const CANONICAL_ORIGIN = "https://www.daily-life-hacks.com";

export function pagesDevHostAction(hostname) {
  const host = String(hostname || "").trim().toLowerCase().replace(/\.$/, "");
  if (host === PAGES_PRODUCTION_HOST) return "redirect";
  if (host.endsWith(PAGES_PREVIEW_SUFFIX)) return "noindex";
  return "pass";
}

export function canonicalMirrorUrl(requestUrl) {
  const url = new URL(requestUrl);
  const destination = new URL(CANONICAL_ORIGIN);
  destination.pathname = url.pathname;
  destination.search = url.search;
  return destination.toString();
}

export function applyPreviewNoindex(response) {
  const existing = response.headers.get("X-Robots-Tag");
  if (existing && /\bnoindex\b/i.test(existing)) return response;

  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", existing ? `${existing}, noindex` : "noindex");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function onRequest(context) {
  const action = pagesDevHostAction(new URL(context.request.url).hostname);

  if (action === "redirect") {
    return Response.redirect(canonicalMirrorUrl(context.request.url), 301);
  }

  if (action === "noindex") {
    const response = await context.next();
    return applyPreviewNoindex(response);
  }

  return context.next();
}
