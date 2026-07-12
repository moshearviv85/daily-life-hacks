# Reddit Scaling Playbook — Daily Life Hacks

**Goal:** qualified traffic + email, not spam. Brand voice = David Miller (helpful, specific, no hype).

## Rules (non-negotiable)

1. Value first. Soft link only when it directly answers the thread.
2. No identical copy across subreddits. No link dumps.
3. Disclose affiliation when linking your site (`I write at daily-life-hacks.com` once, casually).
4. Never post medical advice threads (IBS, diabetes, etc.). Food-first only.
5. Track: post URL, subreddit, upvotes @24h/@7d, referral clicks, email signups.

## Target subreddits (start)

| Subreddit | Angle | Cadence |
|-----------|-------|---------|
| r/EatCheapAndHealthy | budget + fiber/protein math | 3×/week |
| r/mealprep | systems, bowls, batch cooking | 2×/week |
| r/nutrition (careful) | data posts only, no medical claims | 1×/week |
| r/cooking | technique (beans, cast iron, rice) | 2×/week |
| r/Frugal | grocery math, $60 week | 2×/week |
| r/vegetarian | bean/lentil high-protein | 1×/week |
| r/slowcooking | bean soups, budget stews | 1×/week |

## First 10 post drafts (ready to adapt)

### 1 — r/EatCheapAndHealthy
**Title:** We ranked 53 foods by grams of fiber per dollar. Dry split peas crushed it.
**Body:** Short table top-5 + method (USDA + shelf prices). Link: fiber per dollar study OR fiber budget guide. CTA soft.

### 2 — r/EatCheapAndHealthy
**Title:** Protein per dollar: dried pinto beans vs chicken breast vs eggs (real July prices)
**Body:** 3 numbers + what we actually buy weekly. Link: protein pillar.

### 3 — r/mealprep
**Title:** High fiber burrito bowl meal prep that still tastes good on Thursday
**Body:** Components + storage order. Link optional after value.

### 4 — r/Frugal
**Title:** Closing the fiber gap (~15g → ~28g) without buying fancy “gut” products
**Body:** Dry goods aisle playbook summary. Link fiber guide.

### 5 — r/cooking
**Title:** Same-day quick soak for dried beans (no overnight planning)
**Body:** Steps only. Link how-to-cook-dried-beans if asked.

### 6 — r/mealprep
**Title:** Meal prep for one on a budget: 5 lunches that do not look sad
**Body:** List + costs. Link budget meal prep article after rewrite.

### 7 — r/slowcooking
**Title:** Split pea soup as a fiber workhorse (~16g/bowl math)
**Body:** Recipe outline. Link recipe.

### 8 — r/vegetarian
**Title:** Complete protein without powders: beans + grains across the day
**Body:** Explain lysine/methionine simply. Link protein guide.

### 9 — r/Frugal
**Title:** The $60 week dinner framework (2 adults) — what stayed / what broke
**Body:** Honest swaps. Link budget playbook.

### 10 — r/cooking
**Title:** Cast iron seasoning without the mythology
**Body:** Short method. Link tip article.

## Scaling system

1. Maintain `pipeline-data/reddit-log.csv` (create on first post): date, subreddit, title, url, link_used, upvotes_24h, upvotes_7d, notes.
2. Double down on formats with ≥50 upvotes OR visible referral spikes.
3. Kill formats that get removed/downvoted twice.
4. Never automate Reddit posting from this repo (manual only).

## Agent prompt

```
Draft a Reddit post for Daily Life Hacks.
Subreddit: {SUB}
Article slug to support: {SLUG}
Voice: David Miller — specific numbers, dry humor, no detox/supplements.
Output: title + body (markdown), where the link goes (or “no link”), and 2 reply FAQs.
Max 1 link. Prefer answering fully without a link if the sub is link-sensitive.
```
