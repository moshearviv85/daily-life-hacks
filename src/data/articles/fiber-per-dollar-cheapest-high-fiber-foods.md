---
title: "Fiber per Dollar: The Cheapest High-Fiber Foods, Ranked"
excerpt: "A dollar of dry split peas buys 71g of fiber. A dollar of blueberries buys 2.5g. All 53 grocery foods ranked by fiber per dollar, at July 2026 prices."
category: "nutrition"
tags: ["cheapest high fiber foods", "fiber per dollar", "budget groceries", "high fiber on a budget", "grocery data"]
cluster: "budget-fiber"
parentPillar: "how-to-eat-more-fiber-on-a-budget-complete-guide"
image: "/images/fiber-per-dollar-cheapest-high-fiber-foods-main.jpg"
imageAlt: "Playful editorial illustration of a grocery cart overflowing with beans and whole grains balanced against a single dollar"
date: 2026-07-04
dateModified: 2026-09-04
author: "David Miller"
faq:
  - question: "What food has the most fiber per dollar?"
    answer: "In our analysis of 53 common US grocery foods, whole wheat flour technically came out on top at roughly 78 grams of fiber per dollar, but you only get that fiber if you bake with it. Among foods you cook and eat as-is, dry green split peas lead at about 71 grams of fiber per dollar, based on USDA fiber data and July 2026 prices. A one pound bag costs around $1.42 and holds about 101 grams of fiber. Dried pinto beans finished within a rounding error of split peas."
  - question: "Are dried beans really cheaper than canned beans for fiber?"
    answer: "Yes, though the gap is narrower than it looks. In our numbers, dry pinto beans delivered about twice as much fiber per dollar as canned black beans (roughly 71 grams per dollar versus 34). Canned still beats almost every fresh food on the list, so it's a solid middle option when you don't want to cook a pot of beans from scratch."
  - question: "Is fresh fruit a bad way to get fiber on a budget?"
    answer: "Not bad, just expensive per gram. Fresh berries landed at the bottom of our ranking, with blueberries around 2.5 grams of fiber per dollar. Bananas were the best fresh fruit value at just under 12 grams per dollar. Fruit earns its spot for flavor and convenience; it just shouldn't be the main place your fiber budget goes if money is tight."
  - question: "How is fiber per dollar calculated?"
    answer: "We matched each food's fiber content per 100 grams to a typical July 2026 US package price and divided the total fiber in the package by its price. For foods with peels or pits, we counted only the edible portion. The current row-level source audit found 42 exact USDA matches, 9 close USDA proxies, and 2 unresolved rows. Proxies and unresolved rows are not counted as independently re-verified. Popcorn stays unresolved on purpose: USDA publishes no record for unpopped kernels, so we corrected the air-popped value for popping yield to 12.9 grams per 100 grams. That figure is our calculation, not a USDA number, and the status says so."
  - question: "Do local price differences change the ranking?"
    answer: "The exact numbers will shift with your store and region, but the tiers barely move. Dried beans, split peas, and whole grains are so far ahead of fresh produce that even a 30 to 40 percent price swing doesn't change which end of the list a food sits on. Treat the rankings as tiers, not precise scores."
---

Dry green split peas are the cheapest high-fiber food you can cook and eat as-is, at about 71 grams of fiber per dollar in our July 2026 grocery dataset. Whole wheat flour technically takes the number one spot at 78 grams per dollar, but you only collect that fiber if you bake with it. Here's how I know: I built a spreadsheet nobody asked for. I took 53 foods from a normal American grocery run, matched their published fiber values to current prices, and calculated exactly how many grams of fiber one dollar buys. The row-level source audit below separates exact USDA matches from proxies and unresolved entries.

The result is a full ranking of the cheapest high-fiber foods in the store, and the gap between the top and the bottom is honestly absurd. A dollar of fresh blueberries buys 2.5 grams of fiber against those 71 grams from split peas. Same nutrient, 28 times the price. If fiber were gasoline, that would be the difference between $3 a gallon and $85 a gallon, and we'd all be rioting.

## What is the cheapest source of fiber per dollar?

**Whole wheat flour, at 77.8 grams of fiber per dollar.** A $3.12 five pound bag carries about 243 grams of fiber. The catch is that flour is an ingredient, not dinner, so you only collect that fiber if you actually bake with it.

**If you want the cheapest fiber you can cook and eat as-is, it's dry green split peas at 71.0 grams per dollar.** A $1.42 bag holds roughly 101 grams of fiber. Dry pinto beans are effectively tied at 70.8.

At the other end of the same 53-food list, blueberries buy 2.5 grams of fiber per dollar. That's a 31-fold spread on one nutrient, in one store, on the same afternoon.

## How is fiber per dollar calculated?

No mystery math here. Three steps:

* **Fiber content:** the current row-level source audit links 42 of 53 values to exact [USDA FoodData Central](https://fdc.nal.usda.gov/) records and 9 to close USDA proxies. The remaining 2 are unresolved. A proxy can differ in brand, variety, form, or preparation, so it is not an exact match. An unresolved row has no acceptable row-level match in the current audit and is not counted as independently re-verified. Popcorn remains unresolved: the only USDA record, FDC 167959, describes air-popped popcorn, so we applied a popping-yield correction to put it on the same basis as the unpopped kernels we priced, which lands at 12.9 grams per 100 grams. Because no published record supplies that number, the row is not claimed as a USDA match. For dry goods like beans and oats, the intended basis is fiber per 100 grams as sold in the bag, so the price and fiber are measured on the same basis.
* **Prices:** typical US prices collected in July 2026, mostly from Walmart.com national listings (store brand where one exists), cross-checked against Bureau of Labor Statistics average price data. The [BLS average-price methodology](https://www.bls.gov/cpi/factsheets/average-prices.htm) explains an important limitation: these are estimates of price levels built from eligible retail observations, not a promise about the price at your store. Some values here are national averages, rounded. Your receipt will move. The broad tiers may move less.
* **The math:** total grams of fiber in the package, divided by the package price. For foods with peels, cores, or pits (bananas, oranges, avocados, apples, pears), we only counted the edible portion, because you can't eat a banana peel no matter what the per-pound sticker implies.

One more thing, because a data article that can't admit mistakes isn't a data article. Our latest row-level source audit found 42 exact USDA matches, 9 close USDA proxies, and 2 unresolved rows (popcorn kernels, whose value is derived rather than quoted, and frozen shelled edamame, which moved backwards from proxy to unresolved). Proxy and unresolved rows are not described as independently re-verified. We also checked the price entries against current shelf listings and corrected several figures (split peas, whole wheat spaghetti, russet potatoes, canned kidney beans, bran flakes, and flaxseed). The table below reflects that audit instead of hiding its gaps.

The full dataset is public. You can download the raw CSV [here](/data/fiber-per-dollar-2026.csv) and check every number yourself. Same files sit on a [mirror on Hugging Face (CC-BY-4.0)](https://huggingface.co/datasets/moshiko123/daily-life-hacks-grocery-nutrition-per-dollar). Or skip the spreadsheet and use the [protein and fiber value planner](/tools/fiber-per-dollar-calculator/), which compares foods and builds a basket from the same 53-row dataset. Once the winners have to feed actual people, the [weekly food-cost planner](/tools/grocery-budget-calculator/) turns our five audited 30-gram days into a scaled food list instead of another theoretical ranking.

*Source audit updated July 2026: 42 exact USDA matches, 9 close USDA proxies, and 2 unresolved rows. Proxy and unresolved rows are not independently re-verified. Next scheduled price re-audit: October 2026. Monthly BLS checks flag drift in between.*

![Horizontal bar chart ranking the top 20 cheapest high-fiber foods by grams of fiber per dollar](/images/fiber-per-dollar-top-20-chart.jpg)

## The full ranking: 53 foods by fiber per dollar

This table contains 42 exact USDA matches, 9 close USDA proxies, and 2 unresolved fiber-source rows. The raw CSV identifies the status and evidence for each row; proxy and unresolved rows are not independently re-verified. Price entries were checked against current shelf listings on July 4, 2026.

| Rank | Food | Fiber (g per 100g) | Price per 100g | Fiber per $1 |
|---|---|---|---|---|
| 1 | Whole wheat flour | 10.7 g | $0.14 | 77.8 g |
| 2 | Green split peas (dry) | 22.2 g | $0.31 | 71.0 g |
| 3 | Pinto beans (dry) | 15.5 g | $0.22 | 70.8 g |
| 4 | Black beans (dry) | 15.5 g | $0.27 | 58.1 g |
| 5 | Pearled barley (dry) | 15.6 g | $0.27 | 57.1 g |
| 6 | Navy beans (dry) | 15.3 g | $0.29 | 52.0 g |
| 7 | Popcorn kernels | 12.9 g | $0.25 | 51.3 g |
| 8 | Old-fashioned rolled oats | 10.1 g | $0.28 | 35.8 g |
| 9 | Whole wheat spaghetti | 9.2 g | $0.26 | 35.4 g |
| 10 | Canned black beans | 6.9 g | $0.20 | 34.4 g |
| 11 | Chickpeas (dry) | 12.2 g | $0.36 | 33.8 g |
| 12 | Brown lentils (dry) | 10.7 g | $0.32 | 33.7 g |
| 13 | Chia seeds | 34.4 g | $1.04 | 33.1 g |
| 14 | Bran flakes cereal | 18.3 g | $0.61 | 30.1 g |
| 15 | Whole flaxseed | 27.3 g | $0.96 | 28.5 g |
| 16 | Red lentils (dry) | 10.8 g | $0.43 | 25.3 g |
| 17 | Bulgur wheat (dry) | 12.5 g | $0.51 | 24.4 g |
| 18 | Oat bran (dry) | 15.4 g | $0.68 | 22.5 g |
| 19 | Canned chickpeas | 4.4 g | $0.22 | 19.7 g |
| 20 | Canned kidney beans | 4.3 g | $0.22 | 19.3 g |
| 21 | Frozen green peas | 4.5 g | $0.26 | 17.6 g |
| 22 | Brown rice (dry) | 3.6 g | $0.21 | 17.5 g |
| 23 | 100% whole wheat bread | 6.0 g | $0.35 | 17.3 g |
| 24 | Carrots (whole, bagged) | 2.8 g | $0.17 | 16.1 g |
| 25 | Green cabbage | 2.5 g | $0.17 | 14.6 g |
| 26 | Sweet potatoes | 3.0 g | $0.22 | 13.9 g |
| 27 | Dry roasted peanuts | 8.4 g | $0.61 | 13.7 g |
| 28 | Sunflower seed kernels | 8.6 g | $0.66 | 13.1 g |
| 29 | Bananas | 2.6 g | $0.14 | 11.6 g |
| 30 | Peanut butter | 5.0 g | $0.44 | 11.4 g |
| 31 | Frozen green beans | 2.6 g | $0.24 | 10.8 g |
| 32 | Quinoa (dry) | 7.0 g | $0.66 | 10.6 g |
| 33 | Avocado | 6.7 g | $0.47 | 10.4 g |
| 34 | Canned pumpkin | 2.9 g | $0.29 | 9.9 g |
| 35 | Frozen broccoli florets | 3.0 g | $0.32 | 9.5 g |
| 36 | Almonds | 12.5 g | $1.43 | 8.8 g |
| 37 | Frozen chopped spinach | 2.9 g | $0.35 | 8.4 g |
| 38 | Frozen shelled edamame | 5.2 g | $0.62 | 8.3 g |
| 39 | Prunes (dried plums) | 7.1 g | $0.88 | 8.1 g |
| 40 | Pears | 3.1 g | $0.35 | 8.0 g |
| 41 | Chopped kale (bagged) | 4.1 g | $0.55 | 7.5 g |
| 42 | Apples (gala) | 2.3 g | $0.28 | 7.3 g |
| 43 | Yellow onions | 1.7 g | $0.24 | 7.1 g |
| 44 | Brussels sprouts | 3.8 g | $0.55 | 7.0 g |
| 45 | Russet potatoes (with skin) | 1.3 g | $0.20 | 6.6 g |
| 46 | Raisins | 3.7 g | $0.59 | 6.3 g |
| 47 | Oranges (navel) | 2.2 g | $0.26 | 6.2 g |
| 48 | Fresh broccoli crowns | 2.6 g | $0.43 | 6.1 g |
| 49 | Chopped dates | 8.0 g | $1.31 | 6.1 g |
| 50 | Raspberries | 6.5 g | $1.46 | 4.5 g |
| 51 | Blackberries | 5.3 g | $1.34 | 4.0 g |
| 52 | Strawberries | 2.0 g | $0.55 | 3.4 g |
| 53 | Blueberries | 2.4 g | $0.95 | 2.5 g |

Fiber per $1 accounts for edible portion on fresh fruit, so bananas are scored on the fruit, not the peel.

## What are the cheapest high-fiber foods per dollar?

**The dry goods aisle is running the table.** Eleven of the top twelve foods are dried beans, peas, or whole grains, and the same bags run [the plant protein ranking](/plant-protein-per-dollar-ranked/) and [the pantry-only protein table](/shelf-stable-pantry-per-dollar/) on our other spreadsheet. Whole wheat flour technically wins the whole list at about 78 grams of fiber per dollar, but flour is an ingredient, not dinner (more on that below). Among foods you can actually cook and eat, dry split peas take the crown at about 71 grams of fiber per dollar, roughly 16 times more than fresh raspberries and 28 times more than blueberries. One $1.42 bag of split peas holds around 101 grams of fiber. For context, the [FDA lists 28 grams as the Daily Value](https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels); our [Daily Value explainer](/fiber-protein-daily-values-explained/) shows where that number came from and what it does not mean. That single dollar-and-change bag contains about three and a half Daily Values. That's a comparison, not a suggestion to eat the bag in three days. If you've never cooked split peas, our [split pea soup recipe](/split-pea-soup-recipe-high-fiber/) is the easy on-ramp.

**Dry beans beat canned by about 2x.** Dry pinto beans came in around 71 grams of fiber per dollar; canned black beans, about 34. Canned is still a genuinely good deal, and I keep a shelf of them for lazy nights. But if the soaking step is the only thing stopping you, the [same-day quick-soak method](/how-to-quick-soak-dried-beans-same-day/) removes the excuse.

**Popcorn stays unresolved, and the correction cost it two places.** The USDA record we matched (FDC 167959) describes air-popped popcorn while our price is for unpopped kernels, so we applied the popping-yield correction. That pulled the value from 14.5 to 12.9 grams per 100 grams and dropped the row from number 5 to number 7, behind pearled barley and navy beans. It still buys 51.3 grams of fiber per dollar, which is a genuinely good deal, but USDA publishes nothing for unpopped kernels, so the row stays unresolved rather than claiming a match. If you're going to eat popcorn anyway, some [smarter popcorn toppings](/high-fiber-popcorn-toppings-healthy/) keep it from becoming a butter delivery system.

**Frozen quietly beats fresh.** Frozen green peas scored 17.6 grams per dollar; fresh broccoli crowns, 6.1. That matches what we found when we compared [frozen versus fresh produce](/frozen-vs-fresh-produce-when-to-buy/) more broadly: the freezer aisle is where the value hides.

**Berries are a luxury good, fiber-wise.** The bottom four spots are all berries. Raspberries look impressive at 6.5 grams of fiber per 100 grams, but at $2.48 for a 6 ounce clamshell, you're paying boutique prices. Five dollars buys 355 grams of fiber as split peas or 12 grams as blueberries.

The full table is useful, but a 53-row ranking is not how anyone shops unless they bring a clipboard to Walmart. The tighter cuts make the decisions clearer: see [what one fiber dollar buys](/one-dollar-fiber-what-it-buys/) when the budget is fixed, then compare the [grain aisle](/grains-fiber-per-dollar-ranked/), [produce aisle](/produce-fiber-per-dollar-ranked/), [breakfast staples](/breakfast-staples-per-dollar/), and [high-fiber snacks](/high-fiber-snacks-per-dollar/) on their own terms. Beans earned two separate audits because they're doing two jobs at once: the [canned versus dry cost gap](/canned-vs-dry-beans-cost/) measures the convenience markup, while the [protein and fiber ranking](/beans-double-win-fiber-protein/) shows why they keep winning both spreadsheets. The protein-side twin of the dollar cut is [what a single protein dollar buys](/one-dollar-protein-what-it-buys/).

![Bar chart comparing how many total grams of fiber five dollars buys across ten common foods, from 355 grams for split peas down to 12 grams for blueberries](/images/fiber-per-dollar-five-dollars.jpg)

## The fine print on the top of the list

Two honest caveats before you fill a cart with split peas.

Whole wheat flour sits at number 1, and nobody eats flour with a spoon. It only counts if you bake, so treat it as a quiet upgrade: swap it into pancakes, muffins, and bread dough and the fiber tags along for pennies. If you want a number one you can actually put in a pot tonight, that's split peas at number 2. Same asterisk applies to whole wheat spaghetti at number 9, except that one you can boil and eat on a Tuesday.

And ranking low doesn't make a food bad. Berries, avocados, and Brussels sprouts bring things to the table that a bag of navy beans never will. This list answers exactly one question: where each fiber dollar goes furthest. If the question you actually came in with is which foods simply hold the most fiber, [the same groceries ranked by fiber content](/best-high-fiber-foods-ranked-by-fiber-content/) sort into a different order entirely, with chia seeds on top at 34.4 grams per 100 grams. It's a map, not a meal plan.

![Bar chart of median fiber per dollar by grocery category, with dried beans and peas far ahead of whole grains, canned goods, and fresh produce](/images/fiber-per-dollar-by-category.jpg)

## How to actually use this

Don't overhaul anything. Just let the top of the table cover the boring baseline, cheap and on autopilot, and spend your remaining grocery money on whatever you actually crave.

* **Pick two pantry anchors.** A bag of split peas or lentils and a bag of pinto beans is maybe $5.50 and more fiber than most of us see in two weeks.
* **Make oats or bran flakes the default breakfast.** Both sit in the top 20 and neither requires a recipe.
* **Let frozen peas be your emergency vegetable.** Ninety seconds in the microwave, 17.6 grams per dollar, zero chopping.
* **Buy berries because you love them.** Just don't buy them as a fiber strategy.

If you want to turn the ranking into actual meals, the [complete guide to eating more fiber on a budget](/how-to-eat-more-fiber-on-a-budget-complete-guide/) handles the shopping routine. The follow-up study on [what 30 grams of fiber costs in a day](/what-30-grams-of-fiber-costs-per-day/) shows five ways to use the same dataset, from dry goods to drive-thru food. For the rest of the cart, our [healthy eating on a budget shopping list](/grocery-shopping-list-for-healthy-eating-on-a-budget/) pairs well with this table.

One more thing this table turned out to be right about by accident. When we later ran [sodium across the same priced basket](/low-sodium-budget-foods-ranked/), the foods at the top here came back at 2 to 12 mg of sodium per 100 g. Whole wheat flour, the fiber winner, is the lowest-sodium grain in the study. Cheapest and least salty are the same shelf.

The whole analysis comes down to one sentence: the cheapest high-fiber foods in America live in the dry goods aisle, they cost about a quarter per 100 grams, and the store has been hiding them at knee level below the fancy stuff the whole time. Now you have the receipts.
