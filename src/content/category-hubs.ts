/**
 * Topic sections for /nutrition/, /recipes/, and /tips/.
 *
 * Each indexable article belongs to exactly one category hub (the A-Z list).
 * A slug may also appear in one topic section, and only one. Start-here is
 * slugs[0]. Sections stay at 4-8 links so the rendered hub, including the
 * header and footer, stays under 120 anchors.
 *
 * Do not add a slug that is noindexed, pruned, or a 301/410 source.
 * PR #250's extra prune and 301 slugs are omitted from these sections even
 * while that PR is open, so a rebase does not publish a hub link to them.
 */
import { INDEX_NOINDEX_TOOL_PATHS, INDEX_PRUNE_SLUGS, normalizeIndexPath } from "./index-prune.js";
import { SITE_REDIRECT_RULES } from "../../functions/site-redirects.js";

export type HubCategory = "nutrition" | "recipes" | "tips";

export interface HubTopic {
  id: string;
  title: string;
  intro: string;
  slugs: readonly string[];
}

export interface CategoryHubDefinition {
  category: HubCategory;
  intro: string;
  topics: readonly HubTopic[];
}

export interface HubArticle {
  slug: string;
  title: string;
  category: HubCategory;
}

export interface ResolvedTopic {
  id: string;
  title: string;
  intro: string;
  articles: { slug: string; title: string }[];
}

export const CATEGORY_HUBS: readonly CategoryHubDefinition[] = [
  {
    category: "nutrition",
    intro:
      "These pages put a gram weight or a grocery price on fiber, beans, protein, and breakfast.",
    topics: [
      {
        id: "fiber",
        title: "Fiber, weighed",
        intro:
          "Start with the foods that actually carry the fiber, measured per 100 grams, before anyone turns it into a smoothie claim. The next page prices that fiber: what 30 grams costs in a day. After that you'll find the 28-gram daily target, how to add fiber without the gas, the water that has to show up with it, and two pages for the day the usual bowl isn't enough.",
        slugs: [
          "best-high-fiber-foods-ranked-by-fiber-content",
          "what-30-grams-of-fiber-costs-per-day",
          "fiber-protein-daily-values-explained",
          "how-to-increase-fiber-intake-without-gas",
          "water-and-fiber-the-golden-rule",
          "prune-juice-alternatives-for-constipation",
          "high-protein-high-fiber-meals-for-weight-loss",
        ],
      },
      {
        id: "beans",
        title: "Beans, dried and canned",
        intro:
          "Dried beans and canned beans stop being the same food once you read protein per 100 grams. Start there, then the dried bean that wins on protein, the split-pea dollar math, and the rice-and-beans plate people actually cook. Chicken and tofu sit in the same per-serving table so the bean number has something next to it.",
        slugs: [
          "canned-beans-vs-dried-beans-nutrition",
          "which-dried-beans-have-the-most-protein",
          "beans-double-win-fiber-protein",
          "can-you-eat-rice-and-beans-everyday",
          "protein-per-serving-beans-chicken-tofu-compared",
          "plant-based-protein-sources-complete-guide",
          "natto-japanese-fermented-soybeans-gut-health",
        ],
      },
      {
        id: "grocery-cost",
        title: "Protein and what it costs",
        intro:
          "The first page ignores price on purpose and ranks protein in 100 grams. The dollar pages come next: quality-adjusted protein per dollar, a 50 gram day, eggs versus the rest of the cart, and animal protein. Lentils with wheat, and the selenium foods, use that same cart for a different question.",
        slugs: [
          "foods-highest-in-protein-per-100-grams",
          "protein-per-dollar-adjusted-for-quality",
          "what-50-grams-of-protein-costs-per-day",
          "eggs-vs-everything-protein-value",
          "animal-protein-per-dollar-ranked",
          "cheapest-complete-protein-pairs",
          "selenium-containing-foods-easy-ways",
        ],
      },
      {
        id: "breakfast",
        title: "Breakfast that holds past 10",
        intro:
          "A breakfast page is here when it names the food and the reason you aren't opening the pantry at 10. The balanced breakfast is the start, then chia, the yogurt parfait, oats versus grits, and the high-fiber breakfast ideas. The peppermint and ginger mug is the ten-minute cup when the bowl isn't happening.",
        slugs: [
          "balanced-breakfast-that-keeps-you-full",
          "best-breakfast-foods-for-sustained-energy",
          "chia-pudding-variations-for-breakfast",
          "high-fiber-yogurt-parfait-for-breakfast",
          "oatmeal-vs-grits-fiber-content",
          "easy-high-fiber-breakfast-ideas-for-gut-health",
          "gut-health-tea-peppermint-ginger",
        ],
      },
    ],
  },
  {
    category: "recipes",
    intro:
      "Pick a discard bake, a bean dinner, a high-fiber plate, or a one-pan weeknight, then change the servings before you shop.",
    topics: [
      {
        id: "sourdough-discard",
        title: "Sourdough discard",
        intro:
          "If the jar in the fridge is why you're here, start with the beginner discard recipes. Pizza dough with no added yeast is the one people bake next, and there's a gluten-free crust when wheat is off the table. The crackers are that same jar, rolled thin, for the night you don't want a whole pizza.",
        slugs: [
          "easy-sourdough-discard-recipes-beginners",
          "easy-sourdough-discard-pizza-dough-no-yeast",
          "gluten-free-sourdough-discard-pizza-dough",
          "sourdough-discard-crackers",
        ],
      },
      {
        id: "bean-dinners",
        title: "Bean and lentil dinners",
        intro:
          "These are the pots where the bean is dinner, not a scoop you forgot on the side. Beans and rice is the start, with the protein per dollar already on the page. Black bean tacos, white-bean orzo, lentil curry, hummus, split pea soup, chickpea curry, and a 20-minute rice-and-beans plate fill the rest of the week.",
        slugs: [
          "beans-and-rice-complete-protein-meal",
          "easy-black-bean-tacos-weeknight-dinner",
          "creamy-tomato-orzo-white-beans-one-pot",
          "lentil-curry-high-fiber-vegan-dinner",
          "high-fiber-hummus-recipe-homemade",
          "split-pea-soup-recipe-high-fiber",
          "vegetarian-high-fiber-dinners-for-natural-relief",
          "quick-20-minute-high-fiber-meals-for-busy-days",
        ],
      },
      {
        id: "high-fiber-plates",
        title: "High-fiber plates",
        intro:
          "These recipes stay in this section because the fiber number is on the page. Savory chia is the start. Bran muffins, a gluten-free loaf, cauliflower crust, quinoa salad, stir-fried vegetables, cabbage soup, and a pear-walnut salad are the other plates.",
        slugs: [
          "savory-chia-seed-recipes-breakfast",
          "high-fiber-bran-muffins-that-taste-good",
          "high-fiber-gluten-free-bread-recipe",
          "high-fiber-pizza-crust-cauliflower",
          "high-fiber-quinoa-salad-for-lunch-prep",
          "high-fiber-stir-fry-vegetables",
          "fiber-rich-soup-for-weight-loss-cabbage",
          "pear-salad-with-walnuts-fiber-rich",
        ],
      },
      {
        id: "weeknight-dinners",
        title: "Weeknight pans and one pots",
        intro:
          "These dinners don't start with a soak or a starter. Sheet-pan salmon and vegetables is the 30-minute start. Skillet chicken, salmon bites, baked cod, one-pot chicken and rice, a cold pasta salad, barley risotto, and a Costco rotisserie (the bird is already cooked) cover the other nights.",
        slugs: [
          "sheet-pan-salmon-and-vegetables-30-minutes",
          "best-way-to-cook-chicken",
          "air-fryer-salmon-bites-garlic-honey-glaze",
          "baked-cod-lemon-capers-green-beans",
          "easy-one-pot-chicken-and-rice-dinner",
          "easy-cold-summer-pasta-salad-potlucks",
          "creamy-mushroom-barley-risotto-hands-off",
          "costco-rotisserie-chicken-meal-ideas-dinner",
        ],
      },
    ],
  },
  {
    category: "tips",
    intro:
      "Storage times, sourdough discard rules, dried-bean steps, and the small fixes that keep a cheap kitchen from feeding the trash.",
    topics: [
      {
        id: "storage",
        title: "Storage and food that lasts",
        intro:
          "Start with homemade salad dressing. The fridge life is 2 weeks, 1 week, or 3 to 4 days, and which one you get depends on the jar. Herbs, avocados, berries, refrozen vegetables, a work salad, a sandwich, and wilted lettuce are the other foods this section keeps out of the trash.",
        slugs: [
          "how-to-store-homemade-salad-dressing-safely",
          "how-to-store-fresh-herbs-to-last-longer",
          "best-way-to-store-avocados-to-stop-browning",
          "keep-berries-fresh-longer-when-to-wash",
          "can-you-refreeze-frozen-vegetables-after-thawing",
          "how-to-pack-salad-for-work-not-soggy",
          "how-to-keep-sandwiches-from-getting-soggy",
          "how-to-revive-wilted-lettuce-and-greens",
        ],
      },
      {
        id: "discard-handling",
        title: "Sourdough discard, before you bake",
        intro:
          "A cup of discard is not a measuring cup until you weigh it, so start there. The next pages cover how long the jar keeps, discard versus a starter that can still raise bread, and when a brand-new starter's discard is still a no. Then it's what to cook at 100, 227, or 500 grams, how to swap it for buttermilk, plus the no-yeast recipe list.",
        slugs: [
          "how-to-measure-sourdough-discard-grams",
          "how-long-does-sourdough-discard-last",
          "sourdough-discard-vs-active-starter",
          "can-you-use-sourdough-discard-from-a-new-starter",
          "what-to-make-with-sourdough-discard-by-amount",
          "sourdough-discard-buttermilk-substitute",
          "sourdough-discard-recipes-no-yeast",
        ],
      },
      {
        id: "dried-beans",
        title: "Dried beans and a cheaper cart",
        intro:
          "Cooking the dried beans yourself is the move that changes the grocery bill, so that page starts the section. The quick soak is the same pot on the day you forgot. A cheaper cart, the tools worth buying, and the food you can stop throwing out sit around that pot.",
        slugs: [
          "how-to-cook-dried-beans-from-scratch",
          "how-to-quick-soak-dried-beans-same-day",
          "how-to-make-grocery-shopping-cheaper",
          "kitchen-tools-that-save-time-and-money",
          "how-to-reduce-food-waste-at-home-easy-tips",
        ],
      },
      {
        id: "cooking-fixes",
        title: "When the salt or the pan goes wrong",
        intro:
          "Doubling a recipe is where the salt goes wrong, so start by taking seasoning to 1.5x instead of 2x. If the pot is already too salty, the next page fixes soup, sauce, and rice. Parchment versus a silicone mat, a freezer inventory, and a freezer you can actually search are the other systems that keep the week from turning into mystery bags.",
        slugs: [
          "how-to-double-recipe-seasoning-without-guessing",
          "fix-oversalted-soup-sauce-rice",
          "baking-sheet-liners-parchment-silicone-when-to-use",
          "freezer-inventory-simple-system",
          "freezer-organization-tips-large-family-meals",
        ],
      },
    ],
  },
] as const;

export const CATEGORY_HUB_BY_CATEGORY = new Map(
  CATEGORY_HUBS.map((hub) => [hub.category, hub]),
);

export function hubBlockList(): Set<string> {
  const blocked = new Set<string>();
  for (const slug of INDEX_PRUNE_SLUGS) blocked.add(normalizeIndexPath(slug));
  for (const path of INDEX_NOINDEX_TOOL_PATHS) blocked.add(normalizeIndexPath(path));
  for (const rule of SITE_REDIRECT_RULES) {
    if (rule.status !== 301 && rule.status !== 410) continue;
    const slug = normalizeIndexPath(rule.source);
    if (!slug || slug.includes("*")) continue;
    blocked.add(slug);
  }
  return blocked;
}

export function alphabeticalArticles(
  articles: readonly HubArticle[],
  category: HubCategory,
  blocked: ReadonlySet<string>,
): HubArticle[] {
  return articles
    .filter((article) => article.category === category && !blocked.has(article.slug))
    .sort((left, right) =>
      left.title.localeCompare(right.title, "en", { numeric: true, sensitivity: "base" }),
    );
}

export function resolveHubTopics(
  hub: CategoryHubDefinition,
  articles: readonly HubArticle[],
  blocked: ReadonlySet<string>,
): ResolvedTopic[] {
  const titles = new Map(
    articles
      .filter((article) => article.category === hub.category && !blocked.has(article.slug))
      .map((article) => [article.slug, article.title]),
  );

  return hub.topics.map((topic) => {
    const missing = topic.slugs.filter((slug) => !titles.has(slug));
    const resolved = topic.slugs
      .filter((slug) => titles.has(slug))
      .map((slug) => ({ slug, title: titles.get(slug)! }));
    if (resolved.length < 4 || resolved.length > 8 || resolved[0]?.slug !== topic.slugs[0]) {
      throw new Error(
        `${hub.category} topic "${topic.id}" resolved ${resolved.length} indexable links` +
          ` (need 4-8, with ${topic.slugs[0]} first). Missing: ${missing.join(", ") || "none"}`,
      );
    }
    return {
      id: topic.id,
      title: topic.title,
      intro: topic.intro,
      articles: resolved,
    };
  });
}

export function assembleHub(hub: CategoryHubDefinition, articles: readonly HubArticle[]) {
  const blocked = hubBlockList();
  return {
    blocked,
    topics: resolveHubTopics(hub, articles, blocked),
    alphabetical: alphabeticalArticles(articles, hub.category, blocked),
  };
}

export function itemListSchema(
  id: string,
  name: string,
  articles: readonly { slug: string; title: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": id,
    name,
    numberOfItems: articles.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: articles.map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: article.title,
      url: `https://www.daily-life-hacks.com/${article.slug}/`,
    })),
  };
}

function assertHubDefinitions() {
  const seen = new Map<string, string>();
  for (const hub of CATEGORY_HUBS) {
    if (hub.topics.length < 4) {
      throw new Error(`${hub.category} hub needs at least 4 topic sections`);
    }
    const sentences = hub.intro.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length !== 1) {
      throw new Error(`${hub.category} intro should be one sentence, got ${sentences.length}`);
    }
    if (hub.intro.includes("\u2014")) {
      throw new Error(`${hub.category} intro contains an em dash`);
    }
    for (const topic of hub.topics) {
      const topicSentences = topic.intro.split(/(?<=[.!?])\s+/).filter(Boolean);
      if (topicSentences.length < 2 || topicSentences.length > 3) {
        throw new Error(
          `${hub.category}/${topic.id} intro should be 2-3 sentences, got ${topicSentences.length}`,
        );
      }
      if (topic.intro.includes("\u2014") || topic.title.includes("\u2014")) {
        throw new Error(`${hub.category}/${topic.id} contains an em dash`);
      }
      if (topic.slugs.length < 4 || topic.slugs.length > 8) {
        throw new Error(`${hub.category}/${topic.id} needs 4-8 slugs, got ${topic.slugs.length}`);
      }
      if (new Set(topic.slugs).size !== topic.slugs.length) {
        throw new Error(`${hub.category}/${topic.id} repeats a slug`);
      }
      for (const slug of topic.slugs) {
        const owner = seen.get(slug);
        if (owner) throw new Error(`${slug} is in ${owner} and ${hub.category}/${topic.id}`);
        seen.set(slug, `${hub.category}/${topic.id}`);
        if (INDEX_PRUNE_SLUGS.has(slug) || INDEX_NOINDEX_TOOL_PATHS.has(slug)) {
          throw new Error(`${slug} is noindexed and cannot be a topic link`);
        }
      }
    }
  }
}

assertHubDefinitions();
