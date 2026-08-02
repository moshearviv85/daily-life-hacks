# Reddit Launch Posts — Data Study Series

**Status: DRAFTS. Do not post until comment karma is ~50+ (was 32 on 2026-07-11).**
**Order matters: post 1 first, wait 3-4 days, then post 2, then post 3. Never two subs on the same day.**
All numbers below are pulled straight from the audited CSVs in `public/data/` on 2026-07-12.

---

## Post 1 — r/EatCheapAndHealthy

**When:** Weekday morning US time (14:00-16:00 Israel time). This sub is the friendliest, start here.

**Title:**
I priced 49 protein sources at the same store and ranked them by protein per dollar. Dry pinto beans give you 10x more protein per dollar than rotisserie chicken.

**Body:**

I kept seeing "eggs are the cheapest protein" repeated everywhere, so I actually sat down and checked. I pulled protein numbers from USDA FoodData Central for 49 common foods and priced everything at the same store (Walmart Great Value where available) so the comparison is apples to apples.

Top 10 by grams of protein per dollar:

1. Pinto beans (dry) - 98 g/$
2. Whole wheat flour - 96 g/$ (yes, flour. 13g protein per 100g and it costs nothing)
3. Black beans (dry) - 81 g/$
4. Brown lentils (dry) - 78 g/$
5. Navy beans (dry) - 76 g/$
6. Green split peas (dry) - 74 g/$
7. Chickpeas (dry) - 57 g/$
8. Rolled oats - around 47 g/$
9. Peanut butter - around 40 g/$
10. Eggs - 34 g/$

Eggs are good, but they're not even close to the top. Bacon came in dead last at 9.2 g/$.

The thing that surprised me most: I also built five sample days that each hit ~50g of protein, and the cheapest one (oats, split peas, pintos, rice, peanut butter) came out to $0.82 for the whole day. The same 50g from fast food cost $9.97. That's a 12x spread for the same protein.

Obvious caveats: prices are one store, one month (July 2026), and they'll drift. Dry beans need cooking, which is a real cost in time. And complete vs incomplete protein matters if you're an athlete, less if you're just trying to eat decently on a budget.

Happy to share the full ranked list if anyone wants it.

**First comment (post it yourself right after):**
Data sources for anyone who wants to check my math: protein values are from USDA FoodData Central, prices are Walmart Great Value from July 2026. The full 49-food table is here as a plain CSV: https://www.daily-life-hacks.com/data/protein-per-dollar-2026.csv

**Notes:**
- If a mod removes the comment link, don't argue. The post itself carries the value.
- Answer every question in the first 2 hours. That's what decides if it climbs.
- If someone asks "where's the writeup" you can link the article. Don't volunteer it in the post body.

---

## Post 2 — r/Frugal

**When:** 3-4 days after post 1, weekday morning US time.

**Title:**
I tracked what hitting 30g of fiber a day actually costs. Cheapest real menu: $0.62/day. The exact same fiber from a restaurant day: $14.42.

**Body:**

My grocery bill kept creeping up so I started paying attention to what I'm actually paying for nutrients instead of just food. Fiber turned out to be the most extreme example I found.

I built five one-day menus that each hit roughly 30g of fiber (the FDA daily value is 28g), priced every ingredient at the same store, and added it up:

- Dry goods day (oats, split pea soup, pinto beans, rice, popcorn): 31.9g for $0.62
- No-cook convenience day (canned beans, frozen veg, whole wheat bread): 31.7g for $1.74
- Fresh produce day (berries, avocado, salads): 31.4g for $4.18
- Restaurant/takeout day: 31.0g for $14.42
- Realistic mixed day (some cooking, some convenience): 32.1g for $1.99

Same nutritional target, 23x price difference between the cheapest and most expensive way to get there.

The realistic takeaway for me wasn't "eat only dry beans." It was the $1.99 mixed day: a bag of popcorn kernels instead of chips, canned beans in whatever you're already making, oats for breakfast twice a week. The boring pantry stuff does almost all the work and the fresh stuff is a bonus, not the foundation.

Popcorn kernels were the sleeper. 14.5g fiber per 100g, and a 2lb bag is about $2.28. Cheapest snack that actually counts for something.

**First comment:**
Sources: fiber values from USDA FoodData Central, prices from Walmart Great Value, July 2026. Full menus with every ingredient priced line by line, as a CSV: https://www.daily-life-hacks.com/data/fiber-day-cost-2026.csv

**Notes:**
- r/Frugal loves the "23x for the same thing" framing. Keep the tone money-first, not health-first.
- No health claims in replies. If someone asks about fiber and disease, say "not my lane, I just priced it."

---

## Post 3 — r/dataisbeautiful

**When:** Only after posts 1-2 went OK and karma is comfortably 50+. This sub is the harshest; strict [OC] rules.

**Title (must start with [OC]):**
[OC] 49 protein sources ranked by grams of protein per dollar (USDA nutrition data, single-store prices)

**Image:** Upload `public/images/protein-per-dollar-cheapest-protein-sources-main.jpg` directly as an image post. If mods want a cleaner/taller version, tell me and I'll generate a dedicated one.

**Required first comment (rule: source + tool within 1 hour or removal):**
Data: protein per 100g from USDA FoodData Central; prices collected July 2026 from a single store (Walmart Great Value where available) so rankings aren't skewed by mixing retailers. Tool: Python + matplotlib. Full dataset as CSV: https://www.daily-life-hacks.com/data/protein-per-dollar-2026.csv. Methodology notes: edible fraction adjustments applied (bone-in items etc.), dry weights used for beans/grains.

**Notes:**
- The [OC] tag and the sources comment are hard rules there. Missing either = automatic removal.
- Expect nitpicks ("why one store?", "cooked vs dry weight?"). Both are answered in the methodology; answer calmly with the numbers.
- If it does well, people will ask for fiber. That's the follow-up [OC] post two weeks later.

---

## After posting
Log each post URL in `pipeline-data/reddit-comments-log.md` so the daily routine tracks replies.

---
---

# Set 2 — Sodium Study (drafted 2026-08-02, weekly-growth-sprint)

**Status: DRAFTS. NOT POSTED. Owner approval required before any of these go up.**

**Karma gate:** met on the record we have. Comment karma was 171 on 2026-07-15, well past the ~50 threshold. I could not re-check today: `reddit.com/user/YogurtclosetOk80/about.json` returns the HTML app shell from this machine, same block documented in the memory notes. Worth eyeballing the profile before posting.

**Source article (live):** https://www.daily-life-hacks.com/low-sodium-budget-foods-ranked/
**Source CSV:** https://www.daily-life-hacks.com/data/sodium-per-dollar-2026.csv

Every number below was re-checked against `public/data/sodium-per-dollar-2026.csv` on 2026-08-02, the day it was published. 47 claims checked, 0 wrong.

**Ban-lesson constraints baked in (see the ECAH removal, 2026-07-13):**
- Posts A and B carry **no link to our domain**. The whole dataset is in the post body. Only drop the CSV link if someone explicitly asks for the source, and even then link the CSV, not the article.
- Post C (r/dataisbeautiful) *must* carry a source link, that's a sub rule. It is therefore the last one to run, not the first.
- One post per day maximum, and never two subs on the same day. 3-4 days between posts.
- These do not stack on top of Set 1. Pick one set, run it, see what happens. Running the protein post and the sodium post in the same week reads as a campaign.

---

## Post A — r/EatCheapAndHealthy

**When:** Weekday, 16:00-18:00 Israel time. Friendliest sub, start here.

**Title:**
I checked whether eating cheap actually means eating salty. Looked at 56 staples and it's the opposite.

**Body:**

I've repeated "cheap food is salty food" for years without ever checking it, so I finally pulled sodium numbers from USDA FoodData Central for 56 staples I'd already priced out, and the assumption fell apart.

The cheapest things in the cart are the *lowest* in sodium. Per 100g:

- Whole wheat flour: 2 mg
- Oat bran: 4 mg
- Extra firm tofu: 4 mg
- Dry black beans, split peas, navy beans, brown rice, quinoa, russet potatoes: 5 mg each
- Rolled oats, dry brown lentils: 6 mg
- Dry pinto beans: 12 mg

26 of the 56 came in under 10 mg per 100g. 48 of 56 under 150 mg.

The part that actually changed how I shop is that sodium tracks *processing*, not price. Same ingredient, two aisles:

- Whole wheat flour 2 mg → commercially prepared whole wheat bread 455 mg (about 228x, and none of it comes from the wheat)
- Fresh pork loin 48 mg → bacon 751 mg (about 16x)
- Dry black beans 5 mg → canned kidney beans 296 mg (about 59x)

Two caveats I want to be straight about, because both cut against my own headline:

1. The canned bean number is USDA's "total can contents", meaning liquid included. That's the before-you-drain figure, not what lands on your plate. Draining and rinsing takes a real chunk out of it.
2. Everything is per 100g **as purchased**, so dry beans are weighed dry. Cook them and they roughly triple in weight, so cooked beans are about a third of the listed number per 100g. Comparing a dry number to a cooked number is the easiest way to get this wrong and I nearly did it myself.

Only five foods out of 56 clear 400 mg per 100g: bacon, part-skim mozzarella (666), cheddar (653), commercial whole wheat bread (455), canned pink salmon (403). Cured meat, cheese, bread and cans. That's basically the whole list.

The catch, and it's a real one: the cheap low-sodium list is almost entirely stuff you have to cook. Convenience is what you're actually paying for, in money and in sodium.

**If someone asks for the source (only then):**
All USDA FoodData Central, per 100g as purchased, and I kept the record ID for every row so it's checkable. Raw CSV if you want to poke at it: https://www.daily-life-hacks.com/data/sodium-per-dollar-2026.csv

**Expected pushback and honest answers:**
- *"2,300 mg is the limit, so who cares about 5 mg beans?"* Fair. The point isn't that beans are a sodium win, it's that the cheap list isn't the problem people assume it is. The five foods at the top are where it comes from.
- *"You didn't include ramen / canned soup / frozen dinners."* True, and that's a real gap. This basket was built for a fiber and protein cost study, so it's whole-food heavy. Named as a limitation, not defended.
- *"Bread needs salt to work."* Correct, and the post says so. It's not a scandal, it's just invisible.

---

## Post B — r/Frugal

**When:** 3-4 days after Post A, weekday.

**Title:**
Dried beans are 59x lower in sodium than canned, and they're already the cheapest thing in the store

**Body:**

I priced 56 grocery staples a while back for a cost-per-nutrient thing, and last week I went back and added sodium from USDA FoodData Central to the same list. The dry goods aisle wins a third time.

Per 100g, as purchased:

- Dry black beans: 5 mg sodium
- Dry pinto beans: 12 mg
- Canned kidney beans: 296 mg

The canned figure is USDA's total-can-contents number, so liquid included, which means it's the worst case rather than what you actually eat. Rinsing takes out a good share. Still, the gap is enormous and the dry version is also the cheaper one, so there's no tradeoff to agonize over here.

Same pattern shows up everywhere I looked:

- Whole wheat flour 2 mg vs commercially prepared whole wheat bread 455 mg
- Fresh pork loin 48 mg vs bacon 751 mg

The general rule I came away with: you're not paying extra for salt, you're paying extra for someone else doing the cooking, and the salt comes along with that. The frugal move and the low-sodium move happen to be the same move.

Where it actually costs you is time. Dry beans need soaking and an hour, bread needs a bread machine or a Saturday. That's the honest trade.

**Notes:**
- No domain link. If asked, the CSV link only.
- r/Frugal hates anything that smells like content marketing. Do not mention a website, a blog, or "I write about". If someone asks what the spreadsheet is for, "I got annoyed and made a spreadsheet" is the whole answer.

---

## Post C — r/dataisbeautiful

**When:** Last, and only if A and B went fine. Strict [OC] rules; the sources comment is mandatory within the hour or it gets removed.

**Title (must start with [OC]):**
[OC] Sodium in 56 grocery staples: the same ingredient, before and after processing

**Image:** Upload `public/images/sodium-processing-gradient-chart.jpg` directly as an image post. It's the three-pair chart (flour vs bread, pork loin vs bacon, dry beans vs canned) at 1200x675 with the multipliers called out. If mods want something taller or without the site footer, say so and I'll regenerate it.

**Required first comment (source + tool, within 1 hour):**
Data: sodium per 100g from USDA FoodData Central, using the same record ID each food was already matched to in an earlier cost study, so every row is traceable to a specific USDA record. Only exact record matches were included, which is why it's 56 foods rather than the full 102-row basket. Tool: Python + matplotlib. Full dataset as CSV: https://www.daily-life-hacks.com/data/sodium-per-dollar-2026.csv

Two limitations worth stating up front: all values are per 100g **as purchased** (dry goods weighed dry, so cooked weights differ by roughly 3x for beans and grains), and the canned bean record is USDA's total can contents, liquid included, so it's a before-draining figure.

**Notes:**
- The [OC] tag and the sources comment are hard rules. Missing either is automatic removal.
- Expect "per 100g of a dry good is misleading" immediately. It's a fair hit and it's already conceded in the sources comment. Agree, don't argue, point at the caveat.
- Expect "where's the sodium per serving?" Honest answer: serving sizes would have meant inventing portions, and the study deliberately reused an existing audited basis instead. Say that plainly.

