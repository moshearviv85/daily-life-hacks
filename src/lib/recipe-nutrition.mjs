/**
 * Per-serving nutrition from recipe gram weights and a FoodData Central cache.
 * Volume and count measures use the food's own FDC portion rows.
 * Ounces and pounds stated in the ingredient line use that food's ounce
 * portion when it has one, otherwise the avoirdupois definition.
 */

import { FOOD_RULES, lineExemption } from "./recipe-fdc-rules.mjs";

export const CALORIE_TOLERANCE = 0.15;
const OZ_G = 28.349523125;
const LB_G = 453.59237;

const FRAC = {
  "½": 1 / 2,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
  "⅕": 1 / 5,
  "⅖": 2 / 5,
  "⅗": 3 / 5,
  "⅘": 4 / 5,
};

const UNIT_ALIASES = [
  ["tablespoon", /^(tablespoons?|tbsp|tbs)\b/i],
  ["teaspoon", /^(teaspoons?|tsp)\b/i],
  ["cup", /^cups?\b/i],
  ["pound", /^(pounds?|lbs?)\b/i],
  ["ounce", /^(ounces?|oz)\b/i],
  ["gram", /^(grams?|g)\b/i],
  ["kilogram", /^(kilograms?|kg)\b/i],
  ["milliliter", /^(milliliters?|ml)\b/i],
  ["clove", /^cloves?\b/i],
  ["can", /^cans?\b/i],
  ["slice", /^slices?\b/i],
  ["stalk", /^stalks?\b/i],
  ["sprig", /^sprigs?\b/i],
  ["bunch", /^bunches?\b/i],
  ["head", /^heads?\b/i],
  ["fillet", /^fillets?\b/i],
  ["pint", /^pints?\b/i],
  ["pinch", /^pinches?\b/i],
  ["dash", /^dashes?\b/i],
  ["large", /^large\b/i],
  ["medium", /^medium\b/i],
  ["small", /^small\b/i],
];

const PREP_WORDS = [
  "chopped", "diced", "sliced", "minced", "grated", "shredded", "packed",
  "ground", "cubed", "cubes", "florets", "drained", "rinsed", "crumbled",
  "melted", "whole", "mashed", "pureed", "julienne",
];

function round1(value) {
  return Math.round(value * 10) / 10;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

export function roundNutrition(raw) {
  return {
    kcal: Math.round(raw.kcal),
    protein: round1(raw.protein),
    fiber: round1(raw.fiber),
    sodium: Math.round(raw.sodium),
    sugar: round1(raw.sugar),
  };
}

export function calorieGap(stated, computed) {
  if (!Number.isFinite(stated) || !Number.isFinite(computed)) return null;
  if (computed === 0) return stated === 0 ? 0 : Infinity;
  return Math.abs(stated - computed) / computed;
}

export function caloriesWithinTolerance(stated, computed) {
  const gap = calorieGap(stated, computed);
  return gap !== null && gap <= CALORIE_TOLERANCE;
}

function parseNumberToken(source) {
  const text = source.trim();
  let match = text.match(/^(\d+)\s*([½⅓⅔¼¾⅛⅜⅝⅞⅕⅖⅗⅘])(?=\s|$)/);
  if (match) {
    return { qty: Number(match[1]) + FRAC[match[2]], rest: text.slice(match[0].length).trim() };
  }
  match = text.match(/^([½⅓⅔¼¾⅛⅜⅝⅞⅕⅖⅗⅘])(?=\s|$)/);
  if (match) {
    return { qty: FRAC[match[1]], rest: text.slice(match[0].length).trim() };
  }
  match = text.match(/^(\d+)\s+(\d+)\/(\d+)\b/);
  if (match) {
    return {
      qty: Number(match[1]) + Number(match[2]) / Number(match[3]),
      rest: text.slice(match[0].length).trim(),
    };
  }
  match = text.match(/^(\d+)\/(\d+)\b/);
  if (match) {
    return { qty: Number(match[1]) / Number(match[2]), rest: text.slice(match[0].length).trim() };
  }
  match = text.match(/^(\d+(?:\.\d+)?)\b/);
  if (match) {
    return { qty: Number(match[1]), rest: text.slice(match[0].length).trim() };
  }
  return null;
}

function readUnit(rest) {
  for (const [unit, pattern] of UNIT_ALIASES) {
    const match = rest.match(pattern);
    if (match) return { unit, rest: rest.slice(match[0].length).trim() };
  }
  return { unit: "", rest };
}

/**
 * @returns {{
 *   raw: string,
 *   qty: number | null,
 *   unit: string,
 *   name: string,
 *   range: boolean,
 *   each: boolean,
 * }}
 */
export function parseIngredientLine(rawLine) {
  const raw = String(rawLine || "").trim().replace(/^['"]|['"]$/g, "");
  const normalized = raw.replace(/[–—]/g, "-");
  let range = false;
  let qty = null;
  let rest = normalized;

  let match = normalized.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s+/);
  if (!match) match = normalized.match(/^(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+/i);
  if (match) {
    range = true;
    qty = (Number(match[1]) + Number(match[2])) / 2;
    rest = normalized.slice(match[0].length).trim();
  } else {
    const about = normalized.match(/^about\s+(\d+(?:\.\d+)?)\s+/i);
    if (about) {
      qty = Number(about[1]);
      rest = normalized.slice(about[0].length).trim();
    } else {
      const parsed = parseNumberToken(normalized);
      if (parsed) {
        qty = parsed.qty;
        rest = parsed.rest;
      }
    }
  }

  const canLabel = rest.match(/^\(([^)]+)\)\s+(cans?|jars?|packages?|blocks?)\b\s*(.*)$/i);
  if (canLabel && qty != null) {
    return {
      raw,
      qty,
      unit: canLabel[2].toLowerCase().replace(/s$/, ""),
      name: `${canLabel[1]} ${canLabel[3]}`.trim(),
      range,
      each: /\beach\b/i.test(raw),
    };
  }

  const { unit, rest: name } = readUnit(rest);
  return { raw, qty, unit, name, range, each: /\beach\b/i.test(raw) };
}

function statedWeight(raw, qty) {
  const text = raw.replace(/[–—]/g, "-");
  const drained = /\b(drained|rinsed)\b/i.test(text);
  if (/\b(cans?|jars?)\b/i.test(text) && drained) return null;
  const range = text.match(/\(\s*(?:about\s+)?(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(oz|ounces?|lb|lbs|pounds?)\b([^)]*)\)/i);
  if (range) {
    const mid = (Number(range[1]) + Number(range[2])) / 2;
    const each = /\beach\b/i.test(range[4])
      || /\beach\b/i.test(text)
      || (qty > 1 && /\b(fillets?|chops?|breasts?|thighs?|steaks?|racks?)\b/i.test(text));
    const gramsEach = /oz|ounce/i.test(range[3]) ? mid * OZ_G : mid * LB_G;
    return {
      grams: gramsEach * (each ? qty || 1 : 1),
      basis: `stated ${mid} ${range[3]}${each ? " each" : ""}`,
    };
  }
  const single = text.match(/\(\s*(?:about\s+)?(\d+(?:\.\d+)?)\s*(oz|ounces?|lb|lbs|pounds?|g|grams?)\b([^)]*)\)/i);
  if (single) {
    const amount = Number(single[1]);
    const unit = single[2];
    const each = /\beach\b/i.test(single[3])
      || /\beach\b/i.test(text)
      || (qty > 1 && /\b(fillets?|chops?|breasts?|thighs?|steaks?|racks?)\b/i.test(text));
    let gramsEach = amount;
    if (/oz|ounce/i.test(unit)) gramsEach = amount * OZ_G;
    else if (/lb|pound/i.test(unit)) gramsEach = amount * LB_G;
    return {
      grams: gramsEach * (each ? qty || 1 : 1),
      basis: `stated ${amount} ${unit}${each ? " each" : ""}`,
    };
  }
  return null;
}

function statedCups(raw) {
  const match = raw.match(/\(\s*about\s+(\d+(?:\.\d+)?)\s+cups?\b/i);
  if (!match) return null;
  return Number(match[1]);
}

function prepHints(text) {
  const lower = text.toLowerCase();
  return PREP_WORDS.filter((word) => lower.includes(word));
}

function modifierHasUnit(modifier, unit) {
  const mod = modifier.toLowerCase();
  if (unit === "cup") return /\bcups?\b/.test(mod);
  if (unit === "tablespoon") return /\b(tbsp|tbs|tablespoons?)\b/.test(mod);
  if (unit === "teaspoon") return /\b(tsp|teaspoons?)\b/.test(mod) && !/\b(tbsp|tablespoons?)\b/.test(mod);
  if (unit === "ounce") return /\boz\b/.test(mod) && !/\bfl oz\b/.test(mod);
  if (unit === "pound") return /\blb\b/.test(mod);
  if (unit === "clove") return /\bcloves?\b/.test(mod);
  if (unit === "can") return /\bcans?\b/.test(mod);
  if (unit === "slice") return /\bslices?\b/.test(mod);
  if (unit === "stalk") return /\bstalks?\b/.test(mod);
  if (unit === "head") return /\bheads?\b/.test(mod);
  if (unit === "fillet") return /\bfillets?\b/.test(mod);
  if (unit === "sprig") return /\bsprigs?\b/.test(mod);
  if (unit === "bunch") return /\bbunch(?:es)?\b/.test(mod);
  if (unit === "spear") return /\bspears?\b/.test(mod);
  if (unit === "large" || unit === "medium" || unit === "small") {
    if (/\b(slice|strip|wedge|ring)\b/.test(mod)) return false;
    return new RegExp(`^${unit}\\b`).test(mod)
      || new RegExp(`\\b(?:potato|sweetpotato|fruit|artichoke|head|leaf)\\b\\W+${unit}\\b`).test(mod);
  }
  if (unit === "pinch") return /\bpinch\b/.test(mod);
  if (unit === "dash") return /\bdash\b/.test(mod);
  if (unit === "piece") {
    return /\b(piece|whole|fruit|avocado|bagel|tortilla|leaf|artichoke|cucumber|leek)\b/.test(mod)
      && !/\b(slice|wedge|ring|strip)\b/.test(mod);
  }
  if (unit === "lemon yields") return /lemon yields/.test(mod);
  if (unit === "lime yields") return /lime yields/.test(mod);
  if (unit === "fluid ounce") return /\bfl oz\b/.test(mod);
  return false;
}

const PREP_SYNONYMS = {
  minced: ["chopped"],
  diced: ["chopped"],
  finely: ["chopped"],
};

function hintWords(text) {
  const hints = new Set(prepHints(text));
  for (const hint of [...hints]) {
    for (const extra of PREP_SYNONYMS[hint] || []) hints.add(extra);
  }
  return hints;
}

function wordIn(modifier, word) {
  return new RegExp(`\\b${word}\\b`, "i").test(modifier);
}

function scorePortion(portion, unit, hints, text) {
  if (!modifierHasUnit(portion.modifier, unit)) return -1;
  const mod = portion.modifier.toLowerCase();
  let score = 10;
  const modPreps = PREP_WORDS.filter((word) => wordIn(mod, word));
  for (const hint of hints) {
    if (wordIn(mod, hint)) score += 8;
  }
  for (const extra of modPreps) {
    if (!hints.has(extra)) score -= 5;
  }
  if (/\bwhipped\b/.test(mod) && !hints.has("whipped")) score -= 8;
  if (/\bfluid\b/.test(mod)) score += 3;
  if (/\bpacked\b/.test(mod) && !/\bnot packed\b/.test(mod) && !hints.has("packed")) score -= 8;
  if (/\bnot packed\b/.test(mod) && !hints.has("packed")) score += 4;
  if (/\bpacked\b/.test(mod) && hints.has("packed") && !/\bnot packed\b/.test(mod)) score += 6;
  if (/\bwhole\b/.test(mod) && !hints.has("whole")) score -= 6;
  if (/\bground\b/.test(mod) && !hints.has("whole")) score += 3;
  if (/\blarge\b/i.test(text) && /\blarge\b/i.test(mod)) score += 8;
  if (/\bmedium\b/i.test(text) && /\bmedium\b/i.test(mod)) score += 8;
  if (/\bsmall\b/i.test(text) && /\bsmall\b/i.test(mod)) score += 8;
  return score;
}

export function matchPortion(food, unit, text) {
  const hints = hintWords(text);
  const ranked = [];
  for (const portion of food.portions || []) {
    const amount = Number(portion.amount);
    const grams = Number(portion.grams);
    if (!amount || !grams) continue;
    const score = scorePortion(portion, unit, hints, text);
    if (score < 0) continue;
    ranked.push({
      score,
      per: grams / amount,
      modifier: portion.modifier,
      amount,
      grams,
    });
  }
  if (!ranked.length) return null;
  ranked.sort((a, b) => b.score - a.score || a.modifier.length - b.modifier.length);
  const best = ranked[0];
  const tied = ranked.filter((row) => row.score === best.score);
  const rates = tied.map((row) => row.per);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  if (min > 0 && (max - min) / min > 0.1) {
    const nlea = (food.portions || []).find((portion) => /nlea/i.test(portion.modifier || ""));
    const asPortion = (row, basisNote) => ({
      gramsPerUnit: row.per,
      modifier: row.modifier,
      amount: row.amount,
      grams: row.grams,
      ...(basisNote ? { basisNote } : {}),
    });
    if (nlea && Number(nlea.amount) > 0) {
      const nleaPer = Number(nlea.grams) / Number(nlea.amount);
      const aligned = tied.find((row) => Math.abs(row.per - nleaPer) < 0.6);
      if (aligned) return asPortion(aligned, "FDC portion matching the NLEA serving");
    }
    const medium = tied.find((row) => /\bmedium\b/i.test(row.modifier));
    const askedSize = /\b(large|medium|small)\b/i.test(text);
    if (medium && !askedSize) {
      return asPortion(medium, "size not stated; FDC medium");
    }
    return {
      ambiguous: true,
      options: tied.map((row) => `${row.modifier} = ${row.grams} g`),
    };
  }
  return { gramsPerUnit: best.per, modifier: best.modifier, amount: best.amount, grams: best.grams };
}

const SPOONS = {
  teaspoon: 1,
  tablespoon: 3,
  "fluid ounce": 6,
  cup: 48,
  pint: 96,
};

function volumePortion(food, unit, text) {
  const direct = matchPortion(food, unit, text);
  if (direct && !direct.ambiguous) return direct;
  if (direct?.ambiguous) return direct;
  if (!SPOONS[unit]) return null;
  const anchors = [];
  for (const name of Object.keys(SPOONS)) {
    if (name === unit) continue;
    const portion = matchPortion(food, name, text);
    if (portion && !portion.ambiguous) anchors.push({ name, portion });
  }
  if (!anchors.length) return null;
  anchors.sort((a, b) => Math.abs(SPOONS[a.name] - SPOONS[unit]) - Math.abs(SPOONS[b.name] - SPOONS[unit]));
  const anchor = anchors[0];
  return {
    gramsPerUnit: anchor.portion.gramsPerUnit * (SPOONS[unit] / SPOONS[anchor.name]),
    modifier: anchor.portion.modifier,
    amount: anchor.portion.amount,
    grams: anchor.portion.grams,
    convertedFrom: anchor.name,
  };
}

function findFood(line, foodsByDescription) {
  const candidates = [];
  for (const rule of FOOD_RULES) {
    if (rule.reject && rule.reject.test(line)) continue;
    if (rule.require && !rule.require.test(line)) continue;
    const match = line.match(rule.match);
    if (!match) continue;
    const food = foodsByDescription.get(rule.description);
    if (!food) continue;
    candidates.push({ food, index: match.index, description: rule.description });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.index - b.index);
  return candidates[0];
}

function smallSpice(parsed) {
  if (parsed.unit === "pinch" || parsed.unit === "dash") return true;
  if (parsed.unit === "teaspoon" && parsed.qty != null && parsed.qty <= 2) return true;
  if (parsed.unit === "tablespoon" && parsed.qty != null && parsed.qty <= 1) return true;
  return false;
}

const SPICE_LINE = /paprika|cumin|cinnamon|oregano|pepper|cayenne|garlic powder|onion powder|thyme|rosemary|turmeric|curry|nutmeg|bay leaf|parsley|dill|chili powder|seasoning|mustard seed|coriander|allspice|clove|cardamom|sumac|garam|sriracha|hot sauce/i;

function weightFromUnit(food, parsed) {
  if (parsed.unit === "gram") {
    return { grams: parsed.qty, basis: "stated grams" };
  }
  if (parsed.unit === "kilogram") {
    return { grams: parsed.qty * 1000, basis: "stated kilograms" };
  }
  if (parsed.unit !== "ounce" && parsed.unit !== "pound") return null;
  const ounce = matchPortion(food, "ounce", parsed.raw);
  const pound = matchPortion(food, "pound", parsed.raw);
  if (parsed.unit === "pound" && pound && !pound.ambiguous) {
    return {
      grams: parsed.qty * pound.gramsPerUnit,
      basis: `FDC ${pound.modifier} = ${pound.grams} g`,
    };
  }
  if (parsed.unit === "ounce" && ounce && !ounce.ambiguous) {
    return {
      grams: parsed.qty * ounce.gramsPerUnit,
      basis: `FDC ${ounce.amount} ${ounce.modifier} = ${ounce.grams} g`,
    };
  }
  if (parsed.unit === "pound" && ounce && !ounce.ambiguous) {
    return {
      grams: parsed.qty * 16 * ounce.gramsPerUnit,
      basis: `FDC ounce portion scaled to pounds (${ounce.grams} g / ${ounce.amount} oz)`,
    };
  }
  if (parsed.unit === "ounce") {
    return { grams: parsed.qty * OZ_G, basis: "avoirdupois ounce, 28.349523125 g" };
  }
  return { grams: parsed.qty * LB_G, basis: "avoirdupois pound, 453.59237 g" };
}

function countUnit(parsed) {
  if (parsed.unit) return parsed.unit;
  if (/tortilla/i.test(parsed.raw)) return "piece";
  if (/bagel/i.test(parsed.raw)) return "piece";
  if (/\b(lemon|lime|pear|apple|avocado|artichoke|pepper|potato|cucumber|leek)s?\b/i.test(parsed.name)) return "piece";
  return "piece";
}

function nutrientsFor(food, grams) {
  const per = food.nutrientsPer100g || {};
  const factor = grams / 100;
  return {
    kcal: (per.kcal ?? 0) * factor,
    protein: (per.protein ?? 0) * factor,
    fiber: (per.fiber ?? 0) * factor,
    sodium: (per.sodium ?? 0) * factor,
    sugar: (per.sugar ?? 0) * factor,
  };
}

function discardFlour(parsed, foodsByDescription) {
  if (!/sourdough/i.test(parsed.raw) || !/discard|starter/i.test(parsed.raw)) return null;
  if (/gluten[-\s]?free/i.test(parsed.raw)) return { unmapped: "gluten-free discard has no FDC food" };
  if (!/100%\s*hydration/i.test(parsed.raw)) return { unmapped: "hydration not stated on the discard line" };
  const stated = statedWeight(parsed.raw, parsed.qty);
  const grams = stated?.grams ?? (parsed.unit === "gram" ? parsed.qty : null);
  if (!grams) return { unmapped: "discard line has no gram weight" };
  const flour = foodsByDescription.get("Wheat flour, white, all-purpose, enriched, bleached");
  if (!flour) return { unmapped: "all-purpose flour missing from cache" };
  const flourGrams = grams / 2;
  return {
    row: {
      item: parsed.raw,
      grams: round2(flourGrams),
      fdcId: flour.fdcId,
      basis: "100% hydration discard: half the stated grams as all-purpose flour; water half left out",
      ...nutrientsFor(flour, flourGrams),
    },
  };
}

/**
 * @returns {{ rows: object[], omitted: {item: string, reason: string}[], unmapped: {item: string, reason: string}[] }}
 */
export function resolveRecipeLines(ingredients, foodsByDescription) {
  const rows = [];
  const omitted = [];
  const unmapped = [];

  for (const ingredient of ingredients || []) {
    const exempt = lineExemption(ingredient);
    if (exempt) {
      omitted.push({ item: ingredient, reason: exempt });
      continue;
    }
    const parsed = parseIngredientLine(ingredient);
    if (/^water\b|^warm water\b|^boiling water\b|^cold water\b|^hot water\b|^ice water\b/i.test(parsed.name) || /^water\b/i.test(parsed.raw)) {
      omitted.push({ item: ingredient, reason: "water" });
      continue;
    }
    if (/\b(kosher salt|sea salt|flaky salt|coarse salt|coarse sea salt)\b/i.test(parsed.raw) && parsed.unit !== "gram") {
      omitted.push({ item: ingredient, reason: "salt form has no FDC teaspoon weight" });
      continue;
    }

    const discard = discardFlour(parsed, foodsByDescription);
    if (discard?.row) {
      rows.push(discard.row);
      continue;
    }
    if (discard?.unmapped) {
      unmapped.push({ item: ingredient, reason: discard.unmapped });
      continue;
    }

    let unit = parsed.unit;
    let qty = parsed.qty;
    if (/juice of\s+(\d+)\s+lemons?/i.test(parsed.raw) || /lemons?,?\s+juiced/i.test(parsed.raw)) {
      const count = parsed.raw.match(/(\d+)/);
      qty = count ? Number(count[1]) : 1;
      unit = "lemon yields";
    } else if (/juice of\s+(\d+)\s+limes?/i.test(parsed.raw) || /limes?,?\s+juiced/i.test(parsed.raw)) {
      const count = parsed.raw.match(/(\d+)/);
      qty = count ? Number(count[1]) : 1;
      unit = "lime yields";
    }

    const found = findFood(parsed.raw, foodsByDescription);
    if (found && /\b(bone-in|racks?)\b/i.test(parsed.raw) && /separable lean|meat only/i.test(found.description)) {
      unmapped.push({
        item: ingredient,
        reason: "bone-in or rack weight is not the edible weight on this FDC cut",
      });
      continue;
    }
    if (!found || qty == null) {
      if (SPICE_LINE.test(parsed.raw) && smallSpice(parsed)) {
        omitted.push({ item: ingredient, reason: "spice without a matching FDC measure" });
        continue;
      }
      unmapped.push({
        item: ingredient,
        reason: qty == null ? "quantity not parsed" : "no FDC food matched the line",
      });
      continue;
    }

    if (!unit) {
      const embedded = parsed.name.match(/\b(stalks?|cloves?|heads?|bunches?|spears?|sprigs?)\b/i);
      if (embedded) {
        const word = embedded[1].toLowerCase();
        unit = {
          stalk: "stalk",
          stalks: "stalk",
          clove: "clove",
          cloves: "clove",
          head: "head",
          heads: "head",
          bunch: "bunch",
          bunches: "bunch",
          spear: "spear",
          spears: "spear",
          sprig: "sprig",
          sprigs: "sprig",
        }[word];
      }
    }
    if ((unit === "large" || unit === "medium" || unit === "small") && /\b(heads?|stalks?|spears?)\b/i.test(parsed.name)) {
      const word = parsed.name.match(/\b(heads?|stalks?|spears?)\b/i)[1].toLowerCase();
      unit = word.startsWith("head") ? "head" : word.startsWith("stalk") ? "stalk" : "spear";
    }
    if ((unit === "large" || unit === "medium" || unit === "small") && /\bcloves?\b/i.test(parsed.name)) {
      unit = "clove";
    }

    const cupsNoted = statedCups(parsed.raw);
    const stated = statedWeight(parsed.raw, qty);
    let measured = null;
    if (cupsNoted) {
      const cup = volumePortion(found.food, "cup", parsed.raw);
      if (cup && !cup.ambiguous) {
        measured = {
          grams: cupsNoted * cup.gramsPerUnit,
          basis: `stated about ${cupsNoted} cup; FDC ${cup.modifier} = ${cup.grams} g`,
        };
      }
    }
    if (!measured && stated && unit !== "can" && unit !== "jar") {
      measured = stated;
    } else if (!measured && (unit === "can" || unit === "jar") && stated && !/\b(drained|rinsed)\b/i.test(parsed.raw)) {
      measured = stated;
    } else if (!measured && (unit === "gram" || unit === "kilogram" || unit === "ounce" || unit === "pound")) {
      measured = weightFromUnit(found.food, { ...parsed, qty, unit });
    } else if (!measured && unit === "milliliter") {
      const fluid = matchPortion(found.food, "fluid ounce", parsed.raw);
      if (fluid && !fluid.ambiguous) {
        measured = {
          grams: qty * (fluid.gramsPerUnit / 29.5735295625),
          basis: "FDC fl oz portion scaled to milliliters",
        };
      }
    } else if (!measured) {
      const volumeUnits = new Set(["cup", "tablespoon", "teaspoon", "pint"]);
      const portionUnit = unit || countUnit(parsed);
      let portion = volumeUnits.has(portionUnit)
        ? volumePortion(found.food, portionUnit, parsed.raw)
        : matchPortion(found.food, portionUnit, parsed.raw);
      if ((!portion || portion.ambiguous) && portionUnit === "head") {
        const bunch = matchPortion(found.food, "bunch", parsed.raw);
        if (bunch && !bunch.ambiguous) {
          portion = { ...bunch, basisNote: "no head portion; FDC bunch" };
        }
      }
      if ((!portion || portion.ambiguous) && !unit) {
        const medium = matchPortion(found.food, "medium", parsed.raw);
        if (medium && !medium.ambiguous) {
          portion = medium;
          measured = {
            grams: qty * medium.gramsPerUnit,
            basis: `size not stated; FDC medium (${medium.modifier} = ${medium.grams} g)`,
          };
        }
      }
      if (!measured && (!portion || portion.ambiguous) && (unit === "large" || unit === "medium" || unit === "small")) {
        const piece = matchPortion(found.food, "piece", parsed.raw);
        if (piece && !piece.ambiguous) {
          portion = piece;
          measured = {
            grams: qty * piece.gramsPerUnit,
            basis: `no ${unit} portion; FDC ${piece.modifier} = ${piece.grams} g`,
          };
        }
      }
      if (!measured && portion && !portion.ambiguous) {
        const via = portion.convertedFrom ? ` via ${portion.convertedFrom}` : "";
        const note = portion.basisNote ? `${portion.basisNote}; ` : "";
        measured = {
          grams: qty * portion.gramsPerUnit,
          basis: `${note}FDC ${portion.modifier} = ${portion.grams} g${via}`,
        };
      } else if (!measured && portion?.ambiguous) {
        unmapped.push({ item: ingredient, reason: `ambiguous FDC portions: ${portion.options.join("; ")}` });
        continue;
      }
    }

    if (!measured || !Number.isFinite(measured.grams) || measured.grams <= 0) {
      if (SPICE_LINE.test(parsed.raw) && smallSpice({ ...parsed, qty, unit })) {
        omitted.push({ item: ingredient, reason: "spice without a matching FDC measure" });
        continue;
      }
      unmapped.push({ item: ingredient, reason: `no FDC gram weight for ${unit || "count"} of ${found.description}` });
      continue;
    }

    if (found.food.nutrientsPer100g?.kcal == null) {
      unmapped.push({ item: ingredient, reason: `FDC ${found.food.fdcId} has no kcal` });
      continue;
    }

    rows.push({
      item: ingredient,
      grams: round2(measured.grams),
      fdcId: found.food.fdcId,
      basis: measured.basis,
      description: found.description,
      ...nutrientsFor(found.food, measured.grams),
    });
  }

  return { rows, omitted, unmapped };
}

export function foodsByDescription(cache) {
  const map = new Map();
  for (const food of Object.values(cache.foods || {})) {
    map.set(food.description, food);
  }
  return map;
}

export function perServingTotals(rows, servings) {
  const totals = { kcal: 0, protein: 0, fiber: 0, sodium: 0, sugar: 0 };
  for (const row of rows) {
    totals.kcal += row.kcal;
    totals.protein += row.protein;
    totals.fiber += row.fiber;
    totals.sodium += row.sodium;
    totals.sugar += row.sugar;
  }
  const divisor = Number(servings);
  if (!divisor) return null;
  return {
    kcal: totals.kcal / divisor,
    protein: totals.protein / divisor,
    fiber: totals.fiber / divisor,
    sodium: totals.sodium / divisor,
    sugar: totals.sugar / divisor,
  };
}

export function nutritionFromFrontmatter(entry, cache) {
  const foods = foodsByDescription(cache);
  const rows = [];
  for (const item of entry.ingredientsGrams || []) {
    const food = cache.foods?.[String(item.fdcId)];
    if (!food) {
      return { error: `missing FDC ${item.fdcId} for ${entry.id || "recipe"}` };
    }
    const grams = Number(item.grams);
    rows.push({
      item: item.item,
      grams,
      fdcId: Number(item.fdcId),
      description: food.description,
      ...nutrientsFor(food, grams),
    });
  }
  const raw = perServingTotals(rows, entry.servings);
  if (!raw) return { error: `servings missing for ${entry.id || "recipe"}` };
  return { rows, raw, rounded: roundNutrition(raw), foods };
}

export function schemaNutrition(rounded) {
  return {
    "@type": "NutritionInformation",
    calories: `${rounded.kcal} calories`,
    proteinContent: `${rounded.protein} g`,
    fiberContent: `${rounded.fiber} g`,
    sodiumContent: `${rounded.sodium} mg`,
    sugarContent: `${rounded.sugar} g`,
    servingSize: "1 serving",
  };
}
