export function discardAmounts(amount, unit = 'grams', hydration = 100) {
  if (!Number.isFinite(amount) || amount < 0 || !['grams', 'cups'].includes(unit) || !Number.isFinite(hydration) || hydration <= 0) return null;
  const grams = amount * (unit === 'cups' ? 227 : 1);
  const flour = grams / (1 + hydration / 100);
  return { grams, cups: grams / 227, flour, water: grams - flour };
}

export function proteinPortion(target, protein, servingWeight) {
  if (![target, protein, servingWeight].every(n => Number.isFinite(n) && n > 0)) return null;
  const servings = target / protein;
  const grams = servings * servingWeight;
  return { servings, grams, ounces: grams / 28.349523125 };
}
