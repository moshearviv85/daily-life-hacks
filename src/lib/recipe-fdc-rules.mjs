/**
 * Ingredient lines map to an exact USDA SR Legacy description.
 * scripts/build-fdc-cache.mjs resolves each description to one fdc_id
 * from the published CSV. Do not put guessed ids here.
 *
 * First food named in the line wins. A later "or" option is not counted.
 */

export const FOOD_RULES = [
  { description: "Oil, olive, salad or cooking", match: /olive oil/i },
  { description: "Oil, avocado", match: /avocado oil/i },
  { description: "Oil, canola", match: /canola oil/i },
  { description: "Oil, coconut", match: /coconut oil/i },
  { description: "Oil, sesame, salad or cooking", match: /sesame oil/i },
  { description: "Oil, soybean, salad or cooking", match: /vegetable oil|neutral oil/i },
  { description: "Butter, Clarified butter (ghee)", match: /\bghee\b/i },
  { description: "Butter, without salt", match: /\bunsalted butter\b|\bbutter\b/i, reject: /buttermilk|butter lettuce|peanut butter|almond butter|apple butter|\bghee\b|\bsalted butter\b/i },
  { description: "Butter, salted", match: /salted butter/i },

  { description: "Egg, whole, raw, fresh", match: /\beggs?\b/i, reject: /eggplant|egg noodle|egg-free/i },

  { description: "Wheat flour, white, bread, enriched", match: /bread flour/i },
  { description: "Wheat flour, white, all-purpose, enriched, bleached", match: /all-purpose flour|all purpose flour|plain flour/i, reject: /gluten[-\s]?free/i },
  { description: "Wheat flour, whole-grain (Includes foods for USDA's Food Distribution Program)", match: /whole wheat flour|whole-wheat flour|whole wheat pastry flour/i },
  { description: "Wheat bran, crude", match: /wheat bran/i, reject: /oat bran/i },
  { description: "Oat bran, raw", match: /oat bran/i },
  { description: "Nuts, almonds", match: /almond flour|almond meal/i },
  { description: "Cereals, oats, regular and quick, not fortified, dry", match: /rolled oats|old-fashioned oats|old fashioned oats|oatmeal/i, reject: /(?<!not )instant/i },

  { description: "Sugars, brown", match: /brown sugar/i },
  { description: "Sugars, granulated", match: /granulated sugar|\bsugar\b/i, reject: /brown sugar|powdered sugar|sugar-free|no sugar/i },
  { description: "Honey", match: /\bhoney\b/i },
  { description: "Syrups, maple", match: /maple syrup/i },
  { description: "Raisins, dark, seedless (Includes foods for USDA's Food Distribution Program)", match: /raisins/i },
  { description: "Candies, semisweet chocolate", match: /chocolate chips|dark chocolate/i },
  { description: "Cocoa, dry powder, unsweetened", match: /cocoa powder|unsweetened cocoa/i },
  { description: "Vanilla extract", match: /vanilla extract|\bvanilla\b/i, reject: /vanilla (yogurt|bean)/i },

  { description: "Milk, buttermilk, fluid, cultured, lowfat", match: /buttermilk/i },
  { description: "Beverages, almond milk, unsweetened, shelf stable", match: /almond milk/i },
  { description: "Nuts, coconut milk, raw (liquid expressed from grated meat and water)", match: /coconut milk/i },
  { description: "Cream, fluid, heavy whipping", match: /heavy cream|whipping cream/i },
  { description: "Cream, fluid, half and half", match: /half-and-half|half and half/i },
  { description: "Milk, whole, 3.25% milkfat, with added vitamin D", match: /whole milk|\bmilk\b/i, reject: /buttermilk|almond milk|coconut milk|oat milk|milk of choice|condensed|evaporated|powdered/i },

  { description: "Yogurt, Greek, plain, nonfat (Includes foods for USDA's Food Distribution Program)", match: /greek yogurt/i, reject: /lowfat|low-fat|2%/i },
  { description: "Yogurt, Greek, plain, lowfat", match: /greek yogurt/i },
  { description: "Yogurt, plain, low fat", match: /\byogurt\b/i, reject: /greek|frozen/i },

  { description: "Cheese, parmesan, grated", match: /parmesan|parmigiano/i },
  { description: "Cheese, feta", match: /\bfeta\b/i },
  { description: "Cheese, ricotta, whole milk", match: /ricotta/i },
  { description: "Cheese, cottage, creamed, large or small curd", match: /cottage cheese/i },
  { description: "Cheese, provolone", match: /provolone/i },
  { description: "Cheese, blue", match: /blue cheese|gorgonzola|roquefort/i },
  { description: "Cheese, mozzarella, part skim milk", match: /mozzarella/i },
  { description: "Cheese, cheddar (Includes foods for USDA's Food Distribution Program)", match: /cheddar|shredded cheese/i, reject: /cream cheese|cottage|parmesan|feta/i },
  { description: "Cream, sour, cultured", match: /sour cream/i },
  { description: "Cheese, cream", match: /cream cheese/i },

  { description: "Salad dressing, mayonnaise, regular", match: /mayonnaise|\bmayo\b/i },
  { description: "Mustard, prepared, yellow", match: /yellow mustard|prepared mustard|\bmustard\b/i, reject: /dijon|mustard seed|mustard greens|dry mustard/i },
  { description: "Catsup", match: /ketchup|catsup/i },
  { description: "Sauce, worcestershire", match: /worcestershire/i },
  { description: "Sauce, barbecue", match: /bbq sauce|barbecue sauce/i },
  { description: "Sauce, oyster, ready-to-serve", match: /oyster sauce/i },
  { description: "Sauce, salsa, ready-to-serve", match: /\bsalsa\b|pico de gallo/i },
  { description: "Sauce, pasta, spaghetti/marinara, ready-to-serve", match: /marinara/i },
  { description: "Salad dressing, italian dressing, commercial, regular", match: /italian vinaigrette|italian dressing/i },

  { description: "Vinegar, cider", match: /apple cider vinegar|cider vinegar/i },
  { description: "Vinegar, balsamic", match: /balsamic/i },
  { description: "Vinegar, red wine", match: /red wine vinegar/i },
  // Not in SR Legacy. The branded label is in src/data/fdc-branded-overlay.json.
  // Only a line that already states grams uses it, so other rice-vinegar
  // recipes stay unmapped until someone weighs them.
  { description: "RICE VINEGAR", match: /rice vinegar/i, require: /\(\s*(?:about\s+)?\d+(?:\.\d+)?\s*g\b/i },
  { description: "Vinegar, distilled", match: /white vinegar|distilled vinegar|\bvinegar\b/i, reject: /cider|balsamic|rice|wine/i },

  { description: "Soy sauce made from soy and wheat (shoyu), low sodium", match: /low-sodium soy|low sodium soy/i },
  { description: "Soy sauce made from soy (tamari)", match: /\btamari\b/i },
  { description: "Soy sauce made from soy and wheat (shoyu)", match: /soy sauce/i },
  { description: "Sauce, ready-to-serve, pepper, TABASCO", match: /hot sauce|sriracha|tabasco/i },

  { description: "Salt, table", match: /\b(table salt|fine salt|salt)\b/i, reject: /kosher|sea salt|flaky|coarse|salted|saltine|unsalted/i },

  { description: "Spices, paprika", match: /paprika/i },
  { description: "Spices, chili powder", match: /chili powder|chilli powder/i },
  { description: "Spices, cumin seed", match: /cumin seeds?/i, reject: /ground cumin|cumin powder/i },
  { description: "Spices, cinnamon, ground", match: /cinnamon/i },
  { description: "Spices, oregano, dried", match: /dried oregano|oregano/i, reject: /fresh oregano/i },
  { description: "Spices, pepper, black", match: /black pepper|ground pepper|\bpepper\b/i, reject: /bell pepper|pepper jack|pepper flakes|red pepper|cayenne|chipotle|jalape|pepperoni/i },
  { description: "Spices, pepper, red or cayenne", match: /cayenne|red pepper flakes|crushed red pepper/i },
  { description: "Spices, garlic powder", match: /garlic powder/i },
  { description: "Spices, onion powder", match: /onion powder/i },
  { description: "Spices, thyme, dried", match: /dried thyme/i },
  { description: "Spices, rosemary, dried", match: /dried rosemary/i },
  { description: "Spices, turmeric, ground", match: /turmeric/i },
  { description: "Spices, curry powder", match: /curry powder/i },
  { description: "Spices, ginger, ground", match: /ground ginger|ginger powder/i },
  { description: "Spices, nutmeg, ground", match: /nutmeg/i },
  { description: "Spices, bay leaf", match: /bay leaves|bay leaf/i },
  { description: "Spices, parsley, dried", match: /dried parsley/i },
  { description: "Spices, dill weed, dried", match: /dried dill/i },
  { description: "Seasoning mix, dry, taco, original", match: /taco seasoning/i },
  { description: "Cornstarch", match: /cornstarch|corn starch/i },

  { description: "Leavening agents, baking powder, double-acting, sodium aluminum sulfate", match: /baking powder/i },
  { description: "Leavening agents, baking soda", match: /baking soda/i },
  { description: "Leavening agents, yeast, baker's, active dry", match: /active dry yeast|instant yeast|dry yeast|\byeast\b/i, reject: /nutritional yeast/i },

  { description: "Garlic, raw", match: /\bgarlic\b/i, reject: /garlic powder/i },
  { description: "Onions, spring or scallions (includes tops and bulb), raw", match: /green onions|scallions|spring onions/i },
  { description: "Shallots, raw", match: /shallots?/i },
  { description: "Onions, raw", match: /\bonions?\b/i, reject: /green onion|scallion|spring onion|onion powder/i },
  { description: "Ginger root, raw", match: /fresh ginger|ginger root|\bginger\b/i, reject: /ground ginger|ginger powder/i },
  { description: "Carrots, raw", match: /\bcarrots?\b/i },
  { description: "Celery, raw", match: /\bcelery\b/i },

  { description: "Lentils, pink or red, raw", match: /red lentils|pink lentils/i },
  { description: "Lentils, raw", match: /\blentils?\b/i, reject: /red lentil|pink lentil|cooked lentil/i },
  { description: "Peas, green, split, mature seeds, raw", match: /split peas/i },
  // FNDDS, not SR Legacy. The record is in src/data/fdc-branded-overlay.json.
  // SR Legacy never publishes a drained-can gram weight for black beans.
  // A stated gram weight is required so a bare "15 oz can, drained" stays
  // on the low-sodium rule and stays unmapped.
  { description: "Black beans, from canned, no added fat", match: /black beans/i, require: /\(\s*(?:about\s+)?\d+(?:\.\d+)?\s*g\b/i },
  { description: "Beans, black, mature seeds, canned, low sodium", match: /black beans/i, require: /\b(cans?|canned)\b/i },
  { description: "Beans, black, mature seeds, raw", match: /black beans/i, require: /\b(dried|dry|uncooked)\b/i },
  { description: "Beans, pinto, mature seeds, canned, drained solids, rinsed in tap water", match: /pinto beans/i, require: /\b(cans?|canned)\b/i },
  { description: "Beans, pinto, mature seeds, raw (Includes foods for USDA's Food Distribution Program)", match: /pinto beans/i, require: /\b(dried|dry|uncooked)\b/i },
  { description: "Beans, kidney, red, mature seeds, canned, drained solids", match: /kidney beans/i, require: /\b(cans?|canned)\b/i },
  { description: "Beans, kidney, all types, mature seeds, raw", match: /kidney beans/i },
  { description: "Beans, navy, mature seeds, raw", match: /navy beans/i, require: /\b(dried|dry|uncooked)\b/i },
  { description: "Beans, great northern, mature seeds, canned", match: /great northern/i, require: /\b(cans?|canned)\b/i },
  { description: "Beans, white, mature seeds, canned", match: /cannellini|white beans/i, require: /\b(cans?|canned)\b/i },
  { description: "Chickpeas (garbanzo beans, bengal gram), mature seeds, canned, drained, rinsed in tap water", match: /chickpeas|garbanzo/i, require: /\b(cans?|canned)\b/i },
  { description: "Chickpeas (garbanzo beans, bengal gram), mature seeds, raw", match: /chickpeas|garbanzo/i, require: /\b(dried|dry|uncooked)\b/i },
  { description: "Soybeans, green, raw", match: /edamame/i, reject: /frozen|thawed/i },
  { description: "Edamame, frozen, unprepared", match: /edamame/i },

  { description: "Soup, chicken broth, ready-to-serve", match: /chicken broth|chicken stock/i },
  { description: "Soup, vegetable broth, ready to serve", match: /vegetable broth|vegetable stock/i },
  { description: "Soup, beef broth or bouillon canned, ready-to-serve", match: /beef broth|beef stock/i },
  { description: "Soup, cream of chicken, canned, condensed", match: /cream of chicken/i },

  { description: "Tomato products, canned, paste, without salt added (Includes foods for USDA's Food Distribution Program)", match: /tomato paste/i },
  { description: "Tomatoes, crushed, canned", match: /crushed tomatoes/i },
  { description: "Tomato products, canned, sauce", match: /tomato sauce/i, reject: /pasta sauce|marinara/i },
  { description: "Tomatoes, red, ripe, canned, packed in tomato juice", match: /diced tomatoes|canned tomatoes/i },
  { description: "Tomatoes, red, ripe, raw, year round average", match: /\btomatoes?\b/i, reject: /sun-dried|tomato paste|tomato sauce|diced tomatoes|crushed|canned tomatoes/i },

  { description: "Quinoa, cooked", match: /\bcooked quinoa\b/i },
  { description: "Quinoa, uncooked", match: /\bquinoa\b/i, reject: /\bcooked quinoa\b/i },
  { description: "Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distribution Program)", match: /brown rice/i, require: /cooked/i },
  { description: "Rice, white, long-grain, regular, enriched, cooked", match: /cooked white|cooked rice/i },
  { description: "Rice, brown, long-grain, raw (Includes foods for USDA's Food Distribution Program)", match: /brown rice/i, reject: /cooked/i },
  { description: "Rice, white, long-grain, regular, raw, enriched", match: /white rice|basmati|\brice\b/i, reject: /brown rice|cauliflower rice|cooked rice|rice vinegar|rice wine|wild rice/i },
  { description: "Barley, pearled, raw", match: /pearl barley|pearled barley|\bbarley\b/i, reject: /barley flour/i },
  { description: "Bulgur, dry", match: /bulgur/i },

  { description: "Pasta, whole-wheat, dry (Includes foods for USDA's Food Distribution Program)", match: /whole wheat pasta|whole-wheat pasta|whole wheat rotini|whole wheat spaghetti/i },
  { description: "Pasta, dry, enriched", match: /\bpasta\b|\borzo\b|rotini|fusilli|spaghetti|macaroni|penne|noodles?/i, reject: /whole wheat|cauliflower|chickpea pasta/i },

  { description: "Bread, whole-wheat, commercially prepared", match: /whole wheat bread|whole-wheat bread|whole grain bread|sprouted bread/i },
  { description: "Bread, french or vienna (includes sourdough)", match: /sourdough bread|french bread/i },
  { description: "Bagels, wheat", match: /\bbagel\b/i },
  { description: "Tortillas, ready-to-bake or -fry, corn", match: /corn tortillas/i },
  { description: "Tortillas, ready-to-bake or -fry, flour, shelf stable", match: /flour tortillas|tortillas/i, reject: /corn tortilla/i },
  { description: "Bread, crumbs, dry, grated, plain", match: /breadcrumbs|bread crumbs|\bpanko\b/i },
  { description: "Crackers, standard snack-type, regular", match: /buttery crackers|butter crackers|club crackers/i },

  { description: "Peanut butter, smooth style, with salt (Includes foods for USDA's Food Distribution Program)", match: /peanut butter/i },
  { description: "Seeds, sesame butter, tahini, from roasted and toasted kernels (most common type)", match: /tahini|sesame butter/i },
  { description: "Nuts, almond butter, plain, without salt added", match: /almond butter/i },
  { description: "Seeds, chia seeds, dried", match: /chia seeds/i },
  { description: "Seeds, flaxseed", match: /flax\s?seeds?|flaxseed|ground flax/i },
  { description: "Seeds, pumpkin and squash seed kernels, dried", match: /pumpkin seeds|pepitas/i },
  { description: "Seeds, sunflower seed kernels, dried", match: /sunflower seeds/i },
  { description: "Seeds, hemp seed, hulled", match: /hemp seeds|hemp hearts/i },
  { description: "Seeds, sesame seeds, whole, dried", match: /sesame seeds/i, reject: /sesame oil|sesame butter|tahini/i },
  { description: "Nuts, walnuts, english", match: /walnuts/i },
  { description: "Nuts, almonds", match: /\balmonds?\b/i, reject: /almond milk|almond butter|almond flour|almond meal/i },
  { description: "Nuts, cashew nuts, raw", match: /cashews/i },
  { description: "Nuts, pecans", match: /pecans/i },

  { description: "Chicken, broilers or fryers, rotisserie, original seasoning, breast, meat only, cooked", match: /rotisserie chicken/i },
  { description: "Chicken, ground, raw", match: /ground chicken/i },
  { description: "Chicken, broilers or fryers, breast, meat only, cooked, roasted", match: /chicken/i, require: /cooked|shredded/i, reject: /broth|stock|soup|rotisserie|ground chicken/i },
  { description: "Chicken, broilers or fryers, dark meat, thigh, meat only, raw", match: /chicken thighs/i, reject: /cooked|shredded/i },
  { description: "Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw", match: /chicken breasts?|\bchicken\b/i, reject: /broth|stock|soup|rotisserie|ground chicken|chicken sausage|cooked|shredded/i },
  { description: "Turkey, ground, 93% lean, 7% fat, raw", match: /ground turkey/i },
  { description: "Beef, ground, 85% lean meat / 15% fat, raw (Includes foods for USDA's Food Distribution Program)", match: /ground beef|lean ground beef/i },
  { description: "Beef, ground, 80% lean meat / 20% fat, raw", match: /80\/20/i },
  { description: "Pork, fresh, loin, tenderloin, separable lean only, raw", match: /pork tenderloin/i },
  { description: "Pork, fresh, loin, center loin (chops), bone-in, separable lean and fat, raw", match: /pork chops/i },
  { description: "Pork, fresh, spareribs, separable lean and fat, raw", match: /baby back ribs|pork ribs|\bribs\b/i, reject: /celery ribs|short ribs/i },
  { description: "Beef, rib, whole (ribs 6-12), separable lean and fat, trimmed to 1/8\" fat, choice, raw", match: /prime rib/i },
  { description: "Sausage, smoked link sausage, pork", match: /smoked sausage/i },
  { description: "Pork, cured, bacon, cooked, baked", match: /\bbacon\b/i, reject: /turkey bacon|bacon bits/i },

  { description: "Fish, salmon, Atlantic, farmed, raw", match: /\bsalmon\b/i },
  { description: "Fish, cod, Atlantic, raw", match: /\bcod\b/i },
  { description: "Fish, tilapia, raw", match: /tilapia|white fish|fish fillets/i },

  { description: "Tofu, extra firm, prepared with nigari", match: /extra firm tofu|extra-firm tofu/i },
  { description: "Tofu, raw, firm, prepared with calcium sulfate", match: /\btofu\b/i },

  { description: "Potatoes, russet, flesh and skin, raw (Includes foods for USDA's Food Distribution Program)", match: /russet potatoes|russet potato/i },
  { description: "Potatoes, red, flesh and skin, raw", match: /red potatoes|baby potatoes|yellow potatoes|yukon|potatoes/i, reject: /sweet potato/i },
  { description: "Sweet potato, raw, unprepared (Includes foods for USDA's Food Distribution Program)", match: /sweet potatoes?/i },
  { description: "Avocados, raw, all commercial varieties", match: /avocados?/i, reject: /avocado oil/i },

  { description: "Broccoli, raw", match: /broccoli/i },
  { description: "Cauliflower, raw", match: /cauliflower/i, reject: /cauliflower rice/i },
  { description: "Cabbage, raw", match: /\bcabbage\b/i, reject: /napa/i },
  { description: "Kale, raw", match: /\bkale\b/i },
  { description: "Spinach, raw", match: /spinach/i, reject: /frozen spinach/i },
  { description: "Lettuce, butterhead (includes boston and bibb types), raw", match: /butter lettuce|bibb|boston lettuce/i },
  { description: "Lettuce, cos or romaine, raw", match: /romaine/i },
  { description: "Lettuce, iceberg (includes crisphead types), raw", match: /\blettuce\b/i },
  { description: "Cucumber, with peel, raw", match: /cucumbers?/i },
  { description: "Squash, summer, zucchini, includes skin, raw", match: /zucchini/i },
  { description: "Asparagus, raw", match: /asparagus/i },
  { description: "Leeks, (bulb and lower leaf-portion), raw", match: /\bleeks?\b/i },
  { description: "Artichokes, (globe or french), raw", match: /artichokes?/i, reject: /jerusalem/i },
  { description: "Beans, snap, green, raw", match: /green beans/i },
  { description: "Peppers, sweet, red, raw", match: /red bell peppers?|bell peppers?/i },
  { description: "Peppers, sweet, green, raw", match: /green bell peppers?/i },
  { description: "Peppers, sweet, yellow, raw", match: /yellow bell peppers?/i },
  { description: "Peppers, jalapeno, raw", match: /jalapeñ|jalapeno/i },
  { description: "Mushrooms, portabella, raw", match: /portobello/i },
  { description: "Mushrooms, brown, italian, or crimini, raw", match: /cremini|crimini/i },
  { description: "Mushrooms, white, raw", match: /\bmushrooms?\b/i, reject: /portobello|cremini|crimini|shiitake/i },

  { description: "Corn, sweet, yellow, canned, whole kernel, drained solids", match: /\bcorn\b/i, require: /\b(cans?|canned)\b/i, reject: /tortilla|cornstarch|popcorn/i },
  { description: "Corn, sweet, yellow, frozen, kernels cut off cob, unprepared (Includes foods for USDA's Food Distribution Program)", match: /frozen corn|\bcorn\b/i, reject: /tortilla|cornstarch|corn starch|popcorn/i },
  { description: "Peas, green, frozen, unprepared (Includes foods for USDA's Food Distribution Program)", match: /\bpeas\b/i, reject: /split pea|snap pea|snow pea/i },
  { description: "Vegetables, mixed, frozen, unprepared", match: /mixed frozen vegetables|frozen stir-fry vegetables|mixed vegetables/i },
  { description: "Peas, edible-podded, raw", match: /snap peas|snow peas/i },

  { description: "Lemon juice, raw", match: /lemon juice|juice of \d+ lemons?|lemons?, juiced/i },
  { description: "Lime juice, raw", match: /lime juice|juice of \d+ limes?|limes?, juiced/i },
  { description: "Lemons, raw, without peel", match: /\blemons?\b/i, reject: /lemon juice|lemon zest/i },
  { description: "Limes, raw", match: /\blimes?\b/i, reject: /lime juice|lime zest|lime wedge/i },
  { description: "Pears, raw, bartlett (Includes foods for USDA's Food Distribution Program)", match: /\bpears?\b/i, reject: /prickly/i },
  { description: "Apple juice, canned or bottled, unsweetened, without added ascorbic acid", match: /apple juice/i },
  { description: "Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)", match: /\bapples?\b/i, reject: /apple cider|apple juice|pineapple/i },
  { description: "Bananas, raw", match: /bananas?/i },
  { description: "Blueberries, raw", match: /blueberries/i },
  { description: "Raspberries, raw", match: /raspberries/i },
  { description: "Strawberries, raw", match: /strawberries|\bberries\b/i },
  { description: "Capers, canned", match: /capers/i },
  { description: "Olives, ripe, canned (small-extra large)", match: /black olives|ripe olives|\bolives\b/i, reject: /olive oil/i },

  { description: "Parsley, fresh", match: /fresh parsley|\bparsley\b/i, reject: /dried parsley/i },
  { description: "Coriander (cilantro) leaves, raw", match: /cilantro|fresh coriander/i },
  { description: "Peppermint, fresh", match: /peppermint|fresh mint|\bmint\b/i, reject: /spearmint/i },
  { description: "Rosemary, fresh", match: /fresh rosemary/i },
  { description: "Thyme, fresh", match: /fresh thyme/i },
  { description: "Dill weed, fresh", match: /fresh dill/i },
  { description: "Basil, fresh", match: /fresh basil|\bbasil\b/i, reject: /thai basil|dried basil/i },

  { description: "Alcoholic beverage, wine, table, white", match: /white wine/i, reject: /vinegar/i },
  { description: "Alcoholic beverage, wine, table, red", match: /red wine/i, reject: /vinegar/i },
];

/** Lines that are not a counted ingredient. */
export function lineExemption(raw) {
  const text = String(raw || "").trim();
  const lower = text.toLowerCase();
  if (!text) return "blank";
  if (/^optional\b/.test(lower) || /\(optional\)/i.test(text) || /optional toppings/i.test(text)) {
    return "optional";
  }
  if (/your favorite pizza toppings|your favorite bbq/i.test(text)) return "unspecified product";
  if (/olive oil spray|light brush of oil|light brushing of olive oil/i.test(text)) {
    return "unmeasured finish";
  }
  if (/^(extra|additional|more)\b/i.test(text) && /for dusting|for sprinkling|for the top/i.test(text)) {
    return "unmeasured finish";
  }
  if (/for sprinkling|for the top/i.test(text) && !/^\d/.test(text) && !/^[¼½¾⅓⅔⅛]/.test(text)) {
    return "unmeasured finish";
  }
  if (/water for soaking|water for boiling/i.test(text)) return "water";
  if (/^extra flour\b/i.test(text)) return "unmeasured dusting flour";
  if (/^zest of\b/i.test(text)) return "zest";
  if (/wedges? for serving|for garnish|for serving/i.test(text) && !/^\d/.test(text) && !/^[¼½¾⅓⅔⅛]/.test(text)) {
    return "unmeasured garnish";
  }
  if (/to taste/i.test(text) && !/^\d/.test(text) && !/^[¼½¾⅓⅔⅛]/.test(text)) return "to taste";
  if (/^pinch\b|^a pinch\b/i.test(text)) return "pinch";
  if (/^salt and\b|^salt or\b/i.test(text)) return "unmeasured salt";
  if (/^freshly ground black pepper$|^black pepper to taste$/i.test(text)) return "unmeasured pepper";
  if (/^toppings:/i.test(text)) return "unmeasured toppings";
  return null;
}
