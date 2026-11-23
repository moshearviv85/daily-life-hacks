/**
 * Lead-magnet figures copied from pages already on the site.
 * Every `text` value must appear verbatim in `file`. Tests enforce that,
 * then check the same strings survive into the PDF.
 */

export const SMOKE_POINT_FILE = "src/data/articles/cooking-oils-smoke-points-best-uses.md";
export const SMOKE_POINT_PATH = "/cooking-oils-smoke-points-best-uses/";

/** The page's first table, including the two rows the US labs don't list. */
export const SMOKE_POINT_ROWS = [
  ["Palm (refined, deodorized)", "489°F", "ISEO"],
  ["Sunflower, high-oleic (refined, deodorized)", "471°F", "ISEO; FSIS sunflower 410°F"],
  ["Soybean, aka vegetable oil (refined, deodorized)", "464°F", "ISEO; FSIS groups 450°F"],
  ["Lard (refined, deodorized)", "464°F", "ISEO"],
  ["Canola, high-oleic (refined, deodorized)", "464°F", "ISEO"],
  ["Soybean, low-linolenic (refined, deodorized)", "458°F", "ISEO"],
  ["Canola (refined, deodorized)", "457°F", "ISEO; FSIS 435°F"],
  ["Corn (refined, deodorized)", "455°F", "ISEO; FSIS groups 410°F"],
  ["Cottonseed (refined, deodorized)", "450°F", "ISEO"],
  ["Safflower (refinement not stated)", "450°F", "FSIS grouped: peanut/safflower/soybean"],
  ["Peanut (refined, deodorized)", "446°F", "ISEO; FSIS groups 450°F"],
  ["Tallow (refined, deodorized)", "446°F", "ISEO"],
  ["Palm olein, IV-57 (refined, deodorized)", "446°F", "ISEO"],
  ["Palm hard fraction, IV-35 (refined, deodorized)", "446°F", "ISEO"],
  ["Soybean, hydrogenated to IV 70 (refined, deodorized)", "446°F", "ISEO"],
  ["Grapeseed (refinement not stated)", "445°F", "FSIS"],
  ["Rice bran (refined, deodorized)", "444°F", "ISEO"],
  ["Rice bran, high-oryzanol (refined, deodorized)", "432°F", "ISEO"],
  ["Sunflower, mid-oleic (refined, deodorized)", "412°F", "ISEO; FSIS sunflower 410°F"],
  ["Sesame (refinement not stated)", "410°F", "FSIS grouped: corn/olive/sesame/sunflower"],
  ["Coconut (refined, deodorized)", "385°F", "ISEO"],
  ["Olive, all grades (unrefined to refined)", "347°F to 464°F", "UC Davis; FSIS olive 410°F"],
  ["Avocado", "Not listed", "Not in ISEO or FSIS"],
  ["Butter", "Not listed", "Not in ISEO or FSIS"],
].map(([oil, point, source]) => ({ oil, point, source }));

export const SMOKE_POINT_NOTES = [
  "AOCS Method Cc 9a-48",
  "0.05% free fatty acids",
  "Table VIII, page 21",
  "USDA FSIS publishes a shorter deep-frying list",
  "228°F for sunflower",
  "287°F for peanut",
];

export const FRIDGE_LIFE_SECTIONS = [
  {
    title: "Homemade dressing",
    path: "/how-to-store-homemade-salad-dressing-safely/",
    file: "src/data/articles/how-to-store-homemade-salad-dressing-safely.md",
    rows: [
      ["Vinaigrette (oil, vinegar, dried herbs and spices)", "Up to 2 weeks"],
      ["With fresh garlic or herbs", "Up to 1 week"],
      ["Dairy or buttermilk", "3 to 4 days"],
      ["Mayo-based", "3 to 4 days"],
      ["With raw egg", "Same day, or use pasteurized eggs"],
      ["Store-bought, opened", "1 to 3 months"],
    ],
    notes: ["use it within 4 days", "within 2 hours", "40°F or below"],
  },
  {
    title: "Sandwich timeline",
    path: "/how-to-keep-sandwiches-from-getting-soggy/",
    file: "src/data/articles/how-to-keep-sandwiches-from-getting-soggy.md",
    rows: [],
    notes: [
      "five and a half hours",
      "7:00 AM to 12:30 PM",
      "more than 2 hours, or 1 hour above 90 degrees F",
      "don't freeze sandwiches containing mayonnaise, lettuce, or tomatoes",
    ],
  },
  {
    title: "Leftovers",
    path: "/how-long-do-leftovers-last-in-the-fridge/",
    file: "src/data/articles/how-long-do-leftovers-last-in-the-fridge.md",
    rows: [
      ["Cooked meat or poultry", "3 to 4 days"],
      ["Soups and stews", "3 to 4 days"],
      ["Pizza", "3 to 4 days"],
      ["Chicken nuggets or patties", "3 to 4 days"],
      ["Egg, chicken, tuna, ham, macaroni salads", "3 to 4 days"],
      ["Cooked rice and pasta", "3 to 4 days"],
    ],
    notes: ["within 2 hours", "one hour if the room is above 90F", "40F or below"],
  },
  {
    title: "Berries",
    path: "/keep-berries-fresh-longer-when-to-wash/",
    file: "src/data/articles/keep-berries-fresh-longer-when-to-wash.md",
    rows: [],
    notes: [
      "Wash berries right before you eat them",
      "2 to 5 days",
      "1 to 2 weeks",
      "32°F",
      "40°F or below",
    ],
  },
  {
    title: "Herbs",
    path: "/how-to-store-fresh-herbs-to-last-longer/",
    file: "src/data/articles/how-to-store-fresh-herbs-to-last-longer.md",
    rows: [],
    notes: [
      "7 to 10 days",
      "Basil hates the cold",
      "40°F or below",
    ],
  },
  {
    title: "Avocado",
    path: "/best-way-to-store-avocados-to-stop-browning/",
    file: "src/data/articles/best-way-to-store-avocados-to-stop-browning.md",
    rows: [],
    notes: [
      "room temperature until ripe",
      "3 to 4 days in the refrigerator",
      "40°F or below",
    ],
  },
];

export function smokePointFacts() {
  const facts = [];
  for (const row of SMOKE_POINT_ROWS) {
    for (const text of [row.oil, row.point, row.source]) {
      facts.push({ file: SMOKE_POINT_FILE, text });
    }
  }
  for (const text of SMOKE_POINT_NOTES) {
    facts.push({ file: SMOKE_POINT_FILE, text });
  }
  return facts;
}

export function fridgeLifeFacts() {
  const facts = [];
  for (const section of FRIDGE_LIFE_SECTIONS) {
    for (const [label, value] of section.rows) {
      facts.push({ file: section.file, text: label });
      facts.push({ file: section.file, text: value });
    }
    for (const text of section.notes) {
      facts.push({ file: section.file, text });
    }
  }
  return facts;
}
