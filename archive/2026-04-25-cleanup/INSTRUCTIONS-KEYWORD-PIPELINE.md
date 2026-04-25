# INSTRUCTIONS: Pinterest Keyword Pipeline (4-Script System)
*For Gemini — Read this entire document before writing a single line of code.*

---

## Background & Context

This is a content marketing pipeline for **daily-life-hacks.com** (Astro 5 + Cloudflare Pages). The site targets an English-speaking American audience with nutrition and recipe content, distributed primarily via Pinterest.

**The core strategy:**
Each article supports 4 Pinterest pin variants. Each variant has:
- A **unique URL** based on the keyword itself (not a version suffix)
- A **different title** that is the actual long-tail keyword
- A **dedicated pin image** with that keyword printed on it

Example: the base article `/high-fiber-fruits` gets 4 pin URLs:
```
daily-life-hacks.com/high-fiber-fruits-for-weight-loss     ← looks like a real article
daily-life-hacks.com/high-fiber-fruits-list-for-gut-health
daily-life-hacks.com/best-high-fiber-low-sugar-fruits
daily-life-hacks.com/high-fiber-fruits-to-eat-daily
```
All 4 proxy transparently to `/high-fiber-fruits` via the Cloudflare Smart Router.
Google sees the correct canonical on all of them. No duplicate content issue.

**What already exists and must NOT be touched (unless explicitly listed below):**
- `src/layouts/BaseLayout.astro` — do not modify
- `src/data/articles/*.md` — 43 published articles exist; do not delete or rewrite body content
- `pipeline-data/pins.json` — master topic DB (82 entries), read-only input
- `pipeline-data/content-tracker.json` — read/write
- `pipeline-data/image-scenes.json` — read-only, 100 image scenes
- `src/content.config.ts` — already has `faq` field defined, do not modify
- `src/pages/[slug].astro` — already renders FAQ accordion + FAQPage JSON-LD, do not modify

**What must be modified as part of this pipeline:**
- `functions/[[path]].js` — update routing logic (see Script 1 section)

---

## System Architecture Overview

```
pipeline-data/topics-queue.json     pipeline-data/content-tracker.json
              +                                     +
              +---------------------+---------------+
                                    |
                          [Script 1: keyword-research.py]
                                    |
        +-----------+---------------+--------------+---------------+
        |           |                              |               |
keyword-      router-mapping.json           kv-upload.json   functions/
clusters.json (slug→{v1:{url_slug,title}})  (for Wrangler)  [[path]].js
        |                                                    (updated)
        |                              |
   [Script 2: write-articles.py]   [Script 3: generate-images.py]
        |                              |
  new article .md files          public/images/{slug}-main.jpg
  (+ FAQ frontmatter)            public/images/pins/{slug}_vN.jpg
        |                              |
        +------------------+-----------+
                           |
                  [Script 4: export-publer.py]
                           |
                  pipeline-data/pins-export.csv
```

**Run order:** 1 → 2 → 3 → 4. Scripts 2 and 3 can run in any order after Script 1 is complete.

---

## Data Schemas (Source of Truth)

### `pipeline-data/topics-queue.json` (you create this file as a starting point)
```json
[
  "high fiber snacks for weight loss",
  "gut health smoothie recipes"
]
```
A simple list of topic ideas (plain English). Entry point for NEW content. Start as empty array `[]`.

---

### `pipeline-data/keyword-clusters.json` (Script 1 creates/updates)
```json
{
  "high-fiber-fruits": {
    "base_query": "high fiber fruits",
    "category": "nutrition",
    "cluster": [
      { "keyword": "high fiber fruits for weight loss", "url_slug": "high-fiber-fruits-for-weight-loss", "trend_score": 87, "variant": "v1" },
      { "keyword": "high fiber fruits list for gut health", "url_slug": "high-fiber-fruits-list-for-gut-health", "trend_score": 72, "variant": "v2" },
      { "keyword": "best high fiber low sugar fruits", "url_slug": "best-high-fiber-low-sugar-fruits", "trend_score": 65, "variant": "v3" },
      { "keyword": "high fiber fruits to eat daily", "url_slug": "high-fiber-fruits-to-eat-daily", "trend_score": 54, "variant": "v4" }
    ],
    "existing_article": true,
    "status": "researched",
    "researched_at": "2026-03-03T10:00:00"
  }
}
```
`url_slug` = the keyword converted to lowercase-hyphenated slug format.

---

### `pipeline-data/router-mapping.json` (Script 1 creates/updates)
```json
{
  "high-fiber-fruits": {
    "v1": { "url_slug": "high-fiber-fruits-for-weight-loss", "title": "High Fiber Fruits for Weight Loss" },
    "v2": { "url_slug": "high-fiber-fruits-list-for-gut-health", "title": "High Fiber Fruits List for Gut Health" },
    "v3": { "url_slug": "best-high-fiber-low-sugar-fruits", "title": "Best High Fiber Low Sugar Fruits" },
    "v4": { "url_slug": "high-fiber-fruits-to-eat-daily", "title": "High Fiber Fruits to Eat Daily" }
  }
}
```
Titles: Title Case, max 60 characters.

---

### `pipeline-data/kv-upload.json` (Script 1 creates/updates)
Format required by Wrangler CLI for bulk KV upload:
```json
[
  { "key": "high-fiber-fruits-for-weight-loss",    "value": "{\"type\":\"internal\",\"base_slug\":\"high-fiber-fruits\"}" },
  { "key": "high-fiber-fruits-list-for-gut-health", "value": "{\"type\":\"internal\",\"base_slug\":\"high-fiber-fruits\"}" },
  { "key": "best-high-fiber-low-sugar-fruits",      "value": "{\"type\":\"internal\",\"base_slug\":\"high-fiber-fruits\"}" },
  { "key": "high-fiber-fruits-to-eat-daily",        "value": "{\"type\":\"internal\",\"base_slug\":\"high-fiber-fruits\"}" }
]
```
After Script 1 runs, the developer uploads this with:
```bash
wrangler kv bulk put --binding ROUTES_KV pipeline-data/kv-upload.json
```
This file is ALWAYS regenerated from scratch (not incrementally) to reflect the current full state.

---

## ROUTER UPDATE: `functions/[[path]].js`

**This file must be updated as part of this project.** The current router only handles `-v{n}` URL patterns. It must be updated to do a KV-first lookup for any unrecognized path, enabling full keyword-based URLs.

**New routing logic (replace the existing file with this logic):**

```
1. GUARD: Skip static assets and API routes (same as current)

2. KV LOOKUP (new — runs for ALL paths, not just -v{n}):
   - Look up the current path (without leading slash) in ROUTES_KV
   - If found: proceed to ROUTING DECISION

3. FALLBACK — -v{n} PATTERN (backward compat for old Pinterest links):
   - If KV miss AND path matches /^(.+)-v(\d+)$/
   - Use base_slug derived from stripping the suffix
   - Proceed as internal proxy

4. PASS THROUGH:
   - If neither KV match nor -v{n} pattern: return env.ASSETS.fetch(request)

5. ROUTING DECISION (same as current):
   - type === "external" → 302 redirect to external_url
   - type === "internal" → proxy to base_slug page

6. ANALYTICS LOGGING (same as current):
   - Log to D1 with versioned_slug, base_slug, route_type, version, query_params, referrer, user_agent, country
   - For keyword URLs, version = null (no version number)
```

Keep all existing code structure and comments. Only change the detection/routing logic as described above.

---

## SCRIPT 1: `scripts/1-keyword-research.py`

### Purpose
Discovers 4 high-volume long-tail keywords per article topic. Outputs: `keyword-clusters.json`, `router-mapping.json`, `kv-upload.json`. Also updates the router file.

### Python Libraries Required
```
requests
pytrends
python-dotenv
```
No API key needed. No Gemini call.

### Input Sources
1. **Existing articles:** Read `pipeline-data/content-tracker.json`, include all entries where `src/data/articles/{slug}.md` exists on disk.
2. **New topics:** Read `pipeline-data/topics-queue.json` if it exists. Convert each topic string to a slug (lowercase, spaces → hyphens, strip special chars).
3. **Skip:** Any slug already in `keyword-clusters.json` with `status: "researched"` — skip unless `--force` flag is passed.

### Step-by-Step Logic Per Slug

**Step A — Build base query**
Convert slug to readable query: `high-fiber-fruits` → `"high fiber fruits"`

**Step B — Google Autocomplete (primary source)**
Call this endpoint 3 times per slug with these query variants:
```
https://suggestqueries.google.com/complete/search?client=firefox&q={encoded_query}&hl=en&gl=us
```
- Variant 1: base query as-is
- Variant 2: base query + `" for"`
- Variant 3: base query + `" to"`

Parse response: `json.loads(response.text)[1]` is the list of suggestions.
Collect all unique suggestions, deduplicate. Target: 8–15 candidates.
Add `time.sleep(1)` between each call.

**Step C — Filter candidates**
Discard if:
- Shorter than 25 characters
- Contains: `cure`, `treat`, `heal`, `disease`, `disorder`, `syndrome`, `cancer`, `diabetes`, `IBS`, `Crohn`
- Contains: `detox`, `cleanse`, `reset`, `flush`
- Longer than 70 characters
- Identical to the base slug query

Keep up to 10 candidates after filtering.

**Step D — PyTrends scoring**
If fewer than 4 candidates remain, skip PyTrends and assign fallback scores: 60, 50, 40, 30.

Otherwise:
```python
from pytrends.request import TrendReq
pytrends = TrendReq(hl='en-US', tz=360)
```
Compare candidates in batches of 5 (PyTrends limit):
```python
pytrends.build_payload(batch, timeframe='today 12-m', geo='US')
data = pytrends.interest_over_time()
# score = data[keyword].mean() for each keyword
```
Aggregate scores. Pick top 4 by score.

**Error handling for PyTrends:**
- 429: wait 60s, retry once. If still 429: use autocomplete position order as proxy for popularity.
- Any other exception: log warning, continue with autocomplete order.

**Step E — Build url_slug for each keyword**
Convert keyword to slug: lowercase, spaces → hyphens, remove special chars.
Example: `"high fiber fruits for weight loss"` → `"high-fiber-fruits-for-weight-loss"`

**Step F — Format titles for router-mapping**
Apply Title Case (capitalize all words except: for, to, the, a, an, of, in, on, with, and, but, or).
Truncate to 60 characters at word boundary if needed.
No trailing punctuation.

**Step G — Determine category**
Look up slug in `content-tracker.json`. If not found, check `pins.json`. If still unknown: infer from base_query keywords (recipe/meal/cook/bake/smoothie/bowl → recipes, else → nutrition).

**Step H — Write outputs (incremental)**
After each slug, immediately update:
1. `pipeline-data/keyword-clusters.json`
2. `pipeline-data/router-mapping.json`

After ALL slugs complete, regenerate from scratch:
3. `pipeline-data/kv-upload.json` — full rebuild every run

**Step I — Update the Cloudflare router**
Update `functions/[[path]].js` with the new routing logic described in the ROUTER UPDATE section above.

### Logging
```
[1/43] high-fiber-fruits
  Autocomplete: 12 candidates found
  After filter: 8 remain
  PyTrends: scored and sorted
  Top 4: "High Fiber Fruits for Weight Loss" (87) | "High Fiber Fruits List for Gut Health" (72) | ...
  Saved.
```

### CLI Flags
```bash
python scripts/1-keyword-research.py                  # normal run (skip already researched)
python scripts/1-keyword-research.py --force          # reprocess all slugs
python scripts/1-keyword-research.py --existing-only  # skip topics-queue.json, only existing articles
```

---

## SCRIPT 2: `scripts/2-write-articles.py`

### Purpose
Writes new articles via Gemini API, or updates frontmatter of existing articles. Generates FAQ for all articles (new and existing).

### Python Libraries Required
```
requests
python-dotenv
```

### API
Gemini REST API. `GEMINI_API_KEY` from `.env`.
- Model: `gemini-2.5-flash`
- Temperature: `0.85`
- Max output tokens: `8192`

### Logic Per Slug in `keyword-clusters.json`

**Case A: Existing article** (file exists at `src/data/articles/{slug}.md`)

1. Read the existing file
2. Update frontmatter fields ONLY:
   - `title` → v1 keyword title (from `router-mapping.json`)
   - `tags` → include all 4 keywords (CamelCase, no spaces, no hashes), keep original non-keyword tags up to 8 total
   - `faq` → generate via Gemini (see FAQ prompt below) and add to frontmatter
3. Do NOT touch the article body
4. Save file, update `content-tracker.json` status to `article_written`

**Case B: New article** (file does NOT exist)
Call Gemini API with the full writing prompt below. Save to `src/data/articles/{slug}.md`. Update `content-tracker.json`.

### FAQ Generation (applies to BOTH existing and new articles)

Make a separate Gemini API call to generate the FAQ. Prompt:
```
You are an SEO expert. Generate 5 frequently asked questions (with answers) for an article about: "{base_query}"

The article keywords are: {v1_keyword}, {v2_keyword}, {v3_keyword}, {v4_keyword}
Category: {category}

Rules:
- Questions must be things real people search for (conversational, natural phrasing)
- Answers: 2-4 sentences, informative but concise
- No medical claims (use "may", "could", "might")
- No detox/cleanse language
- Use contractions (it's, don't, they're)
- Questions and answers in English

Return ONLY a JSON array like this, no markdown:
[
  {"question": "Question here?", "answer": "Answer here."},
  {"question": "Question here?", "answer": "Answer here."}
]
```

Insert into frontmatter as:
```yaml
faq:
  - question: "Question here?"
    answer: "Answer here."
  - question: "Question here?"
    answer: "Answer here."
```

### Full Writing Prompt (new articles only)
Send as single user message:

```
You are writing a blog article for Daily Life Hacks (daily-life-hacks.com), a US-focused healthy lifestyle site.

ARTICLE DETAILS:
- Primary keyword (use as H1 title): {v1_keyword}
- Supporting keywords to incorporate naturally: {v2_keyword}, {v3_keyword}, {v4_keyword}
- Category: {category}  [nutrition OR recipes]
- Target length: 1400–2000 words
- Slug: {slug}

MANDATORY CONTENT RULES:
- Always use contractions: it's, don't, they're, you'll, won't (never "it is", "do not")
- Tone: warm, conversational, personal blogger. Occasional casual fragments are fine.
- No em dashes (—). Use regular hyphens sparingly, or rewrite the sentence.
- No emojis anywhere.
- No "Conclusion" heading. Close naturally with 1 short paragraph.
- No sign-off phrases: never "Enjoy!", "Happy eating!", "Give it a try!", "You won't regret it!"
- No medical claims: never "cures", "treats", "heals", "prevents", "fights". Use "may support", "could help", "might improve", "is thought to".
- No detox/cleanse language: use "refresh", "feel lighter" instead.
- No absolute statements: never "is good for your gut" — always hedge with "could", "may", "might".
- No banned AI words: Furthermore, Moreover, In conclusion, Delve into, Dive into, It's important to note, It's worth noting, In today's world, Unlock, Elevate, Navigating, Game-changer, Revolutionize, Mouthwatering.
- Vary sentence lengths aggressively: mix short punchy sentences with longer ones.
- Sprinkle 1–2 personal-sounding anecdotes naturally.
- Include supporting keywords naturally in 1–2 H2 or H3 headings and in body text.

IF CATEGORY IS "recipes":
- ONE main recipe with exact measurements (grams or cups/tbsp — never "a handful")
- Realistic calories per serving (calculate accurately)
- Include prep time, cook time, total time, servings
- 2–3 variation ideas after the main recipe
- Tips/storage section
- Ingredients and steps go in frontmatter only (not in the body)

IF CATEGORY IS "nutrition":
- Informational article, no recipe required
- Specific data: fiber grams, nutrients, % daily value where relevant
- Mix of H2 and H3 headings
- Practical "how to eat more of this" section

OUTPUT FORMAT:
Return ONLY the complete markdown file content, starting with --- frontmatter. No explanation, no code block markers.

FRONTMATTER — nutrition:
---
title: "{v1_keyword in Title Case}"
excerpt: "{1 sentence, 120–150 chars, no medical claims, conversational}"
category: "nutrition"
tags: ["{kw1NoCaps}", "{kw2NoCaps}", "{kw3NoCaps}", "{kw4NoCaps}", "GutHealth", "HealthyEating"]
image: "/images/{slug}-main.jpg"
imageAlt: "{descriptive, no keyword stuffing}"
date: {YYYY-MM-DD}
author: "Daily Life Hacks Team"
featured: false
editorsPick: false
whatsHot: false
mustRead: false
faq:
  - question: "{FAQ question 1}?"
    answer: "{FAQ answer 1.}"
  - question: "{FAQ question 2}?"
    answer: "{FAQ answer 2.}"
  - question: "{FAQ question 3}?"
    answer: "{FAQ answer 3.}"
  - question: "{FAQ question 4}?"
    answer: "{FAQ answer 4.}"
  - question: "{FAQ question 5}?"
    answer: "{FAQ answer 5.}"
---

FRONTMATTER — recipes:
---
title: "{v1_keyword in Title Case}"
excerpt: "{1 sentence, 120–150 chars, conversational}"
category: "recipes"
tags: ["{kw1}", "{kw2}", "{kw3}", "{kw4}", "EasyRecipe", "GutHealth"]
image: "/images/{slug}-main.jpg"
imageAlt: "{descriptive alt text}"
date: {YYYY-MM-DD}
author: "Daily Life Hacks Team"
featured: false
editorsPick: false
whatsHot: false
mustRead: false
prepTime: "{X minutes}"
cookTime: "{X minutes}"
totalTime: "{X minutes}"
servings: {number}
calories: {number}
difficulty: "{Easy|Medium|Hard}"
ingredients:
  - "{exact measurement + ingredient}"
steps:
  - "{complete step description}"
faq:
  - question: "{FAQ question 1}?"
    answer: "{FAQ answer 1.}"
  - question: "{FAQ question 2}?"
    answer: "{FAQ answer 2.}"
  - question: "{FAQ question 3}?"
    answer: "{FAQ answer 3.}"
  - question: "{FAQ question 4}?"
    answer: "{FAQ answer 4.}"
  - question: "{FAQ question 5}?"
    answer: "{FAQ answer 5.}"
---
```

### FAQ Rules (reinforcement)
- 5 questions per article (exactly)
- Questions must feel like real Google/Pinterest searches
- Answers: 2–4 sentences, hedged language
- Apply all content rules (contractions, no medical claims, etc.)

### Post-API Processing
1. Validate response starts with `---` and has closing `---`
2. Save to `src/data/articles/{slug}.md`
3. Update `content-tracker.json`: `status: "article_written"`, `published: false`
4. `time.sleep(3)` between articles

### CLI Flags
```bash
python scripts/2-write-articles.py                     # process all
python scripts/2-write-articles.py --only-update-existing   # only update frontmatter of existing articles
python scripts/2-write-articles.py --new-only          # only write new articles
```

---

## SCRIPT 3: `scripts/3-generate-images.py`

### Purpose
Generates all images: 1 web image (16:9) + 4 Pinterest pin images (3:4) per article. Replaces `scripts/generate-images.py`.

### Python Libraries Required
```
requests
Pillow
python-dotenv
```

### API
Nano Banana Pro. `GEMINI_API_KEY` from `.env`.
- Model: `nano-banana-pro-preview`
- Temperature: `2.0`

### Input Sources
1. `pipeline-data/content-tracker.json` — only process slugs where `src/data/articles/{slug}.md` exists
2. `pipeline-data/router-mapping.json` — per-variant titles
3. `pipeline-data/image-scenes.json` — pick randomly per image (different scene for each of the 5 images)

### Skip Logic (critical for cost)
- Web image: if `public/images/{slug}-main.jpg` exists → skip
- Pin vN: if `public/images/pins/{slug}_vN.jpg` exists → skip
- Log skips clearly

### Image Prompts

**Web image (16:9):**
```
{pin_title from content-tracker.json}, {random scene}. Realistic food photography. No text on the image.
```
Save to: `public/images/{slug}-main.jpg`

**Pin images v1–v4 (3:4):**
Get `variant_title` from `router-mapping.json[slug]["vN"]["title"]`.
Fallback: use `pin_title` from content-tracker.json for all variants.
```
{variant_title}, {random scene}. Realistic food photography. Write ONLY the text "{variant_title}" on the image in a bold, readable font. No other text.
```
Save to: `public/images/pins/{slug}_vN.jpg`

### Rate Limiting
- 3s between images
- 6s between articles
- On 429: stop, print "Quota limit hit — run again to continue.", save progress

### Progress Saving
Update `content-tracker.json` after every article:
```json
{
  "image_web": "/images/{slug}-main.jpg",
  "image_pins": ["public/images/pins/{slug}_v1.jpg", ...],
  "status": "IMAGES_READY"
}
```

### CLI Flags
```bash
python scripts/3-generate-images.py
python scripts/3-generate-images.py --limit 3    # test run
```

---

## SCRIPT 4: `scripts/4-export-publer.py`

### Purpose
Generates `pipeline-data/pins-export.csv` ready for Publer. No API calls.

### Input Sources
1. `pipeline-data/content-tracker.json`
2. `pipeline-data/router-mapping.json`
3. `pipeline-data/pins.json`

### Filter
Only include pins where BOTH of these are true:
- `src/data/articles/{slug}.md` exists on disk
- `public/images/pins/{slug}_vN.jpg` exists on disk for that specific variant

### Per Row (article × variant v1–v4)

**title:** `router-mapping.json[slug]["vN"]["title"]`. Fallback: `pin_title` from content-tracker.json.

**destination_url:** `https://www.daily-life-hacks.com/{url_slug}` where `url_slug` = `router-mapping.json[slug]["vN"]["url_slug"]`. Fallback: `https://www.daily-life-hacks.com/{slug}-v{N}`.

**description:** `description` from `pins.json` (match by slug). Append hashtags from `pins.json[slug].hashtags` formatted as `#Tag1 #Tag2`. Fallback: description from content-tracker.json.

**board assignment (priority order):**
1. If slug contains any of: `breakfast`, `smoothie`, `oat`, `snack`, `granola`, `yogurt`, `morning` → `"Healthy Breakfast, Smoothies and Snacks"`
2. Else if `category == "recipes"` → `"High Fiber Dinner and Gut Health Recipes"`
3. Else → `"Gut Health Tips and Nutrition Charts"`

**alt_text:** from `pins.json` where slug matches. Fallback: `"{title} - healthy {category} tips"`

**image_filename:** filename only, no path (e.g., `high-fiber-fruits_v1.jpg`)

### Output CSV
File: `pipeline-data/pins-export.csv`
```
image_filename,pin_title,description,destination_url,board,alt_text
```
UTF-8, no BOM, all text fields quoted.

### Summary Print
```
Export complete: 172 pins → pipeline-data/pins-export.csv
  Boards: Dinner/Gut: 88 | Breakfast: 52 | Nutrition: 32
  Articles: 43 included, 2 skipped (missing images)
```

---

## Global Requirements (all scripts)

### Environment
`.env` file (do not create or modify):
```
GEMINI_API_KEY=...
```

### `scripts/requirements.txt`
Create/update with:
```
requests
Pillow
pytrends
python-dotenv
```

### Error Handling
- Never crash silently — catch all exceptions, log with slug name, continue to next
- Never delete or overwrite images/tracker/mapping unless intentional
- Atomic JSON writes: write to `{file}.tmp`, then `os.replace(tmp, target)`. Prevents corruption on crash.
- Every script is idempotent: running twice produces same result

### Resume Support
- Script 1: skip slugs already in keyword-clusters.json (unless `--force`)
- Script 2: skip slugs where article file exists (unless `--force`)
- Script 3: skip images that exist on disk
- Script 4: always regenerates from scratch (fast, no API calls)

### Logging
- Print: `[{n}/{total}] {slug}`
- Print skip reasons explicitly
- Print final summary at end

---

## Content Rules Reference (mandatory for all Gemini prompts)

| Rule | Detail |
|------|--------|
| Contractions | Always: it's, don't, they're, you'll — never "it is", "do not" |
| Em dash | Never — (em dash). Use hyphen or rewrite. |
| Emojis | Never, anywhere |
| Closing | One natural closing paragraph. No sign-off phrases. |
| Medical claims | Never: cures, treats, heals, prevents. Use: may support, could help, might improve |
| Detox language | Never: detox, cleanse, reset, flush |
| Absolute claims | Never "is good for your gut" — always hedge: "may", "could", "might" |
| Banned AI words | Furthermore, Moreover, In conclusion, Delve into, Dive into, It's important to note, Unlock, Elevate, Game-changer, Revolutionize, Mouthwatering |
| Sentence variety | Mix short punchy + long descriptive aggressively |
| Anecdotes | 1–2 personal-sounding stories woven in naturally |
| FAQ | 5 questions per article, real search-style questions, hedged answers |

---

## File Manifest — What Gemini Should Create/Modify

| File | Action |
|------|--------|
| `scripts/1-keyword-research.py` | CREATE |
| `scripts/2-write-articles.py` | CREATE |
| `scripts/3-generate-images.py` | CREATE (replaces `scripts/generate-images.py`) |
| `scripts/4-export-publer.py` | CREATE |
| `scripts/requirements.txt` | CREATE or UPDATE |
| `pipeline-data/topics-queue.json` | CREATE as `[]` |
| `functions/[[path]].js` | MODIFY (update routing logic only) |

Do NOT create, modify, or delete any other file.

---

## Build Order for Gemini

Build and test in this order:
1. **Script 4 first** — no API calls, validates CSV output format
2. **Script 1** — keyword research, no Gemini needed
3. **Router update** — update `functions/[[path]].js` routing logic
4. **Script 3** — test with `--limit 1`
5. **Script 2 last** — most complex, test with `--new-only` on a single slug

Each script must work independently. No imports between scripts.
