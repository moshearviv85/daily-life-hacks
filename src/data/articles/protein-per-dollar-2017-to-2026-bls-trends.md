---
title: "Protein per Dollar, 2017 to October 2026"
excerpt: "Grade A large eggs fell from 62.64 g of protein per dollar in June 2019 to 12.10 g in March 2025, then rebounded to 32.48 g by October 2026."
category: "nutrition"
tags: ["protein per dollar", "BLS food prices", "egg prices", "ground beef price", "grocery inflation"]
cluster: "budget-protein"
parentPillar: "high-protein-on-a-budget-complete-guide"
image: "/images/protein-per-dollar-2017-to-2026-bls-trends-chart.jpg"
imageAlt: "Line chart of protein grams per dollar for eggs, whole milk, whole chicken, chicken breast, ground beef, and spaghetti from January 2017 to October 2026"
quickAnswer: "On the U.S. city average, grade A large eggs went from 62.64 g of protein per dollar in June 2019 to 12.10 g in March 2025, then 32.48 g in October 2026. Ground beef, 100% beef, went from 21.92 g per dollar in January 2017 to 11.53 g in October 2026. The USDA protein per 100 g stayed put. The BLS price moved."
date: 2026-11-26
dateModified: 2026-11-26
substantiveUpdate: 2026-11-26
author: "David Miller"
featured: false
editorsPick: false
whatsHot: false
mustRead: false
faq:
  - question: "How has protein per dollar changed since 2017?"
    answer: "On the U.S. city average in bls-nutrition-per-dollar-monthly.csv, the six staples didn't move together. Eggs peaked at 62.64 g per dollar in June 2019, hit 12.10 g in March 2025, and were 32.48 g in October 2026. Ground beef went from 21.92 g in January 2017 to 11.53 g in October 2026. Milk went from 37.06 g to 29.99 g, boneless breast from 31.72 g to 24.90 g, and spaghetti from 45.15 g to 42.74 g. The USDA protein per 100 g on each series is unchanged."
  - question: "Why did eggs drop from 62.64 g to 12.10 g of protein per dollar?"
    answer: "The file records the price, not the cause. Grade A large eggs are 12.56 g of protein per 100 g on every row, FDC 171287. In June 2019 the BLS dozen was $1.203 and the series shows 62.64 g per dollar. In March 2025 the dozen was $6.227 and the series shows 12.10 g. By October 2026 the dozen was $2.320 and the series shows 32.48 g. Same egg. Different dozen price. A grocery ranking from one summer can't see that swing."
  - question: "Did ground beef get less protein, or more expensive?"
    answer: "More expensive. The series uses FDC 174036, 17.17 g of protein per 100 g, on every month. January 2017 was 21.92 g per dollar at $3.553 a pound. The high in this file is 21.96 g in April 2017, barely above January. October 2026 is 11.53 g at $6.755 a pound. The low is 11.25 g in August 2026. October is a little off that low, not a return to 2017."
  - question: "Which region got the most protein per dollar in October 2026?"
    answer: "Only some series have all four census regions in October 2026. Whole chicken was highest in the South at 26.87 g per dollar and lowest in the West at 23.56 g. Boneless breast was highest in the Midwest at 27.09 g and lowest in the West at 22.61 g. Ground beef was highest in the South at 12.32 g and lowest in the West at 10.68 g. The latest file has no West egg row, and the Northeast egg row is October 2024, not October 2026."
  - question: "Is October 2025 in the BLS protein series?"
    answer: "Not for these six U.S. city average series. bls-nutrition-per-dollar-monthly.csv skips October 2025 for eggs, milk, whole chicken, chicken breast, ground beef, and spaghetti. Whole chicken also skips May 2020. The chart leaves a gap on those months instead of connecting a guess. October 2026 is present for all six. A regional row in bls-nutrition-per-dollar-latest.csv can be an older month when that region has no newer published price."
---

Eggs in June 2019 bought 62.64 g of protein per dollar. March 2025 bought 12.10 g. October 2026 bought 32.48 g. I keep wanting that to be a different egg. It isn't. Every row is the same USDA record, [FDC 171287](https://fdc.nal.usda.gov/food-details/171287/nutrients), 12.56 g of protein per 100 g. The dozen price is what moved, from $1.203 to $6.227 and back to $2.320.

The monthly history is bls-nutrition-per-dollar-monthly.csv, U.S. city average, January 2017 through October 2026. The regional snapshot is bls-nutrition-per-dollar-latest.csv. Prices are the [BLS Average Price survey](https://www.bls.gov/cpi/factsheets/average-prices.htm), not one store's shelf. A July package ranking, including the [quality-adjusted protein list](/protein-per-dollar-adjusted-for-quality/), is one month. This is the decade those months sit inside.

## How has protein per dollar changed for eggs, milk, chicken, beef, and pasta?

**Eggs swung the hardest. Beef kept a little over half of its January 2017 grams per dollar. Pasta barely moved.**

The protein per 100 g is fixed on each series, so a falling grams-per-dollar line is a rising price. Eggs are 12.56 g. Whole milk is 3.15 g, [FDC 171265](https://fdc.nal.usda.gov/food-details/171265/nutrients). Whole chicken is 18.6 g, [FDC 171447](https://fdc.nal.usda.gov/food-details/171447/nutrients). Boneless skinless breast is 22.5 g, [FDC 171077](https://fdc.nal.usda.gov/food-details/171077/nutrients). Ground beef, the 80/20 record the series uses, is 17.17 g, [FDC 174036](https://fdc.nal.usda.gov/food-details/174036/nutrients). Dry spaghetti is 13.04 g, [FDC 169736](https://fdc.nal.usda.gov/food-details/169736/nutrients). None of those six numbers changes from 2017 to 2026 in this file.

| Staple | BLS code | January 2017 | High | Low | October 2026 |
|---|---|---|---|---|---|
| Eggs, grade A large, per dozen | 708111 | 47.13 g at $1.599 | 62.64 g, June 2019, $1.203 | 12.10 g, March 2025, $6.227 | 32.48 g at $2.320 |
| Whole milk, per gallon | 709112 | 37.06 g at $3.318 | 43.32 g, July 2018, $2.839 | 28.49 g, June 2026, $4.317 | 29.99 g at $4.101 |
| Whole chicken, per lb | 706111 | 36.29 g at $1.418 | 37.79 g, February 2020, $1.362 | 24.67 g, June 2025, $2.086 | 25.40 g at $2.026 |
| Chicken breast, boneless, per lb | FF1101 | 31.72 g at $3.218 | 35.24 g, September 2018, $2.896 | 21.50 g, September 2022, $4.746 | 24.90 g at $4.099 |
| Ground beef, 100% beef, per lb | 703112 | 21.92 g at $3.553 | 21.96 g, April 2017, $3.547 | 11.25 g, August 2026, $6.923 | 11.53 g at $6.755 |
| Spaghetti and macaroni, per lb | 701322 | 45.15 g at $1.310 | 55.44 g, October 2021, $1.067 | 39.80 g, February 2023, $1.486 | 42.74 g at $1.384 |

October 2026 eggs, 32.48 g, are still well under January 2017's 47.13 g. The rebound from 12.10 g is real. It isn't a return to 2019. Beef's October figure, 11.53 g, is a little over half of January 2017's 21.92 g. The file's actual low is August 2026 at 11.25 g, so October isn't even the bottom. April 2017 at 21.96 g is the high, and it's a hair above January. Beef didn't have a golden month later. It had a long slide.

Milk's high is July 2018 at 43.32 g, when the gallon was $2.839. The low is June 2026 at 28.49 g and $4.317. October 2026 is 29.99 g at $4.101, close to that low. Whole chicken peaked in February 2020 at 37.79 g and was 25.40 g in October 2026. Breast peaked in September 2018 at 35.24 g, bottomed in September 2022 at 21.50 g, and was 24.90 g in October 2026. Spaghetti's whole decade fits between 39.80 g and 55.44 g. January 2017 was 45.15 g. October 2026 was 42.74 g. If you want a staple that didn't reprice your protein, it's the pasta box.

## The lines, with the missing months left blank

![Line chart of protein grams per dollar for eggs, whole milk, whole chicken, chicken breast, ground beef, and spaghetti from January 2017 to October 2026](/images/protein-per-dollar-2017-to-2026-bls-trends-chart.jpg)

The U.S. city average series skips October 2025 for all six foods. Whole chicken also skips May 2020. The line breaks there. I didn't average the neighbors and call it a month. October 2026 is in the file for every one of these series.

Eggs are the line you can see from across the room. The other five look polite next to a dozen that went from $1.203 to $6.227. Breast and whole chicken drift down and then flatten. Milk steps down after 2018 and stays there. Beef's decline is the quiet one, because 21.92 to 11.53 doesn't spike. It just fails to recover. Pasta wiggles and ends near where it started.

Spaghetti also carries fiber on the same rows, 3.2 g per 100 g. October 2026 is 10.49 g of fiber per dollar, against 11.08 g in January 2017. That's a side column, not the ranking. The protein line is the one the chart draws.

## October 2026, when the region actually has an October

bls-nutrition-per-dollar-latest.csv is not "every region, this month." A row is the latest published month for that series and that area. Three of these foods have the Northeast, Midwest, South, West, and the U.S. city average all dated October 2026. Eggs, milk, and spaghetti don't.

| Food | Northeast | Midwest | South | West | U.S. city average |
|---|---:|---:|---:|---:|---:|
| Whole chicken, per lb | 23.59 g, $2.182 | 25.72 g, $2.001 | 26.87 g, $1.915 | 23.56 g, $2.184 | 25.40 g, $2.026 |
| Chicken breast, boneless | 25.66 g, $3.977 | 27.09 g, $3.768 | 25.27 g, $4.039 | 22.61 g, $4.514 | 24.90 g, $4.099 |
| Ground beef, 100% beef | 11.66 g, $6.681 | 11.64 g, $6.693 | 12.32 g, $6.320 | 10.68 g, $7.290 | 11.53 g, $6.755 |

South wins the chicken and the beef on this month. Whole chicken is 26.87 g per dollar in the South at $1.915 a pound, and 23.56 g in the West at $2.184. Breast is a Midwest number, 27.09 g at $3.768, against 22.61 g in the West at $4.514. Beef is 12.32 g in the South at $6.320, and 10.68 g in the West at $7.290. None of those gaps looks like a different animal. They look like the price.

The foods people ask about first are the ones with holes. Eggs in October 2026 are 32.48 g at $2.320 for the U.S. city average and 31.77 g at $2.372 in the South. The Northeast's latest egg row is October 2024, 20.27 g at $3.717. The Midwest's is September 2025, 20.78 g at $3.626. The latest file has no West row for grade A large eggs. Don't rank a 2024 Northeast dozen against an October 2026 South dozen and call it this month.

Milk in October 2026 is 29.99 g nationally, 31.32 g in the South at $3.927 a gallon, and 27.05 g in the West at $4.546. The Northeast milk row is October 2024, 27.82 g. The Midwest milk row is April 2020, 47.78 g at $2.574. That 2020 gallon is a historical price, not a Midwestern bargain you can drive to.

Spaghetti in October 2026 is 42.74 g nationally and 45.96 g in the South at $1.287 a pound. The other regions are older: Northeast April 2024 at 32.45 g, Midwest September 2022 at 38.58 g, West April 2025 at 36.44 g. The South is the only census region on this item with an October 2026 row.

## What a single summer ranking can't see

The [7-day high-protein grocery list](/high-protein-grocery-list-50-grams/) prices eggs, breast, and ground beef off the July 2026 BLS averages in the day file. Useful cart. It can't tell you that eggs were 62.64 g per dollar six years earlier, or that beef fell from 21.92 g per dollar to 11.53 g. The [50 gram protein day](/what-50-grams-of-protein-costs-per-day/) has the same limit. It's a menu at one snapshot. The combined [cost of 50 g of protein and 30 g of fiber](/cost-of-50g-protein-and-30g-fiber-per-day/) is that menu with the fiber counted once. Neither page is this chart.

If the question is which animal food is cheap on a package price, the [animal protein ranking](/animal-protein-per-dollar-ranked/) is the grocery cut. If the question is whether the cheap month stayed cheap, it's this file. October 2026 eggs at 32.48 g per dollar are not the 2019 deal and not the March 2025 wreck. Beef at 11.53 g is the weak one of the six, and pasta at 42.74 g is the one that let you ignore the decade.

The dozen price moved. The egg didn't.

<!-- numbers-source: public/data/bls-nutrition-per-dollar-monthly.csv U.S. city average rows; public/data/bls-nutrition-per-dollar-latest.csv regional rows with the month each row actually carries -->
