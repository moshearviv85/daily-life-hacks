import json, csv, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

briefs = {
    1: {
        "content_brief": "Write a recipe article featuring a High Fiber Black Bean & Veggie Power Bowl. Include ONE main recipe with exact measurements (black beans, brown rice, roasted broccoli, shredded cabbage, carrots, olive oil, cumin, lime). Provide full nutritional info. Add 3 variation ideas (swap grains, swap beans, add protein). Include a section on how fiber supports digestive regularity. Meal prep tips for 4-day storage.",
        "target_words": 1200,
        "key_points": "one main recipe with exact quantities; 3 variations; meal prep tips; fiber and digestion section"
    },
    2: {
        "content_brief": "Write a nutrition article featuring 3 easy high-fiber breakfast ideas: (1) Chia Seed Pudding with exact recipe and measurements, (2) Overnight Oats with exact recipe, (3) Green Veggie Smoothie with exact recipe. Each must include full ingredient list with quantities, step-by-step instructions, and customization ideas. Add a section on why fiber matters for gut microbiome. Include meal prep tips for each.",
        "target_words": 1400,
        "key_points": "3 complete mini-recipes with exact measurements; customization per recipe; gut microbiome section; meal prep tips; hydration reminder"
    },
    3: {
        "content_brief": "Write a comprehensive 30-day high-fiber meal plan guide. Structure as Week 1-4 with increasing fiber targets (Week 1: 20g, Week 2: 25g, Week 3: 28g, Week 4: 30g+). Provide 3-4 sample meals per week with fiber gram counts. Include a printable shopping list concept for each week. Tips on gradually increasing fiber to avoid bloating. Daily water intake recommendations alongside fiber goals.",
        "target_words": 1500,
        "key_points": "4-week progressive structure; sample meals with fiber grams; shopping list ideas; gradual increase tips; hydration pairing"
    },
    4: {
        "content_brief": "Write a recipe article for high-protein high-fiber meals for weight management. Feature ONE main recipe: Grilled Chicken & Lentil Bowl with roasted vegetables (exact measurements, ~450 cal, 35g protein, 12g fiber). Add 4 more meal ideas with brief descriptions and macros: turkey chili, salmon quinoa bowl, chickpea stir-fry, egg & black bean breakfast wrap. Focus on satiety and how protein+fiber combo helps with fullness.",
        "target_words": 1300,
        "key_points": "one detailed main recipe; 4 additional meal ideas with macros; protein+fiber satiety science; portion guidance"
    },
    5: {
        "content_brief": "Write a recipe article featuring 5 vegetarian high-fiber dinner ideas. Lead with ONE full recipe: Stuffed Bell Peppers with Quinoa, Black Beans & Corn (exact measurements, 380 cal). Then provide 4 more dinner concepts with key ingredients and brief instructions: lentil bolognese, chickpea coconut curry, sweet potato & black bean tacos, mushroom barley stew. Emphasize that plant-based meals are naturally fiber-rich.",
        "target_words": 1300,
        "key_points": "one full recipe; 4 dinner concepts; all vegetarian; fiber counts per meal; plant-based fiber advantage"
    },
    6: {
        "content_brief": "Write a recipe article with 5 high-fiber meals that take 20 minutes or less. Each must include full recipe with exact measurements and realistic cook time. Ideas: (1) Black bean quesadilla with veggies, (2) Chickpea & spinach stir-fry, (3) Whole wheat pasta with white beans & garlic, (4) Lentil & vegetable wrap, (5) Quick oat & veggie savory bowl. Focus on busy weeknight convenience. Include a time-saving tips section.",
        "target_words": 1300,
        "key_points": "5 complete recipes all under 20 min; exact measurements; time-saving tips; realistic timing"
    },
    7: {
        "content_brief": "Write a recipe article celebrating cabbage as a high-fiber superfood. Feature ONE main recipe: Crunchy Asian Cabbage Slaw with Peanut Dressing (exact measurements). Add 3 more cabbage recipes: roasted cabbage steaks, cabbage & white bean soup, stuffed cabbage rolls. Include a nutrition spotlight section on cabbage (fiber per cup, vitamins C and K, low calorie). Why cabbage is trending in 2026.",
        "target_words": 1200,
        "key_points": "one main recipe; 3 additional cabbage recipes; cabbage nutrition facts; 2026 trend angle"
    },
    8: {
        "content_brief": "Write a practical guide to high-fiber meal prep for the week. Provide a complete Sunday prep plan: cook 2 grains (brown rice + quinoa), prep 2 proteins, roast 3 vegetables, make 1 sauce. Show how these components combine into 5 different meals (Mon-Fri) with exact portions. Include storage instructions, container tips, and reheating guidelines. Add a printable-style prep checklist.",
        "target_words": 1400,
        "key_points": "complete Sunday prep plan; 5 weekday meal combinations; storage and reheating tips; component-based system"
    },
    9: {
        "content_brief": "Write a comprehensive list article of the best high-fiber foods for digestive regularity. Organize by category: Fruits (raspberries, pears, apples, bananas), Vegetables (broccoli, artichoke, Brussels sprouts, carrots), Legumes (lentils, black beans, chickpeas), Grains (oats, quinoa, barley, bulgur), Nuts & Seeds (chia, flax, almonds). Include fiber grams per serving for each food. Add a section on daily recommended intake (25-30g).",
        "target_words": 1200,
        "key_points": "organized by food category; fiber grams per serving for each item; daily intake recommendation; at least 20 foods listed"
    },
    10: {
        "content_brief": "Write a recipe article with 4 gut-friendly high-fiber smoothie recipes. Each with exact measurements: (1) Green Goddess: spinach, banana, chia, almond milk, (2) Berry Blast: mixed berries, oats, flax, yogurt, (3) Tropical Fiber: mango, kale, coconut water, hemp seeds, (4) Chocolate Power: cocoa, banana, peanut butter, oats, almond milk. Include fiber count per smoothie. Tips on blending order and consistency. Smoothie pack prep-ahead instructions.",
        "target_words": 1200,
        "key_points": "4 complete smoothie recipes; fiber grams per smoothie; blending tips; freezer pack prep method"
    },
    11: {
        "content_brief": "Write a recipe article for no-bake high-fiber energy balls. Feature ONE main recipe: Oat & Date Energy Balls (rolled oats, Medjool dates, almond butter, chia seeds, dark chocolate chips, honey - exact measurements, makes 15 balls, ~120 cal each). Add 3 flavor variations: Coconut Lime, Peanut Butter Banana, Cinnamon Raisin. Include storage instructions (fridge 1 week, freezer 3 months). Prep time should be 10 minutes, no cooking required.",
        "target_words": 1000,
        "key_points": "one detailed main recipe; 3 flavor variations; per-ball calories; storage instructions; truly no-bake"
    },
    12: {
        "content_brief": "Write a list article ranking the best high-fiber fruits for weight management. Cover at least 10 fruits with fiber grams and calories per serving: raspberries (8g), pears (5.5g), apples (4.4g), bananas (3.1g), oranges (3.1g), strawberries (3g), blueberries, avocado (yes it's a fruit - 10g!), figs, kiwi. For each fruit, include one practical tip on how to eat it. Section on why fruit fiber helps with fullness and portion control.",
        "target_words": 1200,
        "key_points": "10+ fruits ranked by fiber; fiber grams and calories per serving; practical eating tips; fullness/satiety section"
    },
    13: {
        "content_brief": "Write a recipe article with 5 high-fiber avocado toast variations. Each with exact ingredients and measurements on whole grain bread: (1) Classic: mashed avocado, lemon, red pepper flakes, everything seasoning, (2) Mediterranean: avocado, cherry tomatoes, feta, olive oil, (3) Southwest: avocado, black beans, corn, cilantro, lime, (4) Asian-Inspired: avocado, edamame, sesame seeds, soy drizzle, (5) Sweet: avocado, sliced strawberries, honey, hemp seeds. Include fiber count per variation and total nutrition.",
        "target_words": 1100,
        "key_points": "5 distinct variations; exact measurements; fiber per variation; whole grain bread emphasis; nutrition info"
    },
    14: {
        "content_brief": "Write a recipe article for crispy roasted chickpeas as a high-fiber snack. ONE main recipe with exact measurements: canned chickpeas, olive oil, salt, smoked paprika, garlic powder. 400F for 25-30 min. Add 5 seasoning variations: Ranch, BBQ, Cinnamon Sugar, Everything Bagel, Chili Lime. Include tips for getting them truly crispy (dry thoroughly, single layer, don't overcrowd). Nutrition per serving (~130 cal, 6g fiber). Storage tips (stay crispy 3 days in open container).",
        "target_words": 1000,
        "key_points": "one base recipe; 5 seasoning variations; crispiness tips; nutrition per serving; storage advice"
    },
    15: {
        "content_brief": "Write a visual-friendly list article of the best high-fiber vegetables for gut health. Cover 12+ vegetables organized by fiber content (highest to lowest): artichoke (10g), green peas (9g), broccoli (5g), Brussels sprouts (4g), carrots (3.6g), sweet potato (3.8g), cauliflower, kale, spinach, beets, cabbage, zucchini. For each: fiber per cup, one key vitamin/mineral, and one easy way to eat it. Include a section on raw vs cooked fiber content.",
        "target_words": 1200,
        "key_points": "12+ vegetables; fiber per serving; one key nutrient each; easy preparation tip; raw vs cooked comparison"
    },
    16: {
        "content_brief": "Write a recipe article for overnight oats meal prep. Feature ONE base recipe with exact measurements (rolled oats, milk, chia seeds, yogurt, maple syrup). Then provide 5 flavor add-in combos: (1) Blueberry Almond, (2) PB & Banana, (3) Apple Cinnamon, (4) Strawberry Coconut, (5) Mango Turmeric. Each with specific topping quantities. Include macro breakdown per serving. Explain prep-ahead system: make 5 jars Sunday, grab-and-go Mon-Fri. How overnight oats support weight management through fiber and protein.",
        "target_words": 1200,
        "key_points": "one base recipe; 5 flavor variations; macros per serving; 5-jar Sunday prep system; weight management angle"
    },
    17: {
        "content_brief": "Write a recipe article featuring 3 high-fiber sweet potato dinner recipes. Lead recipe: Stuffed Sweet Potatoes with Black Beans, Corn & Avocado Crema (exact measurements, 400F, 45 min bake). Second: Sweet Potato & Chickpea Curry. Third: Sweet Potato & Lentil Shepherd's Pie. Full recipes for all three with nutrition info. Include a section on sweet potato nutrition (fiber, vitamin A, potassium) and why baking is better than boiling for keeping fiber.",
        "target_words": 1300,
        "key_points": "3 full dinner recipes; sweet potato nutrition spotlight; baking vs boiling tip; exact measurements and temperatures"
    },
    18: {
        "content_brief": "Write a recipe article for high-fiber keto bread. ONE detailed recipe using almond flour, psyllium husk powder, eggs, baking powder, butter, salt (exact measurements). Include step-by-step with specific temperatures (350F, 50-55 min). Explain why psyllium husk is the key ingredient (adds fiber + bread texture). Nutrition per slice (8 slices per loaf): ~120 cal, 2g net carbs, 5g fiber. Tips for slicing, toasting, and storing. Compare fiber content to regular white bread.",
        "target_words": 1100,
        "key_points": "one detailed recipe; psyllium husk explanation; per-slice nutrition with net carbs; storage tips; comparison to white bread"
    },
    19: {
        "content_brief": "Write a recipe article for a high-fiber quinoa lunch salad. ONE main recipe: Mediterranean Quinoa Salad with chickpeas, cucumber, cherry tomatoes, red onion, Kalamata olives, feta, lemon-herb dressing (exact measurements, serves 4). Add 3 quinoa salad variations: Southwest (black beans, corn, cilantro-lime), Asian (edamame, carrot, sesame-ginger), Harvest (roasted sweet potato, cranberries, pecans). Meal prep tips: keeps 4 days, dressing separate. Quinoa nutrition spotlight (8g fiber + 8g protein per cup).",
        "target_words": 1200,
        "key_points": "one full recipe; 3 variation concepts; meal prep storage; quinoa nutrition facts; lunch-focused"
    },
    20: {
        "content_brief": "Write a nutrition article about the top 5 high-fiber nuts for snacking. Cover: almonds (3.5g per oz), pistachios (2.9g), pecans (2.7g), hazelnuts (2.7g), walnuts (1.9g). For each nut: fiber per serving, calories, unique nutritional benefit, and a snack idea. Include a comparison table. Section on ideal portion size (1 oz = small handful). Tips on buying (raw vs roasted, unsalted) and storing nuts. Why nuts combine fiber + healthy fats + protein for sustained energy.",
        "target_words": 1100,
        "key_points": "5 nuts with fiber per oz; comparison table; portion size guidance; buying and storing tips; satiety benefits"
    },
    21: {
        "content_brief": "Write a recipe article for a high-fiber vegan burger. ONE main recipe: Black Bean & Oat Burger Patties (black beans, rolled oats, onion, garlic, cumin, smoked paprika, flax egg - exact measurements, makes 6 patties). Pan-fry method (medium heat, 4-5 min per side). Include bun and topping suggestions (whole wheat bun, avocado, tomato, lettuce, pickled onion). Nutrition per patty: ~180 cal, 8g fiber, 9g protein. Add 2 patty variations: Lentil-Mushroom, Chickpea-Sweet Potato. Tips to prevent patties from falling apart.",
        "target_words": 1100,
        "key_points": "one full burger recipe; 2 patty variations; binding tips; nutrition per patty; vegan focus"
    },
    22: {
        "content_brief": "Write a practical nutrition guide on how to increase daily fiber intake without digestive discomfort. Cover: start slow (add 5g per week), always pair with water (8oz per extra 5g fiber), which foods cause least gas (berries, oats, sweet potato) vs most (beans, broccoli, cabbage), the soaking/rinsing trick for beans, cooking methods that reduce gas (longer cooking). Include a sample 7-day fiber increase plan from 15g to 30g. Friendly, reassuring tone - fiber discomfort is temporary.",
        "target_words": 1200,
        "key_points": "gradual increase method; water pairing rule; low-gas vs high-gas foods; bean soaking trick; 7-day sample plan"
    },
    23: {
        "content_brief": "Write a nutrition/recipe article about high-fiber pasta alternatives. Compare 6 options with fiber per serving: chickpea pasta (8g), lentil pasta (7g), whole wheat pasta (6g), black bean pasta (12g), edamame pasta (11g), and regular pasta (2.5g baseline). For the top pick (chickpea pasta), include ONE full recipe: Chickpea Pasta Primavera with roasted vegetables (exact measurements). Taste and texture notes for each alternative. Cooking tips (don't overcook protein pastas). Price comparison range.",
        "target_words": 1200,
        "key_points": "6 alternatives compared with fiber counts; one full recipe; taste/texture notes; cooking tips; regular pasta as baseline"
    },
    24: {
        "content_brief": "Write a recipe article for a warm oatmeal breakfast bowl. ONE main recipe: Savory-Sweet Oatmeal Bowl with banana, walnuts, cinnamon, honey, and chia seeds (exact measurements, stovetop method, 5 min cook). Add 4 warming variations: (1) Apple Pie (diced apple, cinnamon, pecans), (2) Pumpkin Spice (pumpkin puree, nutmeg, maple), (3) Chocolate Banana (cocoa, banana, almond butter), (4) Berry Crumble (mixed berries, granola, yogurt). Nutrition per bowl. Why warm oats are comforting for cold mornings and provide sustained energy.",
        "target_words": 1100,
        "key_points": "one main recipe; 4 seasonal variations; stovetop method; nutrition info; winter comfort angle"
    },
    25: {
        "content_brief": "Write a nutrition guide about the Mediterranean diet's naturally high-fiber approach. Explain what makes Mediterranean eating fiber-rich (legumes, whole grains, vegetables, fruits, nuts). Provide a sample 3-day meal plan with fiber counts per meal. Highlight key Mediterranean fiber foods: lentils, chickpeas, bulgur, farro, artichokes, figs. Include 2-3 quick Mediterranean recipe ideas with brief ingredients. Section on why this is a sustainable long-term eating pattern vs restrictive diets.",
        "target_words": 1300,
        "key_points": "Mediterranean diet + fiber connection; 3-day meal plan with fiber counts; key fiber foods; sustainability advantage"
    },
    26: {
        "content_brief": "Write a recipe/list article of low-calorie high-fiber snacks all under 100 calories. List 10 snacks with exact portions and nutrition: (1) apple slices (52 cal, 2.4g fiber), (2) baby carrots + 1 tbsp hummus (65 cal, 3g fiber), (3) air-popped popcorn 2 cups (62 cal, 2.4g fiber), (4) celery + 1 tbsp almond butter (98 cal, 2g fiber), (5) 1/2 cup raspberries (32 cal, 4g fiber), etc. Include 5 more creative options. Tips on portioning. Why fiber-rich snacks prevent overeating between meals.",
        "target_words": 1100,
        "key_points": "10 snacks all under 100 cal; exact portions and nutrition; creative options; anti-overeating benefits"
    },
    27: {
        "content_brief": "Write a nutrition education article explaining prebiotics vs probiotics and how they work together. Define each clearly with simple analogies (prebiotics = food for good bacteria, probiotics = the good bacteria themselves). List top prebiotic foods (garlic, onion, banana, asparagus, oats) and top probiotic foods (yogurt, kefir, kimchi, sauerkraut, miso). Explain the synbiotic effect. Include a simple comparison chart. Tips on incorporating both into daily meals. Keep it friendly and non-scientific.",
        "target_words": 1200,
        "key_points": "clear prebiotic vs probiotic definitions; food lists for each; synbiotic concept; comparison chart; daily tips"
    },
    28: {
        "content_brief": "Write a recipe article for a high-fiber acai smoothie bowl. ONE main recipe with exact measurements: frozen acai packet, frozen banana, mixed berries, almond milk, topped with granola, sliced banana, chia seeds, coconut flakes, honey drizzle. Include blending technique for thick consistency (minimal liquid, tamper or stir). Nutrition info (~350 cal, 10g fiber). Add 3 bowl variations: Green Acai (add spinach), Tropical Acai (mango, pineapple), PB Acai (peanut butter, oats). Instagram-worthy plating tips.",
        "target_words": 1000,
        "key_points": "one main recipe; thick consistency technique; 3 variations; nutrition per bowl; visual plating tips"
    },
    29: {
        "content_brief": "Write a recipe article for a Beans and Rice bowl as a complete protein high-fiber meal. ONE main recipe: Cuban-Style Black Beans & Rice (exact measurements: black beans, long grain rice, olive oil, onion, bell pepper, garlic, cumin, oregano, bay leaf, lime). Explain the complete protein concept (beans + rice = all essential amino acids). Nutrition per serving (~400 cal, 15g protein, 12g fiber). Add 3 global variations: Mexican Red Beans & Rice, Cajun Red Beans & Rice, Indian Rajma Chawal. Budget-friendly angle.",
        "target_words": 1200,
        "key_points": "one full Cuban recipe; complete protein explanation; 3 global variations; budget-friendly angle; nutrition info"
    },
    30: {
        "content_brief": "Write a recipe article for high-fiber gluten-free bread. ONE detailed recipe using oat flour, almond flour, psyllium husk, eggs, olive oil, honey, baking powder, salt (exact measurements). Bake at 350F for 45-50 min. Step-by-step with tips for best texture (don't skip psyllium, let cool completely before slicing). Nutrition per slice. Compare fiber to regular GF bread (often low fiber). Storage: counter 3 days, fridge 1 week, freezer 3 months. Add 2 variations: Seeded Loaf, Rosemary Olive Oil.",
        "target_words": 1100,
        "key_points": "one detailed recipe; psyllium husk key role; per-slice nutrition; GF bread fiber comparison; storage instructions"
    },
    31: {
        "content_brief": "Write a nutrition list article about fermented foods for gut flora. Cover 10 fermented foods: yogurt, kefir, sauerkraut, kimchi, miso, tempeh, kombucha, pickles (naturally fermented), natto, sourdough bread. For each: what it is, how it's made (brief), key probiotic strains or benefits, and one easy way to add it to a meal. Section on fermented vs pickled (vinegar-pickled has no probiotics). Tips for buying (look for 'live cultures' on label). Start-small advice for beginners.",
        "target_words": 1200,
        "key_points": "10 fermented foods; how each is made; practical meal ideas; fermented vs pickled distinction; buying tips"
    },
    32: {
        "content_brief": "Write a recipe article with 3 high-fiber cauliflower rice recipes. First explain how to make cauliflower rice from scratch (food processor method, 2 min). Then: (1) Mexican Cauliflower Rice Bowl with black beans, corn, salsa, avocado (full recipe), (2) Asian Cauliflower Fried Rice with egg, peas, soy sauce, sesame oil (full recipe), (3) Mediterranean Cauliflower Rice with sun-dried tomatoes, olives, feta (full recipe). All with exact measurements. Compare nutrition: cauliflower rice (3.5g fiber/cup, 25 cal) vs white rice (0.6g fiber, 206 cal).",
        "target_words": 1200,
        "key_points": "DIY cauliflower rice method; 3 full recipes; nutritional comparison to white rice; exact measurements"
    },
    33: {
        "content_brief": "Write a nutrition comparison article: Oatmeal vs Grits. Compare side by side: fiber (oats 4g vs grits 1.5g per serving), calories, protein, vitamins, minerals, glycemic index. Explain what each is made from (whole oat groats vs dried corn). Cover different types: steel-cut vs rolled oats, stone-ground vs instant grits. Include a comparison table. When to choose each. Can you boost grits' fiber? (add chia, flax, vegetables). End with: both have a place, but for fiber oats win clearly.",
        "target_words": 1100,
        "key_points": "side-by-side comparison table; fiber per serving; types of each; how to boost grits fiber; balanced take"
    },
    34: {
        "content_brief": "Write a fun recipe article about healthy high-fiber popcorn toppings. Start with base: air-popped popcorn nutrition (3 cups = 3.5g fiber, 93 cal). Then 8 topping combos with exact measurements: (1) Everything Bagel, (2) Cinnamon Sugar, (3) Parmesan Garlic, (4) Chili Lime, (5) Ranch, (6) Dark Chocolate Drizzle, (7) Nutritional Yeast & Black Pepper, (8) Pumpkin Spice. Include air-popping instructions (stovetop and microwave). Why popcorn is a surprisingly good whole grain fiber source.",
        "target_words": 1000,
        "key_points": "8 topping combos with measurements; air-popping instructions; popcorn as whole grain; base nutrition info"
    },
    35: {
        "content_brief": "Write a meal prep guide for a full week of vegan high-fiber meals. Provide a complete 5-day plan (Mon-Fri, 3 meals each) with recipes or descriptions. Sunday prep session: cook lentils, bake sweet potatoes, prepare quinoa, chop vegetables, make 2 sauces (tahini dressing + peanut sauce). Show how components mix into different meals. Include daily fiber totals (aim for 30g+). Shopping list for the whole week. Budget estimate. Storage and reheating tips.",
        "target_words": 1500,
        "key_points": "5-day meal plan; Sunday prep session; component-based system; daily fiber totals; shopping list; budget angle"
    },
    36: {
        "content_brief": "Write a recipe article for Fiber-Rich Cabbage Soup. ONE main recipe: hearty cabbage soup with white beans, carrots, celery, onion, garlic, diced tomatoes, vegetable broth, Italian seasoning (exact measurements, 30 min simmer). Nutrition per serving (~180 cal, 8g fiber). Add 3 variations: Asian-Style (ginger, soy, sesame), Spicy Mexican (jalapeno, cumin, cilantro), Creamy (blend half, stir back in). Why cabbage soup is great for weight management (high volume, low calorie, high fiber). Freezing instructions.",
        "target_words": 1100,
        "key_points": "one main recipe; 3 variations; low calorie + high fiber angle; freezing instructions; nutrition info"
    },
    37: {
        "content_brief": "Write a recipe article with 5 chia pudding variations for breakfast. Base recipe: 3 tbsp chia seeds + 1 cup milk + sweetener, refrigerate overnight. Then 5 flavors: (1) Vanilla Berry, (2) Chocolate, (3) Mango Coconut, (4) Matcha, (5) PB&J. Each with exact add-in measurements. Chia nutrition spotlight (10g fiber per oz, omega-3s, protein). Tips: stir twice in first 30 min to prevent clumps, ideal consistency, best milk options. Make-ahead: lasts 4 days in fridge.",
        "target_words": 1100,
        "key_points": "one base recipe; 5 flavor variations; chia nutrition; anti-clump technique; make-ahead tips"
    },
    38: {
        "content_brief": "Write a practical nutrition guide to finding high-fiber options at fast food restaurants. Cover 8 major chains: Chipotle (brown rice + black beans bowl = 15g fiber), Subway (9-grain wheat + veggie sub), Taco Bell (bean burrito), Chick-fil-A (fruit cup, side salad), Wendy's (baked potato, chili), McDonald's (apple slices, oatmeal), Panera (lentil soup, whole grain bread), Sweetgreen. For each: best fiber choice with approximate fiber grams. Tips for boosting fiber at any restaurant. Realistic and non-judgmental tone.",
        "target_words": 1200,
        "key_points": "8 real chains with specific menu items; fiber grams per item; practical ordering tips; non-judgmental tone"
    },
    39: {
        "content_brief": "Write a recipe article for gut-friendly herbal teas. Feature 4 tea recipes with exact measurements: (1) Peppermint Ginger: fresh mint leaves + sliced ginger + hot water + honey, (2) Turmeric Golden Milk Tea: turmeric, cinnamon, black pepper, milk, (3) Chamomile Lemon: chamomile flowers/bags + lemon + honey, (4) Fennel Seed Tea: crushed fennel seeds + hot water. For each: brewing time, temperature, when to drink (after meals, before bed). Section on how warm liquids support digestion. Note: these are complementary to a fiber-rich diet.",
        "target_words": 1000,
        "key_points": "4 tea recipes with measurements; brewing instructions; when to drink each; warm liquids and digestion; complementary role"
    },
    40: {
        "content_brief": "Write a recipe article for high-fiber cauliflower pizza crust. ONE detailed crust recipe: riced cauliflower, mozzarella, egg, almond flour, Italian seasoning, garlic powder, salt (exact measurements). Step-by-step: rice cauliflower, squeeze out ALL moisture (key step), mix, shape, bake at 425F for 20 min. Add 3 topping combos: Margherita, BBQ Chicken, Veggie Supreme. Compare nutrition to regular pizza crust (fiber, carbs, calories per slice). The moisture-squeezing trick explained in detail.",
        "target_words": 1100,
        "key_points": "one detailed crust recipe; moisture removal technique; 3 topping combos; nutritional comparison to regular crust"
    },
    41: {
        "content_brief": "Write a recipe article for homemade high-fiber hummus. ONE main recipe: Classic Hummus with chickpeas, tahini, lemon juice, garlic, olive oil, cumin, salt, ice water (exact measurements, food processor method). Include the secret to ultra-smooth hummus (cook chickpeas with baking soda, or peel skins). Nutrition per serving (4g fiber, 170 cal per 1/4 cup). Add 5 flavor variations: Roasted Red Pepper, Garlic Herb, Spicy Sriracha, Beet, Avocado. Serving suggestions and storage (fridge 5 days).",
        "target_words": 1100,
        "key_points": "one main recipe; smooth texture secret; 5 flavor variations; nutrition per serving; serving suggestions"
    },
    42: {
        "content_brief": "Write a recipe article for high-fiber yogurt parfaits. ONE main recipe: layered parfait with Greek yogurt, homemade granola, mixed berries, chia seeds, honey drizzle (exact measurements and layering order). Add 4 variations: (1) Tropical (mango, coconut, macadamia), (2) Apple Pie (diced apple, cinnamon granola, walnuts), (3) Chocolate (cocoa yogurt, banana, almonds), (4) Savory (plain yogurt, cucumber, hemp seeds, everything seasoning). Fiber per parfait (~8g). Mason jar prep-ahead method for work.",
        "target_words": 1000,
        "key_points": "one main recipe with layering order; 4 variations including one savory; mason jar method; fiber per parfait"
    },
    43: {
        "content_brief": "Write a recipe article for Black Bean Brownies as a hidden fiber dessert. ONE detailed recipe: black beans (drained and rinsed), cocoa powder, eggs, maple syrup, vanilla, baking powder, salt, optional chocolate chips (exact measurements). Food processor method. Bake 350F for 20-25 min. Emphasize: you CANNOT taste the beans. Nutrition per brownie (12 brownies per batch: ~130 cal, 4g fiber, 5g protein). Texture tips (fudgy center, don't overbake). Compare to regular brownies. Allergy note: naturally gluten-free.",
        "target_words": 1000,
        "key_points": "one detailed recipe; can't-taste-the-beans emphasis; per-brownie nutrition; texture tips; GF naturally"
    },
    44: {
        "content_brief": "Write a recipe article featuring 3 high-fiber artichoke recipes. Start with artichoke nutrition spotlight (one medium artichoke = 10g fiber - one of the highest fiber vegetables). Recipes: (1) Roasted Artichoke Hearts with Lemon Garlic Butter (full recipe, oven 400F), (2) Spinach Artichoke Stuffed Portobello Mushrooms (full recipe), (3) Artichoke & White Bean Salad (full recipe, no-cook). How to prep fresh artichokes vs using canned/frozen (time-saving tips).",
        "target_words": 1100,
        "key_points": "artichoke as fiber champion (10g); 3 full recipes; fresh vs canned/frozen; nutrition spotlight"
    },
    45: {
        "content_brief": "Write a fun nutrition comparison: Popcorn vs Potato Chips. Compare per standard serving: popcorn (3 cups air-popped: 93 cal, 3.5g fiber, 1g fat) vs chips (1 oz/15 chips: 152 cal, 1g fiber, 10g fat). Cover: fiber, calories, fat, sodium, volume (you get way more popcorn). Include a comparison table. Why popcorn is a whole grain. Best and worst ways to eat popcorn (air-popped best, movie theater worst). The volume advantage: 3 cups vs 15 chips for similar satisfaction.",
        "target_words": 1000,
        "key_points": "side-by-side comparison table; volume advantage; popcorn as whole grain; best vs worst popcorn preparation"
    },
    46: {
        "content_brief": "Write a recipe article for high-fiber Split Pea Soup. ONE main recipe: classic split pea soup with green split peas, carrots, celery, onion, garlic, vegetable broth, bay leaf, thyme (exact measurements, stovetop 45 min or Instant Pot 15 min). Nutrition per serving (~250 cal, 16g fiber - one of the highest fiber soups possible). Add a smoky variation (smoked paprika + liquid smoke instead of ham). Topping ideas: croutons, yogurt swirl, fresh dill. Make-ahead and freezing instructions (freezes 3 months).",
        "target_words": 1100,
        "key_points": "one main recipe with stovetop + Instant Pot options; extremely high fiber highlight; smoky variation; freezing instructions"
    },
    47: {
        "content_brief": "Write a nutrition comparison article: Whole Wheat vs White Pasta. Compare per serving: fiber (whole wheat 6g vs white 2.5g), calories, protein, B vitamins, glycemic index. Explain what's removed in white pasta (bran and germ). Cooking differences (whole wheat needs 1-2 min more, slightly nuttier taste). Taste transition tips for picky eaters (start with 50/50 blend). Include comparison table. Mention high-fiber alternatives (chickpea, lentil) as a bonus. Balanced tone - white pasta isn't 'bad'.",
        "target_words": 1000,
        "key_points": "side-by-side comparison; what's removed in processing; cooking tips; 50/50 transition trick; balanced non-judgmental tone"
    },
    48: {
        "content_brief": "Write a nutrition article about the relationship between water and fiber. Explain why fiber needs water to work properly (soluble fiber absorbs water to form gel, insoluble needs water for bulk). The golden rule: for every 5g of extra fiber, drink an extra 8 oz of water. Symptoms of high fiber without enough water (bloating, constipation - the opposite of what you want). Daily water targets by fiber intake level. Practical hydration tips: infused water ideas, timing with meals, tracking methods. Keep it simple and actionable.",
        "target_words": 1000,
        "key_points": "fiber + water mechanism; 5g/8oz rule; symptoms without water; daily targets; practical hydration tips"
    },
    49: {
        "content_brief": "Write a recipe article for 4 homemade high-fiber salad dressings. Each with exact measurements: (1) Lemon Tahini (tahini, lemon juice, garlic, water, salt - adds 1g fiber per tbsp from tahini), (2) Avocado Cilantro Lime (avocado, cilantro, lime, yogurt), (3) White Bean Caesar (white beans, lemon, Dijon, garlic, olive oil - fiber from beans), (4) Hummus Vinaigrette (hummus thinned with olive oil and red wine vinegar). Why homemade dressings can add fiber vs store-bought (zero fiber). Shelf life for each.",
        "target_words": 1000,
        "key_points": "4 dressings with exact measurements; fiber content per serving; homemade vs store-bought advantage; storage life"
    },
    50: {
        "content_brief": "Write a recipe article for Tabbouleh Salad made with bulgur wheat. ONE main recipe: traditional tabbouleh with bulgur, flat-leaf parsley (lots), tomatoes, cucumber, green onion, lemon juice, olive oil, salt, mint (exact measurements). Explain bulgur preparation (soak in hot water 20 min, no cooking needed). Nutrition per serving (~200 cal, 8g fiber). Bulgur spotlight: highest fiber grain (8g per cup cooked). Add a quinoa variation for gluten-free option. Serving suggestions: with pita, as lettuce wraps, alongside grilled protein.",
        "target_words": 1000,
        "key_points": "one traditional recipe; bulgur preparation method; bulgur as top fiber grain; GF quinoa variation; serving ideas"
    },
    51: {
        "content_brief": "Write a recipe article for a Pear & Walnut Salad. ONE main recipe: sliced pears, mixed greens, toasted walnuts, crumbled blue cheese (or goat cheese), dried cranberries, balsamic vinaigrette (exact measurements). Pear nutrition spotlight: one medium pear = 5.5g fiber (eat with skin!). Add 2 variations: Asian Pear Salad (sesame dressing, almonds), Autumn Pear Salad (maple dressing, pecans, pomegranate). Tips on choosing ripe pears. Why pears are an underrated fiber fruit.",
        "target_words": 1000,
        "key_points": "one main recipe; pear nutrition spotlight; eat with skin tip; 2 variations; underrated fiber fruit angle"
    },
    52: {
        "content_brief": "Write a recipe article for High Fiber Bran Muffins That Actually Taste Good. ONE main recipe: wheat bran, whole wheat flour, buttermilk, egg, brown sugar, molasses, oil, baking soda, cinnamon, raisins (exact measurements). Bake 375F for 18-20 min, makes 12 muffins. Nutrition per muffin (~180 cal, 5g fiber). The secrets to moist bran muffins: buttermilk, molasses, don't overmix, let batter rest 10 min. Add 3 mix-in variations: Blueberry, Apple Walnut, Banana Chocolate Chip. Freezer-friendly (freeze 2 months).",
        "target_words": 1100,
        "key_points": "one main recipe; moisture secrets; per-muffin nutrition; 3 mix-in variations; freezer-friendly"
    },
    53: {
        "content_brief": "Write a recipe article for a Quick High-Fiber Vegetable Stir-Fry. ONE main recipe: broccoli, snap peas, bell pepper, carrots, edamame, garlic, ginger, soy sauce, sesame oil, served over brown rice (exact measurements, 15 min cook time). Stir-fry technique tips: high heat, don't overcrowd pan, cook in batches, add sauce last. Nutrition per serving (~320 cal, 10g fiber with rice). Add 2 variations: Thai Peanut Stir-Fry, Teriyaki Stir-Fry. Why stir-frying retains more fiber than boiling vegetables.",
        "target_words": 1000,
        "key_points": "one main recipe; stir-fry technique; 2 variations; fiber retention in cooking; served over brown rice"
    },
    54: {
        "content_brief": "Write a recipe article for a High-Fiber Burrito Bowl Meal Prep. ONE main recipe: cilantro lime brown rice, seasoned black beans, fajita vegetables (bell pepper, onion), corn, avocado, salsa, Greek yogurt drizzle (exact measurements, serves 4). Step-by-step meal prep assembly. Nutrition per bowl (~450 cal, 14g fiber). Store: components separate, assemble when eating, lasts 4 days. Add a chicken version and a tofu version. Compare to Chipotle (similar fiber, half the sodium). Lunch or dinner versatility.",
        "target_words": 1200,
        "key_points": "one main recipe; meal prep assembly method; nutrition per bowl; separate storage tip; Chipotle comparison"
    },
    55: {
        "content_brief": "Write a short, fun recipe/snack article about apple slices with peanut butter as the perfect high-fiber snack. Nutrition breakdown: 1 medium apple (4.4g fiber) + 2 tbsp peanut butter (1.6g fiber) = 6g fiber, ~290 cal. Why this combo works: fiber + protein + healthy fat = sustained energy. 5 creative upgrades: (1) add granola, (2) drizzle honey + cinnamon, (3) top with chia seeds, (4) use almond butter + dark chocolate chips, (5) spread on apple rounds like 'cookies'. Best apple varieties for pairing (Honeycrisp, Granny Smith, Fuji). Quick after-school or work snack.",
        "target_words": 800,
        "key_points": "nutrition breakdown of combo; why it works; 5 creative upgrades; best apple varieties; quick and simple"
    },
    56: {
        "content_brief": "Write a recipe article for High-Fiber Lentil Curry. ONE main recipe: Red Lentil Coconut Curry with red lentils, coconut milk, onion, garlic, ginger, tomato paste, curry powder, turmeric, cumin, spinach (exact measurements, 30 min one-pot). Served over brown rice or with naan. Nutrition per serving (~380 cal, 12g fiber, 15g protein). Lentil types explained: red (fastest, creamy), green (hold shape), brown (earthy). Add a variation: Yellow Dal with Spinach. Make-ahead: tastes better next day. Freezes 3 months.",
        "target_words": 1200,
        "key_points": "one main one-pot recipe; lentil types guide; nutrition info; dal variation; make-ahead and freezing tips"
    },
    57: {
        "content_brief": "Write a recipe article for High-Fiber Whole Wheat Waffles. ONE main recipe: whole wheat flour, oat flour, flaxseed meal, milk, egg, maple syrup, butter, baking powder, vanilla, cinnamon (exact measurements, makes 6 waffles). Waffle iron instructions. Nutrition per waffle (~220 cal, 5g fiber). Crispy waffle tips: don't open too early, let steam escape, slightly underfill iron. Add 3 topping combos: Berry Compote, Banana PB, Yogurt & Granola. Freezer method: freeze individually, toast from frozen. Weekend breakfast that meal preps.",
        "target_words": 1000,
        "key_points": "one main recipe; crispy waffle technique; per-waffle nutrition; 3 toppings; freeze-and-toast method"
    },
    58: {
        "content_brief": "Write a nutrition article about pumpkin seeds (pepitas) as a high-fiber snack. Nutrition per 1 oz: 5g fiber, 7g protein, 13g fat (healthy), 126 cal, plus magnesium, zinc, iron. Raw vs roasted comparison. How to roast at home (375F, 15 min, toss with olive oil and salt). 5 ways to use pumpkin seeds: snack, salad topper, smoothie add-in, soup garnish, trail mix. Buying tips: hulled (green pepitas) vs unhulled (white shells). Storage: airtight container, cool dry place, 3 months.",
        "target_words": 1000,
        "key_points": "nutrition per oz; raw vs roasted; home roasting method; 5 usage ideas; hulled vs unhulled; storage"
    },
    59: {
        "content_brief": "Write a recipe article for Homemade High-Fiber Chia Seed Raspberry Jam. ONE main recipe: fresh or frozen raspberries, chia seeds, maple syrup, lemon juice (exact measurements - just 4 ingredients!). Stovetop method: 10 min total. How chia seeds create jam texture without pectin. Nutrition per tablespoon (~20 cal, 1.5g fiber). Compare to store-bought jam (sugar + no fiber). Add 2 variations: Strawberry Chia Jam, Mixed Berry Chia Jam. Storage: fridge 2 weeks, freezer 3 months. Use ideas: toast, yogurt, oatmeal, PB&J.",
        "target_words": 900,
        "key_points": "4-ingredient recipe; chia as pectin replacement; per-tbsp nutrition; store-bought comparison; 2 variations"
    },
    60: {
        "content_brief": "Write a snack-focused article about edamame as a high-fiber superfood snack. Nutrition per cup (shelled): 8g fiber, 17g protein, 188 cal. How to prepare: boil frozen 5 min or microwave 3 min, sprinkle with sea salt. 5 seasoning ideas: (1) Garlic Parmesan, (2) Chili Lime, (3) Everything Bagel, (4) Sesame Ginger, (5) Spicy Sriracha. Fresh vs frozen (frozen is just as nutritious). Why edamame is unique: one of the only complete plant proteins. Great for: snack, appetizer, salad topper, lunch box addition.",
        "target_words": 900,
        "key_points": "nutrition per cup; cooking methods; 5 seasonings; complete protein fact; fresh vs frozen"
    },
    61: {
        "content_brief": "Write a recipe article for High-Fiber Barley Soup. ONE main recipe: Mushroom Barley Soup with pearl barley, mixed mushrooms, carrots, celery, onion, garlic, vegetable broth, thyme, bay leaf (exact measurements, 45 min simmer). Nutrition per serving (~280 cal, 10g fiber). Barley spotlight: 6g fiber per cup cooked, also high in beta-glucan (heart-friendly). Pearl vs hulled barley explained. Add a variation: Beef & Barley Soup. Make-ahead tip: soup thickens overnight, add broth when reheating. Freezes well (3 months).",
        "target_words": 1100,
        "key_points": "one main recipe; barley nutrition spotlight; pearl vs hulled; variation; make-ahead and freezing"
    },
    62: {
        "content_brief": "Write a recipe article featuring 3 high-fiber coconut flour recipes. Explain coconut flour basics: extremely absorbent (use 1/4 the amount of regular flour), high fiber (5g per 2 tbsp), grain-free and gluten-free. Recipes: (1) Coconut Flour Pancakes (exact recipe, makes 6), (2) Coconut Flour Banana Bread (exact recipe, 350F), (3) Coconut Flour Crackers (exact recipe, crispy). Key baking tip: always use more eggs with coconut flour (it absorbs a lot). Per-serving nutrition for each recipe.",
        "target_words": 1100,
        "key_points": "coconut flour basics and absorption rule; 3 full recipes; extra eggs tip; per-serving nutrition; GF angle"
    },
    63: {
        "content_brief": "Write a recipe article about using broccoli stalks (zero-waste, high-fiber). Explain that stalks have the same fiber and nutrients as florets - most people throw them away. How to prep: peel tough outer layer, reveal tender core. 4 recipes: (1) Broccoli Stalk Slaw (shredded, mayo-free dressing), (2) Broccoli Stalk Fries (oven-baked, 425F), (3) Broccoli Stalk Soup (blended, creamy without cream), (4) Stalk Stir-Fry Strips. Exact measurements for each. Food waste angle: Americans waste 30-40% of food. Feel-good sustainability message.",
        "target_words": 1100,
        "key_points": "zero-waste angle; stalk prep technique; 4 recipes; stalk vs floret nutrition equality; food waste statistics"
    },
    64: {
        "content_brief": "Write a nutrition article about figs as a high-fiber food. Compare fresh vs dried: fresh (1.4g fiber per fig, 30 cal) vs dried (1.5g fiber per fig, 47 cal). Nutrition spotlight: calcium, potassium, magnesium. How to eat fresh figs (ripe when soft, eat whole including skin). How to eat dried figs (snack, oatmeal, baking). 3 quick recipe ideas: fig & goat cheese crostini, fig oatmeal, fig energy balls. Seasonal availability: fresh figs June-September. Buying and storing tips.",
        "target_words": 1000,
        "key_points": "fresh vs dried comparison; nutrition spotlight; how to eat each; 3 recipe ideas; seasonality; storage"
    },
    65: {
        "content_brief": "Write a recipe article for Keto High-Fiber Granola. ONE main recipe: unsweetened coconut flakes, almonds, pecans, pumpkin seeds, sunflower seeds, chia seeds, cinnamon, coconut oil, sugar-free sweetener (exact measurements). Bake 300F for 20-25 min, stir halfway. Nutrition per 1/3 cup: ~200 cal, 4g net carbs, 5g fiber, 16g fat. Why regular granola is a keto trap (30g+ carbs per serving). Storage: airtight jar, 2 weeks room temp. Serving: with unsweetened almond milk, over yogurt, as snack.",
        "target_words": 1000,
        "key_points": "one detailed recipe; per-serving macros with net carbs; why regular granola fails keto; low bake temp tip; storage"
    },
    66: {
        "content_brief": "Write a recipe article with 5 high-fiber side dishes for steak dinner. Each with full recipe: (1) Roasted Brussels Sprouts with Balsamic (400F, 20 min), (2) Garlic Sauteed Broccoli with Lemon, (3) Sweet Potato Wedges (425F, 25 min), (4) Grilled Asparagus with Parmesan, (5) Black Bean & Corn Salad. Fiber per serving for each. Why pairing steak with high-fiber sides matters (meat has zero fiber). Quick enough for weeknight dinner. All recipes under 15 min active prep time.",
        "target_words": 1100,
        "key_points": "5 full side recipes; fiber per serving each; meat has zero fiber point; all quick prep; temperatures included"
    },
    67: {
        "content_brief": "Write a recipe article for a High-Fiber Fruit Salad. ONE main recipe: raspberries, pear (with skin), apple (with skin), kiwi, orange segments, blueberries, pomegranate seeds, honey-lime-mint dressing (exact measurements). Total fiber per serving (~8g). Rank the fruits by fiber content. Tips: cut fruit right before serving, toss with citrus to prevent browning. Add 2 seasonal variations: Summer (stone fruits, berries) and Winter (citrus, pomegranate, persimmon). Why fruit salad beats fruit juice for fiber (juice removes all fiber).",
        "target_words": 1000,
        "key_points": "one main recipe; fruits ranked by fiber; anti-browning tips; 2 seasonal variations; whole fruit vs juice"
    },
    68: {
        "content_brief": "Write a nutrition comparison: Bulgur Wheat vs Rice. Compare per cup cooked: bulgur (8g fiber, 151 cal, 6g protein) vs brown rice (3.5g fiber, 216 cal, 5g protein) vs white rice (0.6g fiber, 206 cal). Bulgur wins on fiber by 2x. Explain what bulgur is (cracked wheat, partially pre-cooked). How to cook (just soak in hot water 20 min). Include comparison table. Best uses for each grain. 2 quick bulgur recipes: tabbouleh, pilaf. Note: bulgur contains gluten. Balanced tone - all grains have their place.",
        "target_words": 1000,
        "key_points": "three-way comparison table; bulgur preparation ease; 2 quick recipes; gluten note; balanced tone"
    },
    69: {
        "content_brief": "Write a practical article with 5 high-fiber sandwich ideas for work lunch. Each with exact ingredients: (1) Whole Wheat Hummus Veggie Wrap (hummus, spinach, cucumber, bell pepper, shredded carrot), (2) Black Bean & Avocado on Whole Grain (mashed black beans, avocado, tomato, onion), (3) PB & Banana on Whole Wheat (peanut butter, banana, chia seeds, honey), (4) Chickpea 'Tuna' Salad Sandwich, (5) Turkey & Apple on Whole Grain with Spinach. Fiber per sandwich. Pack-ahead tips: which hold up overnight, which need morning assembly.",
        "target_words": 1100,
        "key_points": "5 sandwiches with exact ingredients; fiber per sandwich; pack-ahead viability; work lunch practical focus"
    },
    70: {
        "content_brief": "Write a nutrition guide reviewing the best high-fiber breakfast cereals available in 2026. Evaluate 8-10 real cereal brands/types by fiber per serving: Fiber One (~14g), All-Bran (~10g), shredded wheat (~6g), Grape Nuts (~7g), oat-based cereals (~4g), and regular cereals as baseline (~1g). What to look for on labels: fiber grams, added sugar (under 6g), whole grain first ingredient. Warning signs: 'fiber added' (isolated fibers like inulin aren't the same). Include a ranking table. Budget picks vs premium picks.",
        "target_words": 1100,
        "key_points": "8-10 real cereals ranked; fiber per serving; label reading guide; added vs natural fiber warning; ranking table"
    },
    71: {
        "content_brief": "Write a nutrition spotlight article on guava as a high-fiber superfruit. Nutrition per fruit: 3g fiber (one of the highest fiber fruits per serving), 37 cal, 4x more vitamin C than an orange. How to eat guava: ripe when slightly soft, eat whole including seeds and skin. Different varieties: pink, white, strawberry guava. 3 recipe ideas: guava smoothie, guava salsa, guava paste with cheese. Where to buy (tropical grocery stores, international markets, some Walmart/Target). Seasonal availability and storage tips.",
        "target_words": 900,
        "key_points": "nutrition per fruit; vitamin C comparison; how to eat whole; varieties; 3 recipe ideas; where to buy"
    },
    72: {
        "content_brief": "Write a recipe article for Roasted Root Vegetables as a high-fiber side dish. ONE main recipe: carrots, parsnips, sweet potato, beets, turnips, olive oil, rosemary, thyme, garlic, salt, pepper (exact measurements). Roast 425F for 35-40 min, toss halfway. Why roasting caramelizes and enhances flavor. Nutrition per serving (~200 cal, 7g fiber). Root vegetable fiber comparison chart. Add 2 seasoning variations: Maple Balsamic, Moroccan Spiced (cumin, cinnamon, harissa). Meal prep: roast Sunday, use all week in bowls, salads, wraps.",
        "target_words": 1100,
        "key_points": "one main recipe; roasting technique; root vegetable fiber chart; 2 seasoning variations; meal prep angle"
    },
    73: {
        "content_brief": "Write a fun nutrition guide to high-fiber options in Indian cuisine. Cover 10+ naturally high-fiber Indian dishes: dal (lentil soup), chana masala (chickpea curry), rajma (kidney bean curry), palak paneer (spinach), aloo gobi (potato cauliflower), bhindi masala (okra), roti/chapati (whole wheat flatbread), brown rice biryani, sambar, idli. Fiber per serving for each. Why Indian cuisine is naturally fiber-rich (legume-heavy, whole grains, lots of vegetables). Tips for ordering at Indian restaurants. Approachable tone for non-Indian readers.",
        "target_words": 1200,
        "key_points": "10+ Indian dishes with fiber counts; why Indian food is naturally high-fiber; restaurant ordering tips; approachable tone"
    },
    74: {
        "content_brief": "Write a nutrition article about sunflower seeds benefits. Nutrition per 1 oz: 3g fiber, 5.5g protein, 14g fat (mostly polyunsaturated), 164 cal, plus vitamin E (47% DV), selenium, magnesium. Raw vs roasted comparison. Shell-on vs shelled. 5 ways to use: snack, salad topper, sunflower seed butter, baking ingredient, homemade trail mix. How sunflower seeds support skin health (vitamin E) and gut health (fiber + healthy fats). Buying tips: unsalted for cooking, salted for snacking. Storage: airtight, fridge for longer freshness.",
        "target_words": 1000,
        "key_points": "nutrition per oz with vitamin E highlight; raw vs roasted; 5 uses; skin + gut angle; buying and storage"
    },
    75: {
        "content_brief": "Write a recipe article for High-Fiber Baked Potato Toppings. Base: one large baked potato (4g fiber, bake 400F for 60 min or microwave 8-10 min). 6 loaded topping combos with exact measurements: (1) Classic Broccoli Cheddar, (2) Black Bean Southwest, (3) Chili Loaded, (4) Mediterranean (hummus, cucumber, tomato, feta), (5) BBQ Chicken, (6) Breakfast Potato (egg, cheese, spinach). Nutrition per loaded potato. Tips: eat the skin (that's where the fiber is!). Why baked potato is an underrated meal base.",
        "target_words": 1100,
        "key_points": "base baking method; 6 topping combos; eat-the-skin tip; nutrition per combo; potato as underrated meal"
    },
    76: {
        "content_brief": "Write a fun nutrition article about dark chocolate and fiber. Surprise fact: 1 oz dark chocolate (70-85% cacao) has 3.1g fiber. Compare cacao percentages: 70% (~3g fiber) vs 85% (~4g fiber) vs milk chocolate (~1g). Other dark chocolate benefits: antioxidants, iron, magnesium. Recommended portion: 1-1.5 oz per day. How to choose quality dark chocolate (cacao first ingredient, minimal sugar). 3 ways to add dark chocolate to fiber-rich foods: oatmeal, trail mix, dipped fruit. This is not a license to binge - portion matters!",
        "target_words": 900,
        "key_points": "surprise fiber content; cacao percentage comparison; recommended portion; quality choosing tips; 3 food pairings"
    },
    77: {
        "content_brief": "Write a short nutrition comparison: Raspberry vs Strawberry fiber content. Raspberries (8g fiber per cup, 64 cal) vs strawberries (3g fiber per cup, 49 cal). Raspberries have nearly 3x the fiber! Why: raspberry seeds contain significant fiber. Other nutritional comparisons: vitamin C, antioxidants, sugar content. Best uses for each in high-fiber eating. Fresh vs frozen (frozen is equally nutritious and cheaper). 3 ways to eat more of each: smoothies, oatmeal topping, yogurt parfait. Both are great - but if fiber is your goal, raspberries win.",
        "target_words": 900,
        "key_points": "clear fiber comparison; why raspberries win (seeds); fresh vs frozen; 3 usage ideas; both are good message"
    },
    78: {
        "content_brief": "Write a fun nutrition guide to finding fiber in Japanese food. Honest opener: traditional Japanese food isn't always high in fiber (white rice, sashimi = 0 fiber). But smart choices exist: edamame (8g fiber/cup), seaweed salad (5g), miso soup (2g), brown rice sushi (swap for free at many restaurants), vegetable tempura, soba noodles (buckwheat = more fiber than udon), hijiki seaweed, natto (if adventurous). How to order a high-fiber Japanese meal: start with edamame + miso, swap to brown rice, add seaweed salad. Fun, realistic tone.",
        "target_words": 1000,
        "key_points": "honest about low-fiber defaults; smart swaps; specific fiber counts; ordering strategy; fun realistic tone"
    },
    79: {
        "content_brief": "Write a recipe article for a High-Fiber Breakfast Burrito. ONE main recipe: whole wheat tortilla, scrambled eggs, black beans, sauteed bell peppers and onions, avocado, salsa, shredded cheese (exact measurements). Cook method: 10 min total. Nutrition per burrito (~420 cal, 12g fiber). Meal prep freezer version: wrap in foil, freeze up to 1 month, reheat from frozen in oven 20 min or microwave 2 min. Add 2 variations: Veggie (tofu scramble), Meat Lover (turkey sausage). Best grab-and-go breakfast for busy mornings.",
        "target_words": 1000,
        "key_points": "one main recipe; freezer prep method with reheat instructions; nutrition per burrito; 2 variations; grab-and-go angle"
    },
    80: {
        "content_brief": "Write a nutrition spotlight on dragon fruit for digestion. Nutrition per cup: 5.6g fiber, 136 cal, rich in vitamin C, magnesium, prebiotics (oligosaccharides that feed gut bacteria). Types: white flesh (milder) vs pink/red flesh (sweeter). How to eat: cut in half, scoop with spoon, or peel and cube. How to pick ripe dragon fruit (bright color, slight give). 3 recipe ideas: dragon fruit smoothie bowl, dragon fruit salad, dragon fruit agua fresca. Where to buy: most grocery stores now carry them. Impressive but approachable.",
        "target_words": 900,
        "key_points": "nutrition with prebiotic highlight; white vs pink varieties; how to eat/pick; 3 recipe ideas; where to buy"
    },
    81: {
        "content_brief": "Write a recipe article for High-Fiber Coleslaw Without Mayo. ONE main recipe: shredded green and red cabbage, carrots, apple, green onions, dressed with apple cider vinegar, olive oil, Dijon mustard, honey, celery seeds, salt, pepper (exact measurements). Nutrition per serving (~120 cal, 4g fiber, very low fat vs traditional coleslaw ~300 cal). Why this version is better: no heavy mayo, more fiber from apple addition, lighter and crunchier. Add an Asian variation (rice vinegar, sesame oil, ginger). Make-ahead: gets better after 2 hours, keeps 4 days.",
        "target_words": 1000,
        "key_points": "one main recipe; nutrition comparison to traditional coleslaw; no-mayo advantage; Asian variation; make-ahead"
    },
    82: {
        "content_brief": "Write a practical nutrition article about tracking daily fiber and water intake. Why tracking matters: most people vastly overestimate their fiber intake (average American eats 15g, needs 25-30g). Simple tracking methods: (1) pen-and-paper food journal, (2) free apps (MyFitnessPal, Cronometer), (3) weekly planning approach. Include a sample daily tracking log layout. The fiber-water connection: pair tracking together (aim for 8 cups water per 25g fiber). 7-day starter challenge: track fiber for one week, see where you actually stand. Encouraging, not obsessive tone.",
        "target_words": 1000,
        "key_points": "why tracking matters (overestimation stat); 3 tracking methods; sample log layout; fiber-water pairing; 7-day challenge; encouraging tone"
    }
}

# Load pins
with open('dlh-fresh/pipeline-data/pins.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Add briefs
missing = 0
for pin in data:
    pid = pin['pin_id']
    if pid in briefs:
        pin['content_brief'] = briefs[pid]['content_brief']
        pin['target_words'] = briefs[pid]['target_words']
        pin['key_points'] = briefs[pid]['key_points']
    else:
        print(f'WARNING: No brief for pin {pid}: {pin["pin_title"]}')
        missing += 1

# Save JSON
with open('dlh-fresh/pipeline-data/pins.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

# Save CSV
headers = ['pin_id', 'pin_title', 'description', 'hashtags', 'alt_text', 'board', 'affiliate_link', 'date', 'category', 'slug', 'variant', 'image_filename', 'site_url', 'status', 'content_brief', 'target_words', 'key_points']
with open('dlh-fresh/pipeline-data/pins.csv', 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=headers)
    writer.writeheader()
    writer.writerows(data)

print(f'Done! Added briefs to all {len(data)} pins')
if missing:
    print(f'WARNING: {missing} pins missing briefs!')
else:
    print('All pins have briefs!')
print(f'New columns: content_brief, target_words, key_points')
print(f'Total columns: {len(headers)}')

# Stats
word_counts = [briefs[pid]['target_words'] for pid in briefs]
print(f'\nTarget words range: {min(word_counts)}-{max(word_counts)}')
print(f'Total target words: {sum(word_counts):,}')
print(f'Average per article: {sum(word_counts)//len(word_counts)}')
