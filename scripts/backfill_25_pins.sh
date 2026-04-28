#!/usr/bin/env bash
# One-time backfill of the 24 remaining pin-briefs (aldi was the bench).
# Sequential to keep failures per-slug visible. Logs to /tmp/backfill.log.
set +e

LOG=/tmp/backfill.log
: > "$LOG"

SLUGS=(
  best-high-protein-breads-healthy-sandwiches
  cheap-chicken-casserole-meals-large-families
  comparing-fiber-content-different-pizza-crusts
  easy-sandwich-bread-recipe-beginners
  easy-sourdough-discard-recipes-beginners
  freezer-organization-tips-large-family-meals
  gluten-free-sourdough-discard-pizza-dough
  healthy-egg-sandwich-add-ins-toppings
  healthy-homemade-dumpling-wrapper-recipe
  healthy-homemade-indian-salad-dressing-recipes
  hidden-sugars-popular-summer-salad-dressings
  high-protein-vs-high-fiber-satiety
  how-much-protein-in-bagel-sandwich
  how-to-make-sourdough-pizza-dough-same-day
  how-to-store-homemade-salad-dressing-safely
  macronutrient-breakdown-healthy-egg-sandwich
  meal-prep-hacks-costco-rotisserie-chicken
  nutritional-benefits-cold-pasta-salad-resistant-starch
  rotisserie-chicken-nutrition-facts-sodium-content
  savory-chia-seed-recipes-breakfast
  sourdough-discard-nutrition-facts-health-benefits
  time-saving-hacks-summer-crockpot-meals
  tips-feeding-picky-eaters-on-budget
  understanding-macros-balanced-family-dinner
)

i=0
total=${#SLUGS[@]}
for slug in "${SLUGS[@]}"; do
  i=$((i+1))
  ts=$(date +"%H:%M:%S")
  echo "[$ts] [$i/$total] $slug" | tee -a "$LOG"
  if python scripts/generate_pin_briefs.py --slug "$slug" >/dev/null 2>>"$LOG"; then
    echo "[$ts] [$i/$total] OK $slug" | tee -a "$LOG"
  else
    echo "[$ts] [$i/$total] FAIL $slug" | tee -a "$LOG"
  fi
done

ts=$(date +"%H:%M:%S")
echo "[$ts] DONE" | tee -a "$LOG"
