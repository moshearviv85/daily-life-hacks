/**
 * Visible signup copy. The early form uses earlyPitch (one line). The end
 * form uses pitch. Headings stay the same so both forms promise one file.
 */

export const SIGNUP_OFFERS = {
  fiber: {
    badge: "Free Meal Plan",
    heading: "Get the Free 7-Day High-Fiber Meal Plan",
    pitch:
      "A printable week of meals that keep you full, with a grocery list included. Subscribe and it's yours, plus our best recipes and kitchen tips every week.",
    earlyPitch:
      "A printable week of high-fiber meals, grocery list included, plus one email a week.",
    buttonLabel: "Send Me the Meal Plan",
    successText: "Hang on one second, your meal plan is on the next page.",
    downloadHref: "/downloads/7-day-high-fiber-meal-plan.pdf",
    downloadName: "7-day-high-fiber-meal-plan.pdf",
  },
  sourdough: {
    badge: "Free Cheat Sheet",
    heading: "Get the Sourdough Discard Grams Cheat Sheet",
    pitch:
      "One printable page for the sticky cup. A stirred cup of 100% hydration discard is 227 grams, and half a cup is 113. The sheet also splits that weight into the flour and water already in the jar. Subscribe and it's yours, plus one email a week.",
    earlyPitch:
      "A stirred cup of 100% hydration discard is 227 grams. The one-page sheet is yours, plus one email a week.",
    buttonLabel: "Send Me the Cheat Sheet",
    successText: "Hang on one second. The gram cheat sheet is on the next page.",
    downloadHref: "/printables/sourdough-discard-grams-cheat-sheet/",
    downloadName: "",
  },
  beans: {
    badge: "Free Card",
    heading: "Get the Bean Conversion Card",
    pitch:
      "One printable page for the swap you actually make. One pound dried cooks to about 6 cups, which is 3½ to 4 cans. A 15-ounce can is about 1½ cups drained. Subscribe and it's yours, plus one email a week.",
    earlyPitch:
      "One pound dried cooks to about 6 cups, or 3½ to 4 cans. The card is yours, plus one email a week.",
    buttonLabel: "Send Me the Card",
    successText: "Hang on one second. The conversion card is on the next page.",
    downloadHref: "/printables/bean-conversion-card/",
    downloadName: "",
  },
  oils: {
    badge: "Free Chart",
    heading: "Get the Smoke Point Chart",
    pitch:
      "The same 22 lab readings from the cooking-oil page, on one sheet. Palm at 489°F, coconut at 385°F, olive from 347°F to 464°F, with the lab next to each row. Subscribe and it's yours, plus one email a week.",
    earlyPitch:
      "The same 22 lab readings from this page, on one sheet, plus one email a week.",
    buttonLabel: "Send Me the Chart",
    successText: "Hang on one second. The smoke point chart is on the next page.",
    downloadHref: "/downloads/smoke-point-chart.pdf",
    downloadName: "smoke-point-chart.pdf",
    printableHref: "/printables/smoke-point-chart/",
  },
  storage: {
    badge: "Free Card",
    heading: "Get the Fridge Life Card",
    pitch:
      "One card for the jar and the lunch bag. Vinaigrette up to 2 weeks, creamy dressing 3 to 4 days, leftovers 3 to 4 days, and the 2-hour rule. Subscribe and it's yours, plus one email a week.",
    earlyPitch:
      "Dressing, leftovers, and the 2-hour rule, on one card, plus one email a week.",
    buttonLabel: "Send Me the Card",
    successText: "Hang on one second. The fridge life card is on the next page.",
    downloadHref: "/downloads/fridge-life-card.pdf",
    downloadName: "fridge-life-card.pdf",
    printableHref: "/printables/fridge-life-card/",
  },
  budget: {
    badge: "Free Meal Plan",
    heading: "Get the $60 Week Meal Plan",
    pitch:
      "The $60 week meal plan PDF already on the site: a tight grocery week you can print. Subscribe and it's yours, plus one email a week.",
    earlyPitch: "The $60 week meal plan PDF, plus one email a week.",
    buttonLabel: "Send Me the Meal Plan",
    successText: "Hang on one second. The $60 week plan is on the next page.",
    downloadHref: "/downloads/60-dollar-week-meal-plan.pdf",
    downloadName: "60-dollar-week-meal-plan.pdf",
  },
  generic: {
    badge: "Free Newsletter",
    heading: "Get Weekly Nutrition, Recipes & Life Hacks",
    pitch:
      "Get our best healthy recipes, nutrition advice, and practical life hacks delivered to your inbox every week.",
    earlyPitch: "",
    buttonLabel: "Subscribe Free",
    successText: "You're in. One second.",
    downloadHref: "",
    downloadName: "",
  },
};

export const EARLY_SECTION_STYLE =
  "margin:1.25rem 0;padding:0.85rem 1rem;border-radius:12px;background-color:var(--newsletter-bg);border:1px solid var(--newsletter-border);";

export const EARLY_HEADING_STYLE =
  "margin:0 0 0.35rem;padding:0;font-size:1.15rem;line-height:1.3;font-weight:700;color:var(--heading-color);";

export const EARLY_PITCH_STYLE =
  "margin:0 0 0.75rem;font-size:0.95rem;line-height:1.45;color:var(--muted-color);";

export const EARLY_INPUT_STYLE =
  "width:100%;box-sizing:border-box;padding:0.7rem 0.85rem;border-radius:10px;font-size:1rem;color:var(--text-color);background-color:var(--input-bg);border:1px solid var(--border-color);";

export const EARLY_BUTTON_STYLE =
  "width:100%;padding:0.7rem 1rem;border:0;border-radius:10px;font-weight:700;font-size:1rem;color:#fff;background-color:#F29B30;cursor:pointer;";

export const SR_ONLY_STYLE =
  "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
