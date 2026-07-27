# Examples

Two scripts that read the CSVs in [`../data/`](../data/) and answer a question you'd
actually ask. No dependencies beyond the standard library in either language, so
you can run them the minute you clone this.

The output below is the real output, captured on 2026-07-27 against version 2026.1
of the data. If you run these and get different numbers, the data has been
re-audited since - check [`../CHANGELOG.md`](../CHANGELOG.md).

---

## `cheapest_protein.py`

**Question:** what does a day of protein cost, and does protein *quality* change the answer?

Raw "protein per dollar" treats a gram of wheat gluten like a gram of egg, which is
wrong. DIAAS corrects for how much of that protein your body can actually use. This
script ranks the cheapest way to hit a 50 g daily target both ways and shows what
the correction does to the leaderboard.

```
python examples/cheapest_protein.py
```

<details open>
<summary>Output</summary>

```text
Cost to hit 50 g of protein from a single food
US national prices, July 2026, as-purchased with USDA refuse removed
==========================================================================

CHEAPEST 10, RAW PROTEIN (all 49 foods in the index)

 #  Food                                  g/$    $/50g   Price basis
--------------------------------------------------------------------------
 1. Pinto beans (dry)                    97.9     0.51   Walmart GV (fiber study,
 2. Whole wheat flour                    96.0     0.52   Walmart GV (fiber study,
 3. Black beans (dry)                    81.0     0.62   Walmart GV (fiber study,
 4. Brown lentils (dry)                  77.7     0.64   Walmart GV (fiber study,
 5. Navy beans (dry)                     75.9     0.66   Walmart GV (fiber study,
 6. Green split peas (dry)               73.9     0.68   Walmart GV (fiber study,
 7. Chickpeas (dry)                      56.7     0.88   Walmart (fiber study, au
 8. Red lentils (dry)                    56.0     0.89   Walmart (fiber study, au
 9. Whole wheat spaghetti                53.4     0.94   Walmart GV (fiber study,
10. Peanut butter                        50.7     0.99   Walmart GV (fiber study,


CHEAPEST 10, DIAAS-ADJUSTED (25 foods carry a DIAAS score)

 #  Food                                DIAAS  adj g/$    $/50g
--------------------------------------------------------------------------
 1. Pinto beans (dry)                    0.59     57.8     0.87
 2. Chicken drumsticks (bone-in)         1.08     50.3     0.99
 3. Brown lentils (dry)                  0.63     49.0     1.02
 4. Black beans (dry)                    0.59     47.8     1.05
 5. Chickpeas (dry)                      0.83     47.1     1.06
 6. Navy beans (dry)                     0.57     43.3     1.15
 7. Whole wheat flour                    0.45     43.2     1.16
 8. Green split peas (dry)               0.58     42.9     1.17
 9. Red lentils (dry)                    0.63     35.3     1.42
10. Eggs (large)                         1.13     34.4     1.45


BIGGEST MOVERS ONCE QUALITY IS ACCOUNTED FOR
(negative = fell down the ranking, positive = climbed)

Food                                 raw   adj   move
--------------------------------------------------------------------------
Peanut butter                         10    21    -11
Whole wheat spaghetti                  9    19    -10
100% whole wheat bread                14    23     -9
Whole wheat flour                      2     7     -5
  ...
Eggs (large)                          15    10     +5
Mozzarella (low-moisture part-skim)    16    11     +5
Whole milk                            17    12     +5
Chicken drumsticks (bone-in)          11     2     +9

==========================================================================
Cheapest before quality adjustment: Pinto beans (dry) ($0.51/50 g)
Cheapest after quality adjustment:  Pinto beans (dry) ($0.87/50 g)

Source: Daily Life Hacks Food Value Data (2026.1)
Study:  https://www.daily-life-hacks.com/protein-per-dollar-adjusted-for-quality/
Terms:  https://www.daily-life-hacks.com/methodology/#data-license
```

</details>

**The interesting bit:** bone-in chicken drumsticks climb nine places once quality is
counted, and peanut butter drops eleven. Pinto beans still win, but the gap narrows
from "nothing else is close" to "beans by a nose over chicken."

---

## `fiber_gap.mjs`

**Question:** most US adults eat about 16 g of fiber a day against a 28 g Daily Value.
What does closing that 12 g gap actually cost?

The script finds the cheapest single foods that close it, breaks the answer down by
grocery aisle, then sanity-checks the theoretical floor against the fully costed
day-menus in `fiber-day-cost-2026.csv`.

```
node examples/fiber_gap.mjs
```

Requires Node 18 or newer. No `npm install`.

<details open>
<summary>Output</summary>

```text
Closing the fiber gap: 16 g typical intake -> 28 g Daily Value
Gap to close: 12 g of fiber per day
US national prices, July 2026, as-purchased with USDA refuse removed
==========================================================================

CHEAPEST 10 WAYS TO BUY 12 g OF FIBER (of 53 foods indexed)

 #  Food                              g/$  12g cost  grams needed
--------------------------------------------------------------------------
 1. Whole wheat flour                77.8     $0.15  112 g
 2. Green split peas (dry)           71.0     $0.17  54 g
 3. Pinto beans (dry)                70.8     $0.17  77 g
 4. Black beans (dry)                58.1     $0.21  77 g
 5. Popcorn kernels                  57.7     $0.21  83 g
 6. Pearled barley (dry)             57.1     $0.21  77 g
 7. Navy beans (dry)                 52.0     $0.23  78 g
 8. Old-fashioned rolled oats        35.8     $0.34  119 g
 9. Whole wheat spaghetti            35.4     $0.34  130 g
10. Chickpeas (dry)                  33.8     $0.36  98 g


BEST OPTION IN EACH AISLE (8 categories)

Category                  Best food                     12g cost
--------------------------------------------------------------------------
Whole grains              Whole wheat flour                $0.15
Dried beans & peas        Green split peas (dry)           $0.17
Nuts & seeds              Chia seeds                       $0.36
Canned                    Canned black beans               $0.43
Frozen vegetables         Frozen green peas                $0.68
Fresh vegetables          Carrots (whole, bagged)          $0.75
Fresh fruit               Bananas                          $1.03
Dried fruit               Prunes (dried plums)             $1.48


REALITY CHECK: FULLY COSTED DAYS FROM data/fiber-day-cost-2026.csv

Day                                    meals  fiber g     cost
--------------------------------------------------------------------------
Day 1: Rock-bottom dry goods               5     31.9    $0.62
Day 2: No-cook convenience                 6     31.7    $1.74
Day 3: Fresh produce lover                 5     31.4    $4.18
Day 4: Restaurant day                      4     31.0   $14.42
Day 5: Realistic mixed                     7     32.1    $1.99

==========================================================================
Theoretical floor: $0.15 of Whole wheat flour covers the 12 g gap.
Cheapest full day in the data: Day 1: Rock-bottom dry goods at $0.62 for 31.9 g of fiber.
That day beats the 28 g Daily Value: yes.

Source: Daily Life Hacks Food Value Data (2026.1)
Study:  https://www.daily-life-hacks.com/fiber-per-dollar-cheapest-high-fiber-foods/
Terms:  https://www.daily-life-hacks.com/methodology/#data-license
```

</details>

**The interesting bit:** the aisle breakdown is the whole story. The gap costs 15 cents
in the baking aisle and $1.48 in the dried fruit aisle - a ten-fold spread for the same
12 grams. And the "rock-bottom dry goods" day clears the entire 28 g Daily Value for
62 cents, which is less than most single servings of the fresh-produce day.

---

Source: Daily Life Hacks Food Value Data (2026.1) - <https://www.daily-life-hacks.com/data/>
Terms of use: <https://www.daily-life-hacks.com/methodology/#data-license>
