---
title: "Cheap Protein Ranked After Adjusting for Quality"
excerpt: "We re-ranked 25 cheap proteins by quality-adjusted grams per dollar using DIAAS. Pinto beans held first at 58 g per dollar. The cereal grains fell hard."
category: "nutrition"
tags: ["quality adjusted protein per dollar", "DIAAS", "protein quality", "budget protein", "cheapest protein sources"]
cluster: "budget-protein"
parentPillar: "high-protein-on-a-budget-complete-guide"
image: "/images/protein-per-dollar-adjusted-for-quality-main.jpg"
imageAlt: "Overhead spread of budget high-quality proteins on a wooden table: pinto beans, lentils, rice and black beans, eggs, cheese, chickpeas, milk, and peanut butter"
date: 2026-07-16
author: "David Miller"
faq:
  - question: "What is the best protein per dollar after adjusting for quality?"
    answer: "In our 25-food sample, dried pinto beans still finished first at about 58 grams of quality-adjusted protein per dollar, using their audited protein-per-dollar value multiplied by a published DIAAS score. Chicken drumsticks came second at about 50, brown lentils third at 49, black beans fourth at 48, and dried chickpeas fifth at 47. So the cheapest option overall didn't change, but the gap between beans and animal proteins shrank a lot once quality was factored in."
  - question: "What is DIAAS and why does it matter for cheap protein?"
    answer: "DIAAS stands for Digestible Indispensable Amino Acid Score. It measures protein quality by checking how well a food's essential amino acids match what your body needs and how much you actually absorb. A score of 1.0 means the protein covers your needs on its own. Most beans and grains land between 0.4 and 0.65, which is why the raw protein-per-dollar ranking shifts once you weight each food by its DIAAS."
  - question: "Do beans still win if they aren't a complete protein?"
    answer: "In our numbers, yes, but the win is narrower. Pinto beans held the top spot on quality-adjusted value even with a DIAAS around 0.59, because they start so far ahead on raw protein per dollar. Beans come up short on the sulfur amino acids that grains carry, so pairing beans with rice covers most of the gap for pennies. The combination is cheap, and it's why beans and rice show up on tables all over the world."
  - question: "Which cheap proteins dropped the most after the quality adjustment?"
    answer: "The refined grains and the nut spread fell hardest. Whole wheat spaghetti dropped about ten spots, whole wheat bread fell nine, and peanut butter slid eleven because its DIAAS sits near 0.43. Whole wheat flour went from a near-tie for first down to seventh. These foods are still cheap calories and protein, they just buy less usable protein per dollar than their raw numbers suggest."
  - question: "How was quality-adjusted protein per dollar calculated?"
    answer: "We took each food's audited protein-per-dollar value from our original July 2026 study and multiplied it by a published DIAAS score, capping the score at 1.0 for the math so a high-quality food couldn't score above its raw value. Every DIAAS number in the public CSV carries a named source, mostly peer-reviewed studies and the FAO 2013 report. The result estimates usable protein per dollar rather than raw grams."
---

Dried pinto beans still bought the most usable protein per dollar in our sample, about 58 grams, even after we docked every food for protein quality. That's the headline, and it surprised me, because this whole exercise was built to test the complaint we get most: beans aren't a complete protein, so ranking them first is cheating. We checked. Beans held the top spot, just by a lot less than before.

A few weeks ago I ranked 49 grocery foods by [protein per dollar](/protein-per-dollar-cheapest-protein-sources/) and dried beans ran away with it. The pushback was fair. A gram of protein from beans isn't the same as a gram from eggs, because your body can't use all of it. So I took the audited numbers from that study, multiplied each by a published quality score, and rebuilt the ranking. Same prices, same grams, now weighted for what your body actually absorbs.

## What is DIAAS, in plain English?

DIAAS stands for Digestible Indispensable Amino Acid Score, the current standard for grading protein quality. It answers two things at once: does a food carry the essential amino acids in the amounts your body needs, and how much of that protein do you actually absorb. A score of 1.0 means the protein covers your needs on its own. A score of 0.5 means the food is short somewhere, so half of that protein doesn't pull its weight. Eggs and dairy sit above 1.0. Most beans and grains land between 0.4 and 0.65. That spread is the whole story.

## How we ran the quality adjustment

The base numbers didn't change. Protein per dollar is pulled verbatim from the [original study](/protein-per-dollar-cheapest-protein-sources/). Each food's DIAAS is a published value, capped at 1.0 for the math so nothing scores a quality bonus above its raw grams. Quality-adjusted protein per dollar is just the two multiplied together, an estimate of usable protein per dollar.

Every DIAAS value carries a named source, drawn from peer-reviewed work (Nosworthy on cooked pulses, the Phillips 2017 review, Herreman 2020, Rutherfurd 2015, Mathai 2017, Burd 2019) and the FAO 2013 report. The full [quality-adjusted CSV is public](/data/protein-quality-per-dollar-2026.csv), one row per food with the score and its citation. One caveat: DIAAS values shift between studies depending on the reference pattern and cooking method, so read these as solid estimates, not lab constants for your exact groceries.

## Does the ranking flip when you adjust for quality?

Parts of it flip hard. The top doesn't.

![Horizontal bar chart comparing raw protein per dollar against quality-adjusted protein per dollar for twelve foods, with cereal grains shrinking the most and animal proteins barely moving](/images/protein-per-dollar-adjusted-for-quality-chart.jpg)

| Rank | Food | Raw g per $1 | DIAAS | Adjusted g per $1 |
|---|---|---|---|---|
| 1 | Pinto beans (dry) | 97.9 | 0.59 | 57.8 |
| 2 | Chicken drumsticks (bone-in) | 50.3 | 1.08 | 50.3 |
| 3 | Brown lentils (dry) | 77.7 | 0.63 | 49.0 |
| 4 | Black beans (dry) | 81.0 | 0.59 | 47.8 |
| 5 | Chickpeas (dry) | 56.7 | 0.83 | 47.1 |
| 6 | Navy beans (dry) | 75.9 | 0.57 | 43.3 |
| 7 | Whole wheat flour | 96.0 | 0.45 | 43.2 |
| 8 | Green split peas (dry) | 73.9 | 0.58 | 42.9 |
| 9 | Red lentils (dry) | 56.0 | 0.63 | 35.3 |
| 10 | Eggs (large) | 34.4 | 1.13 | 34.4 |
| 11 | Mozzarella (part-skim) | 30.1 | 1.14 | 30.1 |
| 12 | Whole milk | 29.1 | 1.14 | 29.1 |
| 13 | White rice (dry) | 48.0 | 0.60 | 28.8 |
| 14 | Chicken thighs (boneless) | 27.7 | 1.08 | 27.7 |
| 15 | Greek yogurt (nonfat) | 27.5 | 1.14 | 27.5 |
| 16 | Cottage cheese (4%) | 26.3 | 1.14 | 26.3 |
| 17 | Old-fashioned rolled oats | 46.6 | 0.54 | 25.2 |
| 18 | Chicken breast (boneless) | 24.5 | 1.08 | 24.5 |
| 19 | Whole wheat spaghetti | 53.4 | 0.45 | 24.0 |
| 20 | Canned tuna (in water) | 22.4 | 1.00 | 22.4 |
| 21 | Peanut butter | 50.7 | 0.43 | 21.8 |
| 22 | TVP (soy) | 22.5 | 0.90 | 20.2 |
| 23 | 100% whole wheat bread | 35.8 | 0.45 | 16.1 |
| 24 | Tofu (extra firm) | 13.6 | 0.90 | 12.2 |
| 25 | Ground beef (80/20) | 11.5 | 1.11 | 11.5 |

DIAAS above 1.0 is shown for reference. It was capped at 1.0 in the math, so eggs and dairy keep their full raw value and nothing scores a quality bonus.

## Why the grains fell and the animal proteins climbed

**Chicken drumsticks were the big winner,** jumping from eleventh on the raw list to second. Their DIAAS is around 1.08 while legumes lose a third or more of their raw value. At roughly a dollar a pound in the bag, drumsticks quietly became the best animal-protein deal in the store once quality entered the math.

**The cereal grains took the worst beating.** Whole wheat flour was a near-tie for first on raw protein per dollar. Adjusted, it slid to seventh. Whole wheat spaghetti dropped about ten spots and whole wheat bread fell nine, because grains are limited by lysine. Peanut butter fell hardest of all, eleven spots, since its DIAAS sits near 0.43.

**Eggs and dairy climbed without moving an inch.** They didn't get cheaper. Everything around them got discounted while they kept full value, so eggs rose five spots, and mozzarella, milk, yogurt, and cottage cheese drifted up the same way. If you want quality without cooking, that corner of the fridge is where it lives.

## Do beans still win if they aren't complete protein?

They do here, and this is the part that answers the critique. Beans are short on the sulfur amino acids, methionine and cysteine. Grains have those in surplus and are short on lysine, which beans carry in plenty. Put them together and the holes fill in. A cooked rice-and-bean plate lands around a DIAAS of 0.78, well up from either food alone, and it costs almost nothing. That's not a lab trick. It's why [beans and rice](/beans-and-rice-complete-protein-meal/) is a staple on nearly every continent, and our [cheapest complete protein pairs](/cheapest-complete-protein-pairs/) piece runs the same idea across other combinations.

So the complaint is real, and it still doesn't knock beans off the top. It just means you shouldn't build a menu out of one bag.

## How to actually shop this

You don't need a spreadsheet at the register.

* **Keep beans and lentils as the cheap baseline.** They still top the adjusted list, and a grain on the side handles the quality question. A batch of [easy black bean tacos](/easy-black-bean-tacos-weeknight-dinner/) or a pot of [lentil curry](/lentil-curry-high-fiber-vegan-dinner/) does the work.
* **Make drumsticks or a whole bird your default meat.** They buy more usable protein per dollar than breast, thighs, or any ground meat here.
* **Let eggs and dairy do the no-cook lifting.** A plate of [rice and beans](/quick-20-minute-high-fiber-meals-for-busy-days/) with an egg on top is cheap, fast, and covers the amino acid gap in one move.
* **Don't overpay for the middle.** Peanut butter, whole wheat bread, and ground beef buy less usable protein than the shelf numbers suggest.

The one-sentence version is nearly the same as last time, asterisk earned honestly: the dry goods aisle still wins even after you weight for quality, beans and rice close the gap the critics point to, and the humble drumstick is the meat counter's quiet bargain. Want the shopping system instead of another table? The [high-protein budget guide](/high-protein-on-a-budget-complete-guide/) turns all of this into a cart.
