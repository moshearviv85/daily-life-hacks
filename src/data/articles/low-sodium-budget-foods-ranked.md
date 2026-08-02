---
title: "Low Sodium on a Budget: 56 Cheap Staples, Measured"
excerpt: "We put sodium numbers on every food in our audited price basket. The cheapest foods turned out to be the lowest in sodium, and five processed items carry almost the whole load."
category: "nutrition"
tags: ["low sodium foods", "sodium in canned beans", "low sodium on a budget", "how much sodium in bread", "grocery data"]
cluster: "weekly-budget-shopping"
parentPillar: "eat-healthy-on-a-budget-complete-playbook"
image: "/images/sodium-per-dollar-cheapest-staples-chart.jpg"
imageAlt: "Bar chart of ten budget staples ranked by sodium, from whole wheat flour at 2 mg to dry pinto beans at 12 mg per 100 grams"
quickAnswer: "Across 56 budget staples priced on one consistent grocery basis, 26 contain under 10 mg of sodium per 100 g and 48 contain under 150 mg. The cheapest foods in the basket are also the lowest: whole wheat flour (2 mg per 100 g), oat bran (4), extra firm tofu (4), dry black beans, split peas, navy beans, brown rice and quinoa (5 each), and rolled oats (6). Five processed items carry most of the sodium in the whole basket: bacon (751 mg per 100 g), part-skim mozzarella (666), cheddar (653), commercially prepared whole wheat bread (455) and canned pink salmon (403). All values are USDA FoodData Central figures per 100 g as purchased."
date: 2026-08-02
author: "David Miller"
faq:
  - question: "What are the lowest sodium foods you can buy on a budget?"
    answer: "Dry goods and fresh produce, and they're cheap. In our 56-food audited basket the lowest are whole wheat flour at 2 mg of sodium per 100 g, oat bran and extra firm tofu at 4 mg, dry black beans, green split peas, navy beans, brown rice, quinoa and russet potatoes at 5 mg, and rolled oats and dry brown lentils at 6 mg. Fresh berries, bananas and pears all sit at 1 mg. These are USDA FoodData Central values for the food as purchased."
  - question: "How much sodium is in canned beans compared to dried beans?"
    answer: "About 59 times more, before you drain them. The USDA record for canned kidney beans (total can contents) is 296 mg of sodium per 100 g. Dry black beans are 5 mg per 100 g and dry pinto beans 12 mg. Draining and rinsing the can removes a meaningful share of that sodium, because much of it sits in the packing liquid, but the USDA figure used here is the undrained number so it represents the worst case rather than what ends up on your plate."
  - question: "Is whole wheat bread high in sodium?"
    answer: "Compared to the flour it's made from, yes. USDA lists commercially prepared whole wheat bread at 455 mg of sodium per 100 g, while whole-grain wheat flour is 2 mg per 100 g. That's roughly 228 times more, and none of it comes from the wheat. A 28 g slice works out to about 127 mg. Bread is also the second highest sodium item per grocery dollar in our basket, at about 1,311 mg per dollar spent."
  - question: "Does eating cheaply mean eating more salt?"
    answer: "Not in this dataset. The foods that top our fiber per dollar and protein per dollar rankings (dry beans, whole wheat flour, oats, rice, lentils, tofu) are the same foods sitting at the bottom of the sodium list, between 2 and 12 mg per 100 g. The sodium arrives with processing, not with cheapness. The catch is that the cheap low-sodium list is mostly things you have to cook."
  - question: "Where does the sodium in a grocery basket actually come from?"
    answer: "A handful of items. Of the 56 foods we measured, 48 come in under 150 mg of sodium per 100 g and 26 come in under 10 mg. Only five clear 400 mg: bacon, part-skim mozzarella, cheddar, commercially prepared whole wheat bread and canned pink salmon. Cured meat, cheese, commercial bread and canned fish are doing most of the work."
---

Here's a thing I assumed for years and never checked: that eating cheap meant eating salty. Ramen, canned soup, boxed everything. Cheap food is salty food, right? That's the whole cliche.

So I put sodium numbers on all 56 foods in our audited price basket, and the cliche fell apart in about four minutes. The foods that win our [fiber per dollar](/fiber-per-dollar-cheapest-high-fiber-foods/) and [protein per dollar](/protein-per-dollar-cheapest-protein-sources/) rankings are the same foods sitting at the very bottom of the sodium list. Whole wheat flour, the cheapest fiber in the entire study at 78 grams per dollar, contains 2 mg of sodium per 100 g. Dry split peas: 5 mg. Extra firm tofu: 4 mg.

The salt shows up somewhere else entirely, and once you see where, the grocery aisle reads differently.

## Which cheap foods are lowest in sodium?

Twenty-six of the 56 foods come in under 10 mg of sodium per 100 g. Forty-eight come in under 150. Here are the ten cheapest-per-nutrient staples in the basket, all of them essentially sodium-free:

![Bar chart of ten budget staples ranked by sodium, from whole wheat flour at 2 mg to dry pinto beans at 12 mg per 100 grams](/images/sodium-per-dollar-cheapest-staples-chart.jpg)

That's the shopping list. It's also, almost word for word, the shopping list from the fiber study and the protein study. Nobody had to trade anything away.

The fresh produce in the basket is even lower. Raspberries, blackberries, blueberries, strawberries, bananas, pears and almonds all sit at 1 mg per 100 g. Russet potatoes with the skin on: 5 mg. Prunes: 2 mg.

## How we measured this

No new grocery prices were collected, and that's deliberate. Every food here was already priced and audited for the two parent studies, so the cost side of this study inherits that audit instead of adding a fresh layer of numbers nobody has checked.

What's new is one nutrient. Sodium comes from the exact same [USDA FoodData Central](https://fdc.nal.usda.gov/) record the parent CSV already cites for that food, pulled fresh on August 2, 2026.

Three rules kept it honest:

* **Only exact USDA matches qualified.** The parent studies label each row as an exact match, a close proxy, or unresolved. A proxy is fine for estimating fiber in a bag of frozen broccoli. It is not fine for attributing a specific sodium number to a specific USDA record. That's why 56 foods made it in out of 102 parent rows, and why the [full CSV](/data/sodium-per-dollar-2026.csv) carries the source record ID for every single line.
* **Everything is per 100 g as purchased.** Dry beans are weighed dry, the same basis the price uses. Cook them and they roughly triple in weight, so 100 g of cooked beans holds about a third of the sodium listed here. Comparing a dry number to a cooked number is the single easiest way to get this wrong.
* **The audit was a second pull, not a vibe check.** Today's live USDA pull also returned fiber and protein for all 56 foods. All 74 of those values reproduced the numbers audited into the repo CSVs last month, to the decimal, with zero mismatches. That confirms every record identity, which means the sodium value attached to each one came from the food we think it did.

The [FDA's Daily Value for sodium is 2,300 mg](https://www.fda.gov/food/nutrition-education-resources-materials/sodium-your-diet), and it's a labeling reference used on the Nutrition Facts panel, not a personal target handed to you by anyone who knows your situation. This study measures what's in the food. What you do with that is between you and someone who actually knows your medical history.

*Data pulled and verified August 2, 2026. Prices re-checked at each quarterly re-audit; next: October 2026.*

## Sodium is a processing story, not a food story

This is the chart that changed how I shop.

![Bar chart pairing three raw ingredients with their processed versions: whole wheat flour 2 mg versus whole wheat bread 455 mg, pork loin 48 mg versus bacon 751 mg, dry black beans 5 mg versus canned kidney beans 296 mg](/images/sodium-processing-gradient-chart.jpg)

Same wheat. Same pig. Same bean. The number changes by a factor of 16 to 228 depending purely on what happened to the food between the field and the shelf.

The bread one is the one I keep thinking about. Whole wheat bread gets sold as the responsible choice, and on fiber it earns that: 6 g per 100 g, versus basically nothing in white. But it's carrying 455 mg of sodium per 100 g, roughly 127 mg in a 28 g slice, and the flour it's made from has 2. Bread needs salt for the dough to behave and for the yeast to not run wild, so this isn't a scandal. It's just not visible, and two slices of "the healthy bread" quietly puts about 254 mg on your plate before anything goes on top of it.

Bacon at 751 mg is the highest single number in the basket, which surprises nobody. The interesting part is the comparison: fresh pork loin from the same animal is 48 mg. Curing did all of it.

And the beans. Dry black beans are 5 mg per 100 g. The USDA record for canned kidney beans is 296. Worth being precise about what that number is, though: it's the total can contents, packing liquid included, so it's the before-you-drain figure. A lot of that sodium is sitting in the liquid you pour down the sink. If canned is what gets beans into your week, [canned beans still beat no beans](/canned-beans-vs-dried-beans-nutrition/), and draining and rinsing is a ten-second habit that pays.

## Almost none of the basket is the problem

Zoom out and the picture gets less scary, not more.

![Bar chart showing the sodium distribution across 56 budget staples: 26 foods under 10 mg per 100 g, 11 from 10 to 50, 11 from 50 to 150, 3 from 150 to 400, and 5 over 400](/images/sodium-basket-distribution-chart.jpg)

Five foods out of 56 clear 400 mg per 100 g: bacon at 751, part-skim mozzarella at 666, cheddar at 653, commercially prepared whole wheat bread at 455 and canned pink salmon at 403. Three more sit between 150 and 400, and they're all cans: sardines at 307, canned kidney beans at 296 and canned tuna at 247.

Everything else, 48 foods, is under 150 mg. Cured meat, cheese, commercial bread and cans. That's the list. It's short enough to memorize.

Worth naming the ones that are higher than you'd guess but still fine: eggs at 142 mg per 100 g, which is about 71 mg in a large egg, and frozen green peas at 108. Neither is a problem. They're just not zero, and if you assumed whole foods were all at 1 mg, they're the correction.

## A metric I'm not going to sell you

The CSV includes a `sodium_mg_per_dollar` column, because the rest of the series is built on per-dollar math and consistency matters. But I want to be straight about it: for sodium, that column is close to useless as a ranking, and I'm not going to make a chart out of it.

Here's why. Per-dollar math rewards cheapness. Sort the basket by sodium per dollar and bagged carrots (397 mg per dollar) outrank bacon (508) by less than you'd expect, and beat canned tuna (285) outright. Carrots are not a sodium problem. They're 69 mg per 100 g and cheap, so a dollar buys a lot of carrot. The metric is measuring the wrong thing.

The one place it earns its keep is the top of the list, where cheap and salty overlap: canned kidney beans at 1,327 mg per dollar and whole wheat bread at 1,311 mg per dollar are genuinely the two foods where a grocery dollar buys the most sodium. Both are staples people buy by the armful. That's a real finding. The other 54 rows are noise, and a chart would have laundered noise into a headline.

## What to actually do with this

Nothing dramatic. The list of moves is short:

**Buy the dry version when you'll actually cook it.** Dry beans are 5 to 12 mg per 100 g against 296 for the can, and they're already the best value in the entire price basket. If you won't soak them, [the same-day quick soak](/how-to-quick-soak-dried-beans-same-day/) gets it done in about an hour.

**Drain and rinse cans.** Beans, corn, tuna. The sodium lives in the liquid.

**Know what your bread is doing.** Two slices is roughly 254 mg. That's fine. It's just not free, and it's the single biggest quiet contributor in a normal cheap breakfast.

**Season with something other than the salt shaker.** Acid and aromatics do most of the work people think salt is doing, which is the whole point of [citrus, herbs and umami swaps](/big-flavor-less-salt-citrus-herbs-umami-swaps/). And if you overshoot, [there are real fixes for an oversalted pot](/fix-oversalted-soup-sauce-rice/) that don't involve the potato myth.

**Stop treating cheap and clean as a tradeoff.** They aren't one here. The dry goods aisle wins on fiber per dollar, wins on protein per dollar, and wins on sodium. It loses on convenience, every time, and that's the actual price you're paying.

## The full ranking, lowest sodium first

Every food in the basket with an exact USDA record match. Rank 1 is the *lowest* in sodium, which inverts the other studies in this series, so read the column header before you quote it.

| # | Food | Category | Sodium (mg/100 g) |
|---|---|---|---|
| 1 | Almonds | Nuts & seeds | 1 |
| 2 | Bananas | Fresh fruit | 1 |
| 3 | Blackberries | Fresh fruit | 1 |
| 4 | Blueberries | Fresh fruit | 1 |
| 5 | Pears | Fresh fruit | 1 |
| 6 | Raspberries | Fresh fruit | 1 |
| 7 | Strawberries | Fresh fruit | 1 |
| 8 | Prunes (dried plums) | Dried fruit | 2 |
| 9 | Whole wheat flour | Whole grains | 2 |
| 10 | Oat bran (dry) | Whole grains | 4 |
| 11 | Tofu (extra firm) | Soy & plant proteins | 4 |
| 12 | Black beans (dry) | Dried beans & peas | 5 |
| 13 | Brown rice (dry) | Whole grains | 5 |
| 14 | Green split peas (dry) | Dried beans & peas | 5 |
| 15 | Navy beans (dry) | Dried beans & peas | 5 |
| 16 | Quinoa (dry) | Whole grains | 5 |
| 17 | Russet potatoes (with skin) | Fresh vegetables | 5 |
| 18 | Brown lentils (dry) | Dried beans & peas | 6 |
| 19 | Frozen shelled edamame | Soy & plant proteins | 6 |
| 20 | Old-fashioned rolled oats | Whole grains | 6 |

And the eight at the other end:

| Food | Category | Sodium (mg/100 g) | Sodium per dollar |
|---|---|---|---|
| Bacon | Meat & poultry | 751 | 508 mg |
| Mozzarella (low-moisture part-skim) | Eggs & dairy | 666 | 844 mg |
| Cheddar cheese | Eggs & dairy | 653 | 521 mg |
| 100% whole wheat bread | Whole grains | 455 | 1,311 mg |
| Canned pink salmon | Fish (canned & frozen) | 403 | 443 mg |
| Sardines (canned in oil, drained) | Fish (canned & frozen) | 307 | 252 mg |
| Canned kidney beans | Canned | 296 | 1,327 mg |
| Canned tuna (chunk light, in water) | Fish (canned & frozen) | 247 | 285 mg |

All 56 rows, with package prices, price per 100 g, fiber, protein and the USDA record ID behind every number, are in the [raw CSV](/data/sodium-per-dollar-2026.csv). Check any row you want. You can also run your own matchups in the [per dollar calculator](/tools/fiber-per-dollar-calculator/), or scale a week of this across a household with the [grocery budget planner](/tools/grocery-budget-calculator/).

This is the fifth spreadsheet in the series, and it's the first one where the answer was already sitting in the previous four. The cheap list and the low-sodium list were the same list the whole time. Nobody had put them side by side.
