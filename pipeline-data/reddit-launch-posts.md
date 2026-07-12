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
