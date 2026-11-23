/**
 * HTML requests never reach public/_redirects.
 *
 * public/_routes.json includes "/*", so functions/[[path]].js handles every
 * page. Cloudflare then applies _redirects only inside env.ASSETS.fetch, and
 * that fetch follows the 301 and returns the destination HTML with status 200.
 * Paths excluded from the function (sitemap.xml) still 301 at the edge.
 *
 * This module is the copy the function applies itself. tests/site-redirects.test.mjs
 * fails if it drifts from public/_redirects.
 */

export const SITE_REDIRECT_SOURCE = `/free-meal-plan / 301
/free-meal-plan/ / 301
/meal-plan/* / 301
/sitemap.xml /sitemap-index.xml 301
/sitemap.xml/ /sitemap-index.xml 301
/kfc-protein-per-dollar /fast-food-protein-per-dollar-ranked/ 301
/kfc-protein-per-dollar/ /fast-food-protein-per-dollar-ranked/ 301
/mcdonalds-protein-per-dollar /fast-food-protein-per-dollar-ranked/ 301
/mcdonalds-protein-per-dollar/ /fast-food-protein-per-dollar-ranked/ 301
/taco-bell-protein-per-dollar /fast-food-protein-per-dollar-ranked/ 301
/taco-bell-protein-per-dollar/ /fast-food-protein-per-dollar-ranked/ 301
/wendys-protein-per-dollar /fast-food-protein-per-dollar-ranked/ 301
/wendys-protein-per-dollar/ /fast-food-protein-per-dollar-ranked/ 301
/chipotle-protein-per-dollar /fast-food-protein-per-dollar-ranked/ 301
/chipotle-protein-per-dollar/ /fast-food-protein-per-dollar-ranked/ 301
/tofu-vs-chicken-protein-cost /protein-per-serving-beans-chicken-tofu-compared/ 301
/tofu-vs-chicken-protein-cost/ /protein-per-serving-beans-chicken-tofu-compared/ 301
/lentils-vs-chicken-breast-protein-cost /protein-per-serving-beans-chicken-tofu-compared/ 301
/lentils-vs-chicken-breast-protein-cost/ /protein-per-serving-beans-chicken-tofu-compared/ 301
/ground-beef-vs-beans-protein-cost /protein-per-serving-beans-chicken-tofu-compared/ 301
/ground-beef-vs-beans-protein-cost/ /protein-per-serving-beans-chicken-tofu-compared/ 301
/chicken-thighs-vs-breast-protein-cost /protein-per-serving-beans-chicken-tofu-compared/ 301
/chicken-thighs-vs-breast-protein-cost/ /protein-per-serving-beans-chicken-tofu-compared/ 301
/peanut-butter-vs-almonds-protein-cost /protein-per-serving-beans-chicken-tofu-compared/ 301
/peanut-butter-vs-almonds-protein-cost/ /protein-per-serving-beans-chicken-tofu-compared/ 301
/eggs-vs-greek-yogurt-protein-cost /protein-per-serving-beans-chicken-tofu-compared/ 301
/eggs-vs-greek-yogurt-protein-cost/ /protein-per-serving-beans-chicken-tofu-compared/ 301
/canned-vs-dry-beans-cost /canned-beans-vs-dried-beans-nutrition/ 301
/canned-vs-dry-beans-cost/ /canned-beans-vs-dried-beans-nutrition/ 301
/popcorn-vs-almonds-fiber-cost /popcorn-vs-potato-chips-fiber-comparison/ 301
/popcorn-vs-almonds-fiber-cost/ /popcorn-vs-potato-chips-fiber-comparison/ 301
/frozen-vs-fresh-vegetables-fiber-cost /frozen-vs-fresh-produce-when-to-buy/ 301
/frozen-vs-fresh-vegetables-fiber-cost/ /frozen-vs-fresh-produce-when-to-buy/ 301
/whole-wheat-flour-vs-quinoa-fiber-cost /fiber-per-dollar-cheapest-high-fiber-foods/ 301
/whole-wheat-flour-vs-quinoa-fiber-cost/ /fiber-per-dollar-cheapest-high-fiber-foods/ 301
/grains-fiber-per-dollar-ranked /fiber-per-dollar-cheapest-high-fiber-foods/ 301
/grains-fiber-per-dollar-ranked/ /fiber-per-dollar-cheapest-high-fiber-foods/ 301
/produce-fiber-per-dollar-ranked /fiber-per-dollar-cheapest-high-fiber-foods/ 301
/produce-fiber-per-dollar-ranked/ /fiber-per-dollar-cheapest-high-fiber-foods/ 301
/high-fiber-snacks-per-dollar /fiber-per-dollar-cheapest-high-fiber-foods/ 301
/high-fiber-snacks-per-dollar/ /fiber-per-dollar-cheapest-high-fiber-foods/ 301
/one-dollar-fiber-what-it-buys /fiber-per-dollar-cheapest-high-fiber-foods/ 301
/one-dollar-fiber-what-it-buys/ /fiber-per-dollar-cheapest-high-fiber-foods/ 301
/dairy-protein-per-dollar-ranked /protein-per-dollar-cheapest-protein-sources/ 301
/dairy-protein-per-dollar-ranked/ /protein-per-dollar-cheapest-protein-sources/ 301
/meat-per-dollar-protein-ranked /protein-per-dollar-cheapest-protein-sources/ 301
/meat-per-dollar-protein-ranked/ /protein-per-dollar-cheapest-protein-sources/ 301
/plant-protein-per-dollar-ranked /protein-per-dollar-cheapest-protein-sources/ 301
/plant-protein-per-dollar-ranked/ /protein-per-dollar-cheapest-protein-sources/ 301
/no-cook-protein-per-dollar /protein-per-dollar-cheapest-protein-sources/ 301
/no-cook-protein-per-dollar/ /protein-per-dollar-cheapest-protein-sources/ 301
/shelf-stable-pantry-per-dollar /protein-per-dollar-cheapest-protein-sources/ 301
/shelf-stable-pantry-per-dollar/ /protein-per-dollar-cheapest-protein-sources/ 301
/one-dollar-protein-what-it-buys /protein-per-dollar-cheapest-protein-sources/ 301
/one-dollar-protein-what-it-buys/ /protein-per-dollar-cheapest-protein-sources/ 301
/cheapest-protein-per-gram /protein-per-dollar-cheapest-protein-sources/ 301
/cheapest-protein-per-gram/ /protein-per-dollar-cheapest-protein-sources/ 301
/how-much-dried-beans-per-person /canned-beans-vs-dried-beans-nutrition/ 301
/how-much-dried-beans-per-person/ /canned-beans-vs-dried-beans-nutrition/ 301
/how-much-is-a-can-of-beans /canned-beans-vs-dried-beans-nutrition/ 301
/how-much-is-a-can-of-beans/ /canned-beans-vs-dried-beans-nutrition/ 301
/do-you-have-to-cook-canned-beans /canned-beans-vs-dried-beans-nutrition/ 301
/do-you-have-to-cook-canned-beans/ /canned-beans-vs-dried-beans-nutrition/ 301
/how-long-do-opened-canned-beans-last /canned-beans-vs-dried-beans-nutrition/ 301
/how-long-do-opened-canned-beans-last/ /canned-beans-vs-dried-beans-nutrition/ 301
/how-much-protein-in-a-can-of-beans /canned-beans-vs-dried-beans-nutrition/ 301
/how-much-protein-in-a-can-of-beans/ /canned-beans-vs-dried-beans-nutrition/ 301
/how-long-do-canned-beans-last-after-the-best-by-date /canned-beans-vs-dried-beans-nutrition/ 301
/how-long-do-canned-beans-last-after-the-best-by-date/ /canned-beans-vs-dried-beans-nutrition/ 301
/nutritional-value-of-beans-compared /canned-beans-vs-dried-beans-nutrition/ 301
/nutritional-value-of-beans-compared/ /canned-beans-vs-dried-beans-nutrition/ 301
/how-much-rice-and-beans-per-person-per-day /can-you-eat-rice-and-beans-everyday/ 301
/how-much-rice-and-beans-per-person-per-day/ /can-you-eat-rice-and-beans-everyday/ 301
/how-long-can-rice-and-beans-sit-out /can-you-eat-rice-and-beans-everyday/ 301
/how-long-can-rice-and-beans-sit-out/ /can-you-eat-rice-and-beans-everyday/ 301
/what-beans-for-red-beans-and-rice /can-you-eat-rice-and-beans-everyday/ 301
/what-beans-for-red-beans-and-rice/ /can-you-eat-rice-and-beans-everyday/ 301
/how-much-lentils-per-person-per-day /can-you-eat-rice-and-beans-everyday/ 301
/how-much-lentils-per-person-per-day/ /can-you-eat-rice-and-beans-everyday/ 301
/how-to-make-sourdough-pizza-dough-same-day /easy-sourdough-discard-pizza-dough-no-yeast/ 301
/how-to-make-sourdough-pizza-dough-same-day/ /easy-sourdough-discard-pizza-dough-no-yeast/ 301
/how-to-pack-lunch-crisp-sandwiches-salads /how-to-keep-sandwiches-from-getting-soggy/ 301
/how-to-pack-lunch-crisp-sandwiches-salads/ /how-to-keep-sandwiches-from-getting-soggy/ 301
/how-to-keep-bread-fresh-longer-without-mold /how-to-keep-sandwiches-from-getting-soggy/ 301
/how-to-keep-bread-fresh-longer-without-mold/ /how-to-keep-sandwiches-from-getting-soggy/ 301
/how-much-protein-in-two-eggs /foods-highest-in-protein-per-100-grams/ 301
/how-much-protein-in-two-eggs/ /foods-highest-in-protein-per-100-grams/ 301
/how-much-protein-in-peanut-butter /foods-highest-in-protein-per-100-grams/ 301
/how-much-protein-in-peanut-butter/ /foods-highest-in-protein-per-100-grams/ 301
/how-much-protein-in-lentils /foods-highest-in-protein-per-100-grams/ 301
/how-much-protein-in-lentils/ /foods-highest-in-protein-per-100-grams/ 301
/how-much-protein-in-oatmeal /foods-highest-in-protein-per-100-grams/ 301
/how-much-protein-in-oatmeal/ /foods-highest-in-protein-per-100-grams/ 301
/how-to-cool-rice-for-fried-rice /how-to-use-leftover-rice-creative-ideas/ 301
/how-to-cool-rice-for-fried-rice/ /how-to-use-leftover-rice-creative-ideas/ 301
/cauliflower-fried-rice-with-eggs /how-to-use-leftover-rice-creative-ideas/ 301
/cauliflower-fried-rice-with-eggs/ /how-to-use-leftover-rice-creative-ideas/ 301
/do-you-have-to-cook-frozen-vegetables /can-you-refreeze-frozen-vegetables-after-thawing/ 301
/do-you-have-to-cook-frozen-vegetables/ /can-you-refreeze-frozen-vegetables-after-thawing/ 301
/how-long-do-frozen-vegetables-last-in-the-freezer /can-you-refreeze-frozen-vegetables-after-thawing/ 301
/how-long-do-frozen-vegetables-last-in-the-freezer/ /can-you-refreeze-frozen-vegetables-after-thawing/ 301
/how-to-cook-frozen-vegetables-without-the-mush /can-you-refreeze-frozen-vegetables-after-thawing/ 301
/how-to-cook-frozen-vegetables-without-the-mush/ /can-you-refreeze-frozen-vegetables-after-thawing/ 301
/how-to-freeze-fresh-vegetables-at-home /can-you-refreeze-frozen-vegetables-after-thawing/ 301
/how-to-freeze-fresh-vegetables-at-home/ /can-you-refreeze-frozen-vegetables-after-thawing/ 301
/which-foods-are-complete-proteins /beans-and-rice-complete-protein-meal/ 301
/which-foods-are-complete-proteins/ /beans-and-rice-complete-protein-meal/ 301
/how-long-do-dried-beans-last /how-to-cook-dried-beans-from-scratch/ 301
/how-long-do-dried-beans-last/ /how-to-cook-dried-beans-from-scratch/ 301
`;

export function parseRedirectRules(source) {
  const rules = [];
  for (const rawLine of String(source).split(/\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 3) continue;
    const status = Number(parts[parts.length - 1]);
    if (!Number.isInteger(status)) continue;
    rules.push({
      source: parts[0],
      destination: parts.slice(1, -1).join(" "),
      status,
    });
  }
  return rules;
}

function substitute(destination, splat) {
  return destination.replaceAll(":splat", splat).replaceAll("*", splat);
}

function matchOne(rule, pathname) {
  if (rule.source.endsWith("/*")) {
    const base = rule.source.slice(0, -2);
    if (pathname === base || pathname === `${base}/`) {
      return substitute(rule.destination, "");
    }
    const nested = `${base}/`;
    if (pathname.startsWith(nested)) {
      return substitute(rule.destination, pathname.slice(nested.length));
    }
    return null;
  }
  if (rule.source.includes("*")) {
    const star = rule.source.indexOf("*");
    const prefix = rule.source.slice(0, star);
    const suffix = rule.source.slice(star + 1);
    if (!pathname.startsWith(prefix)) return null;
    const rest = pathname.slice(prefix.length);
    if (suffix && !rest.endsWith(suffix)) return null;
    const splat = suffix ? rest.slice(0, -suffix.length) : rest;
    return substitute(rule.destination, splat);
  }
  return pathname === rule.source ? rule.destination : null;
}

export function matchSiteRedirect(pathname, rules = SITE_REDIRECT_RULES) {
  for (const rule of rules) {
    const destination = matchOne(rule, pathname);
    if (!destination) continue;
    if (rule.status < 300 || rule.status > 399) continue;
    return { destination, status: rule.status };
  }
  return null;
}

export const SITE_REDIRECT_RULES = parseRedirectRules(SITE_REDIRECT_SOURCE);
