import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const articleDirectory = join(root, "src", "data", "articles");
const outputPath = join(
  root,
  "reports",
  "growth",
  "missing-hero-creative-briefs-2026-07-28.json",
);

const concepts = {
  "best-high-fiber-foods-ranked-by-fiber-content":
    "Chia, split peas, and bran flakes share a grocery-shelf awards podium while blueberries arrive with a very small trophy.",
  "can-you-eat-rice-and-beans-everyday":
    "A familiar rice-and-beans bowl reports for duty on a seven-day calendar while a few empty ingredient chairs show what one meal can't cover.",
  "can-you-refreeze-frozen-vegetables-after-thawing":
    "A bag of vegetables reaches a fork in the road between a refrigerator door and a sunny kitchen counter.",
  "canned-beans-vs-dried-beans-nutrition":
    "The same black bean appears twice, once swimming in an open can and once carrying its own dry pantry sack.",
  "cheap-dinner-ideas-cost-per-serving":
    "Ten modest dinner plates line up at a tiny checkout, led by split pea soup carrying the lightest coin purse.",
  "cheap-dinner-ideas-for-a-family-of-4":
    "One generous pot of beans and rice serves four mismatched place settings without filling a luxury-size shopping cart.",
  "cheap-healthy-meals-for-college-students":
    "A dorm microwave and one battered pot run a tiny campus kitchen with oats, peanut butter, beans, and rice waiting their turn.",
  "cheap-healthy-meals-for-two":
    "Two dinner plates split oversized grocery packages at a kitchen table, with neat leftovers packed beside them.",
  "cheap-healthy-meals-with-leftovers":
    "A split pea soup pot sends tomorrow's portions into a tidy row of glass containers like a small lunch assembly line.",
  "cheap-lunch-ideas-cost-per-box":
    "Nine lunch boxes queue at a checkout while a peanut butter sandwich and banana confidently take the shortest receipt lane.",
  "chicken-thighs-vs-breast-protein-cost":
    "Three plain chicken cuts carry bargain baskets of visibly different sizes, with the bone-in dark meat basket fullest.",
  "do-you-have-to-cook-canned-beans":
    "An open can of rinsed beans sits ready beside an unplugged stove, looking mildly pleased that no pan is required.",
  "do-you-have-to-cook-frozen-vegetables":
    "A frosty vegetable bag waits at a tiny finish line just before a steaming pan, showing that blanching wasn't the final lap.",
  "does-leftover-pizza-need-to-be-refrigerated":
    "A pizza slice chooses between an open refrigerator and a dark overnight countertop under a kitchen clock.",
  "easy-cheap-healthy-meals":
    "Three ingredient groups click together like sturdy building blocks: a pantry anchor, a grain base, and a vegetable.",
  "eggs-vs-greek-yogurt-protein-cost":
    "Two eggs and a plain bowl of Greek yogurt sit on an almost level kitchen balance with a few coins underneath.",
  "food-storage-temperature-rules":
    "A refrigerator, freezer, and kitchen timer stand like three calm crossing guards for leftovers.",
  "foods-highest-in-protein-per-100-grams":
    "Lentils, chicken breast, and eggs step onto a grocery scale podium, with the dry lentils narrowly taking the top platform.",
  "frozen-vs-fresh-vegetables-fiber-cost":
    "Frozen peas arm-wrestle fresh broccoli across a kitchen table while a bag of carrots referees.",
  "grocery-budget-for-one-person-per-month":
    "A tiny one-person cart tries to carry four weekly grocery bags arranged beneath a plain monthly wall calendar.",
  "ground-beef-vs-beans-protein-cost":
    "Pinto beans pull ground beef and a trail of coins in a playful grocery-cart tug-of-war.",
  "high-protein-meals-on-a-budget":
    "A rice-and-beans bowl and a beef-and-rice bowl reach the same finish flag, but one drags a much heavier coin bag.",
  "how-long-can-rice-and-beans-sit-out":
    "A pot of rice and beans races a two-hour kitchen timer toward an open refrigerator door.",
  "how-long-do-canned-beans-last-after-the-best-by-date":
    "A clean undented bean can waits patiently on a pantry shelf while a dented, swollen can is ushered toward the exit.",
  "how-long-do-dried-beans-last":
    "A sealed jar of dried beans sits comfortably through changing calendar pages while moisture waits outside the pantry.",
  "how-long-do-frozen-vegetables-last-in-the-freezer":
    "A vegetable bag stays safe inside a frosty freezer while its bright colors slowly fade across twelve calendar tabs.",
  "how-long-do-leftovers-last-in-the-fridge":
    "Four leftover containers occupy four dated refrigerator shelves before a fifth shelf turns into a polite exit ramp.",
  "how-long-do-opened-canned-beans-last":
    "Half a can of beans transfers into a covered glass container and settles into a four-day refrigerator calendar.",
  "how-much-dried-beans-per-person":
    "A measured scoop of dry beans divides a four-pound pantry sack into twenty tidy place settings.",
  "how-much-food-storage-do-you-need-per-person":
    "One person's pantry kit stacks two weeks of plain staples beside fourteen one-gallon water jugs.",
  "how-much-is-a-can-of-beans":
    "Three unbranded bean cans sit on a grocery conveyor with a small group of real coins beside each one.",
  "how-much-lentils-per-person-per-day":
    "A 100-gram scoop of dry lentils fills one place setting while the rest of the bag portions itself into four companions.",
  "how-much-oatmeal-is-a-serving":
    "One 60-gram scoop leaves an oatmeal canister and lands in a breakfast bowl while nineteen scoops wait behind it.",
  "how-much-protein-for-breakfast":
    "Two eggs clear one quarter of a four-section breakfast plate while a lonely toast slice misses the line.",
  "how-much-protein-in-a-can-of-beans":
    "A bean can opens like a small pantry bank vault and releases beans beside a modest pile of coins.",
  "how-much-protein-in-lentils":
    "A 100-gram scoop of dry lentils confidently outweighs several familiar grocery proteins on an old kitchen scale.",
  "how-much-protein-in-oatmeal":
    "A plain oatmeal bowl arrives at breakfast with a small protein badge while the eggs look unexpectedly interested.",
  "how-much-protein-in-peanut-butter":
    "Two loaded peanut butter spoons sit in a miniature coin-operated diner booth.",
  "how-much-protein-in-two-eggs":
    "Two eggs occupy one quarter of a four-section breakfast plate, with the other sections still conspicuously empty.",
  "how-much-rice-and-beans-per-person-per-day":
    "A one-day pantry kit lays out measured beans, rice, one pot, and one plate with no survivalist drama.",
  "how-to-cook-frozen-vegetables-without-the-mush":
    "Frozen vegetables leap directly from bag to a hot pan while a puddle and thawing bowl are left behind.",
  "how-to-eat-cheap-at-home":
    "Beans, oats, rice, and eggs run a tiny home kitchen while takeout waits outside with an oversized cash register.",
  "how-to-freeze-fresh-vegetables-at-home":
    "Vegetables move through four clear kitchen stations: boiling pot, ice bath, drying towel, and flat freezer tray.",
  "how-to-get-more-protein-at-breakfast":
    "A plain breakfast tray gains peanut butter and two eggs like practical add-on modules, each carrying a few coins.",
  "how-to-grocery-shop-for-a-month-on-a-budget":
    "Eight pantry staples pack themselves into one small suitcase beneath a simple month calendar.",
  "how-to-meal-plan-on-a-budget":
    "Seven dinner cards form a calm weekly path from pantry shelf to shopping basket, with the total settled before checkout.",
  "how-to-save-money-on-groceries-at-walmart":
    "A plain bean bag gets red-carpet treatment in a generic blue big-box aisle while almonds wait behind the velvet rope.",
  "lentils-vs-chicken-breast-protein-cost":
    "Lentils lift chicken breast and a coin purse on a sturdy kitchen seesaw.",
  "nutritional-value-of-beans-compared":
    "Ten distinct beans gather for a pantry family portrait, each in a plain scoop with no package labels.",
  "peanut-butter-vs-almonds-protein-cost":
    "Matching portions of peanut butter and almonds stand together while the almonds drag a much longer coin chain.",
  "popcorn-vs-almonds-fiber-cost":
    "Popcorn fills several movie seats beside one small almond bag holding a very expensive ticket.",
  "tofu-vs-chicken-protein-cost":
    "An unbranded tofu block and chicken breast race down a grocery checkout belt, with chicken crossing slightly ahead.",
  "what-beans-for-red-beans-and-rice":
    "Small red beans and kidney beans audition beside one steaming rice pot while unrelated beans wait backstage.",
  "which-dried-beans-have-the-most-protein":
    "Navy, black, and pinto beans climb a pantry podium while lentils watch from a guest chair outside the bean contest.",
  "which-foods-are-complete-proteins":
    "Eggs, milk, beef, chicken, beans, and peanut butter assemble a grocery relay team with different baton handoffs.",
  "which-lentils-are-the-best":
    "Brown, red, and split lentils line up at a pantry checkout, with brown lentils carrying the lightest coin bag.",
  "whole-wheat-flour-vs-quinoa-fiber-cost":
    "Whole wheat flour arrives with a small baking crew while quinoa sits ready in one lunch bowl.",
};

function frontmatterValue(markdown, key) {
  const line = markdown
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${key}:`));
  return line?.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, "") ?? "";
}

const missing = readdirSync(articleDirectory)
  .filter((name) => name.endsWith(".md"))
  .map((name) => {
    const markdown = readFileSync(join(articleDirectory, name), "utf8");
    const imagePath = frontmatterValue(markdown, "image");
    return {
      slug: name.slice(0, -3),
      title: frontmatterValue(markdown, "title"),
      category: frontmatterValue(markdown, "category"),
      imagePath,
    };
  })
  .filter(
    ({ imagePath }) =>
      imagePath &&
      !existsSync(join(root, "public", imagePath.replace(/^\/+/, ""))),
  );

const ranked = missing.sort((a, b) => {
  const preferred = [
    "tofu-vs-chicken-protein-cost",
    "how-much-protein-in-peanut-butter",
    "best-high-fiber-foods-ranked-by-fiber-content",
  ];
  const aPreferred = preferred.indexOf(a.slug);
  const bPreferred = preferred.indexOf(b.slug);
  if (aPreferred >= 0 || bPreferred >= 0) {
    return (aPreferred < 0 ? 999 : aPreferred) - (bPreferred < 0 ? 999 : bPreferred);
  }
  if (a.slug === "how-to-meal-plan-on-a-budget") return 1;
  if (b.slug === "how-to-meal-plan-on-a-budget") return -1;
  return a.slug.localeCompare(b.slug);
});

if (ranked.length !== 57) {
  throw new Error(`Expected 57 missing heroes, found ${ranked.length}`);
}

for (const { slug } of ranked) {
  if (!concepts[slug]) throw new Error(`Missing creative concept for ${slug}`);
}

const articles = ranked.map((article, index) => {
  const isRedirect = article.slug === "how-to-meal-plan-on-a-budget";
  const isBingZeroRow = isRedirect;
  return {
    priority: index + 1,
    slug: article.slug,
    title: article.title,
    category: article.category,
    image_path: article.imagePath,
    local_file_exists: false,
    live: isRedirect
      ? {
          checked_at: "2026-07-28",
          article_status: 301,
          redirect_location:
            "https://www.daily-life-hacks.com/how-to-meal-prep-on-a-budget-for-one-person/",
          hero_status: 404,
          hero_reference_occurrences: 0,
        }
      : {
          checked_at: "2026-07-28",
          article_status: 200,
          redirect_location: null,
          hero_status: 404,
          hero_reference_occurrences: 7,
        },
    search_evidence: {
      gsc_page_export: "not_listed",
      bing_url_export: isBingZeroRow
        ? {
            status: "listed",
            impressions: 0,
            clicks: 0,
            last_crawled: "2026-04-03",
          }
        : { status: "not_listed" },
      interpretation: isBingZeroRow
        ? "The available Bing row records zero impressions and clicks. The live source URL now redirects, so image production should wait for the canonical decision."
        : "Not listed isn't the same as a measured zero. The available exports provide no page-level observation for this URL.",
    },
    brief: {
      concept: concepts[article.slug],
      art_direction:
        "Wide editorial food illustration or art-directed still life, smart and slightly dry, with orange used only as a small accent.",
      embedded_text: false,
      overlay_copy: null,
      alt_draft: concepts[article.slug],
    },
  };
});

const manifest = {
  schema_version: 2,
  cohort_id: "missing-heroes-2026-07-28",
  source_commit: "efeeefb7efbf45626f55a339230790cb4030a9f9",
  asset_spec: {
    width: 1200,
    height: 675,
    format: "jpg",
    embedded_text: false,
    overlay_copy: null,
    shared_direction:
      "One clear editorial food scene. No charts, dashboards, orange data cards, fake receipts, package labels, or generated words.",
    brand_orange_usage: "Accent only, never the background or dominant field.",
  },
  evidence: {
    checked_at: "2026-07-28",
    gsc_file: "daily-life-hacks.com-Performance-on-Search-2026-07-28.zip",
    gsc_window: "2026-04-29 through 2026-07-26",
    gsc_page_result:
      "None of the 57 URLs appears in Pages.csv. This is unavailable page-level evidence, not 57 measured zeroes.",
    bing_url_file: "daily-life-hacks.com_SiteExplorerUrls_7_26_2026.csv",
    bing_page_result:
      "One URL appears with 0 impressions and 0 clicks; 56 URLs aren't listed and therefore don't have a page-level measurement in this export.",
    live_result:
      "56 article URLs returned 200 and referenced the missing hero seven times; how-to-meal-plan-on-a-budget returned 301 to an older page. All 57 hero URLs returned 404.",
    pinterest_file: "Pinterest Analytics overview 20260619-20260719 (1).csv",
    pinterest_limit:
      "The export doesn't contain destination URLs, so it can't provide article-level evidence for this cohort.",
  },
  generation_dependency: {
    approval_required: true,
    approval_scope:
      "Generate and visually review 56 live-page heroes. Resolve the redirected meal-plan URL before producing its asset.",
    cost_usd: null,
    cost_note:
      "No image provider, paid generation call, or public mutation was used in this lane.",
  },
  articles,
};

writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${articles.length} missing-hero briefs to ${outputPath}`);
