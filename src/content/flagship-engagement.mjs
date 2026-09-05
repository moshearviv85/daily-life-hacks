/**
 * Engagement chrome for the two Bing-traction flagship studies.
 *
 * Numbers here are display values copied from the published CSVs / on-page
 * tables. tests/flagship-engagement.test.mjs checks every grams figure against
 * the matching CSV row so a later data fix cannot silently drift the callouts.
 */

export const FLAGSHIP_RANKING_ANCHOR = "full-ranking";

export const FLAGSHIP_ENGAGEMENT = {
  "protein-per-dollar-cheapest-protein-sources": {
    metric: "protein",
    csv: "public/data/protein-per-dollar-2026.csv",
    csvColumn: "protein_g_per_dollar",
    lead: {
      kicker: "The short answer",
    },
    disclosure:
      "July 2026 US grocery sample. Nutrition values from USDA FoodData Central. This is a price ranking, not a food endorsement.",
    rankingJump: {
      href: `#${FLAGSHIP_RANKING_ANCHOR}`,
      label: "See the full ranking",
    },
    highlights: [
      {
        id: "pinto-vs-bacon",
        place: "lead",
        value: "97.9 g vs 9.2 g",
        claim:
          "One dollar of dry pinto beans bought 97.9 grams of protein. One dollar of bacon bought 9.2.",
        numbers: [
          { food: "Pinto beans (dry)", grams: "97.9" },
          { food: "Bacon", grams: "9.2" },
        ],
      },
      {
        id: "drumsticks-vs-breast",
        place: "after-answer",
        value: "50.3 g after the bone",
        claim:
          "Chicken drumsticks bought 50.3 grams of protein per dollar even after subtracting the bone. Boneless chicken breast bought 24.5 at the BLS average price in this dataset.",
        numbers: [
          { food: "Chicken drumsticks (bone-in)", grams: "50.3" },
          { food: "Chicken breast (boneless, skinless)", grams: "24.5" },
        ],
      },
    ],
    shortlist: {
      label: "Category winners in this sample",
      items: [
        {
          label: "Legumes",
          food: "Pinto beans (dry)",
          grams: "97.9",
          rank: 1,
        },
        {
          label: "Meat and poultry",
          food: "Chicken drumsticks (bone-in)",
          grams: "50.3",
          rank: 11,
        },
        {
          label: "Eggs and dairy",
          food: "Eggs (large)",
          grams: "34.4",
          rank: 19,
        },
        {
          label: "Fish",
          food: "Canned tuna (chunk light, in water)",
          grams: "22.4",
          rank: 33,
        },
      ],
    },
    nextStep: {
      kicker: "Continue the study",
      title: "The same aisle won the fiber ranking",
      text: "I ran the same grocery sample on fiber. Dry split peas bought 71.0 grams of fiber per dollar. Blueberries bought 2.5. If you want both nutrients in one searchable table, open the food value database.",
      primary: {
        href: "/fiber-per-dollar-cheapest-high-fiber-foods/",
        label: "Read the fiber ranking",
      },
      secondary: {
        href: "/food-value-database/",
        label: "Search the food value database",
      },
    },
  },
  "fiber-per-dollar-cheapest-high-fiber-foods": {
    metric: "fiber",
    csv: "public/data/fiber-per-dollar-2026.csv",
    csvColumn: "fiber_g_per_dollar",
    lead: {
      kicker: "The short answer",
    },
    disclosure:
      "July 2026 US grocery sample. Nutrition values from USDA FoodData Central. This is a price ranking, not a food endorsement.",
    rankingJump: {
      href: `#${FLAGSHIP_RANKING_ANCHOR}`,
      label: "See the full ranking",
    },
    highlights: [
      {
        id: "split-peas-vs-blueberries",
        place: "lead",
        value: "71.0 g vs 2.5 g",
        claim:
          "One dollar of dry green split peas bought 71.0 grams of fiber. One dollar of blueberries bought 2.5.",
        numbers: [
          { food: "Green split peas (dry)", grams: "71.0" },
          { food: "Blueberries", grams: "2.5" },
        ],
      },
      {
        id: "flour-asterisk",
        place: "after-answer",
        value: "77.8 g if you bake",
        claim:
          "Whole wheat flour sits at 77.8 grams of fiber per dollar. That only counts if you bake with it. Dry green split peas, at 71.0, are the number you can put in a pot tonight.",
        numbers: [
          { food: "Whole wheat flour", grams: "77.8" },
          { food: "Green split peas (dry)", grams: "71.0" },
        ],
      },
    ],
    shortlist: {
      label: "Start with a category",
      items: [
        {
          label: "Best ingredient",
          food: "Whole wheat flour",
          grams: "77.8",
          rank: 1,
        },
        {
          label: "Cook and eat as-is",
          food: "Green split peas (dry)",
          grams: "71.0",
          rank: 2,
        },
        {
          label: "Best canned",
          food: "Canned black beans",
          grams: "34.4",
          rank: 10,
        },
        {
          label: "Best fresh fruit",
          food: "Bananas",
          grams: "11.6",
          rank: 29,
        },
      ],
    },
    nextStep: {
      kicker: "Continue the study",
      title: "Protein did the same thing",
      text: "The follow-up spreadsheet ranked 49 foods by protein per dollar. Dry pinto beans bought 97.9 grams. Bacon bought 9.2. The food value database lets you search both rankings without opening two tabs.",
      primary: {
        href: "/protein-per-dollar-cheapest-protein-sources/",
        label: "Read the protein ranking",
      },
      secondary: {
        href: "/food-value-database/",
        label: "Search the food value database",
      },
    },
  },
};

export function getFlagshipEngagement(slug) {
  return FLAGSHIP_ENGAGEMENT[slug] ?? null;
}

export function flagshipHighlightNumbers(config) {
  return (config?.highlights ?? []).flatMap((highlight) => highlight.numbers);
}
