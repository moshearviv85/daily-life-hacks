# Content Pipeline — Build Instructions for Gemini

## Overview

Build 6 independent Python scripts that run locally on the user's Windows machine. Each script is standalone — no "mega-script" that chains them. They communicate through a shared JSON tracker file.

The user does NOT know how to code. Every script must be dead simple to run: `python scripts/1-research.py`

---

## Project Context

- **Site:** Daily Life Hacks — nutrition & recipe blog for American audiences
- **Tech Stack:** Astro 5, deployed on Cloudflare Pages via GitHub
- **Content Language:** English
- **Categories:** `nutrition` and `recipes` (only these two exist)
- **Source Data:** `diet-website.xlsx` in the project root — 100 Pinterest pin topics
- **AI Provider:** Google Gemini API (model: `gemini-2.5-flash`) for text, Imagen 4 Ultra for images
- **API Key:** The user already has a Google API key that works for both Gemini and Imagen

---

## Folder Structure

```
dlh-fresh/
├── scripts/
│   ├── 1-research.py
│   ├── 2-generate.py
│   ├── 3-validate.py
│   ├── 4-images.py
│   ├── 5-publish.py
│   └── 6-deploy.py
├── pipeline-data/
│   ├── content-tracker.json    ← central state file
│   ├── drafts/                 ← raw AI output .md files
│   └── validated/              ← approved .md files ready to publish
├── src/data/articles/          ← final destination for .md files
├── public/images/              ← final destination for images
└── diet-website.xlsx           ← source Excel (100 rows)
```

---

## The Shared Tracker: `pipeline-data/content-tracker.json`

This is the single source of truth. Every script reads and writes to this file. Structure:

```json
[
  {
    "id": 101,
    "category": "nutrition",
    "keyword": "high fiber meals for constipation relief",
    "pin_title": "High Fiber Meals for Constipation Relief 2026",
    "description": "Discover natural high-fiber meals for gentle relief...",
    "hashtags": ["gutHealth", "highFiber", "constipationRelief"],
    "alt_text": "Bowl of high-fiber foods including oats, berries, and beans",
    "slug": "high-fiber-meals-constipation-relief",
    "status": "IDEATED",
    "date_created": "2026-02-21",
    "article_title": null,
    "draft_path": null,
    "validated_path": null,
    "image_web": null,
    "image_pins": [],
    "published": false,
    "deployed": false
  }
]
```

**Status flow:** `IDEATED` → `DRAFTED` → `VALIDATED` → `IMAGES_READY` → `PUBLISHED` → `DEPLOYED`

---

## Script 1: Research (`1-research.py`)

### What it does
Reads `diet-website.xlsx` and converts it into `content-tracker.json`.

### Input
The Excel file with these columns (may have slight name variations):
- `pin title` — the Pinterest title
- `longtail keyword` — target SEO keyword
- `discription` (note: misspelled in original) — pin description
- `hashtags` — comma or space separated
- `alt text` — image alt text
- `board` — determines category

### Board → Category Mapping
- "Gut Health Tips and Nutrition Charts" → `nutrition`
- "High Fiber Dinner and Gut Health Recipes" → `recipes`
- "Healthy Breakfast, Smoothies and Snacks" → decide per row: if title contains "recipe", "meal", "bowl", "smoothie bowl", "toast", "pancake", "oats" → `recipes`, otherwise → `nutrition`

### Slug Generation
From the `longtail keyword` field: lowercase, replace spaces with hyphens, remove special characters. Example: "High Fiber Meals for Constipation Relief" → `high-fiber-meals-constipation-relief`

### Important
- Do NOT call any AI API in this script. It's pure data transformation.
- The Excel is read ONCE here and never again by any other script.
- Generate IDs starting from 101 (matching the PIN numbering convention).
- Output: creates `pipeline-data/content-tracker.json` with all 100 items at status `IDEATED`.

---

## Script 2: Content Generation (`2-generate.py`)

### What it does
Reads tracker, finds all items with status `IDEATED`, calls Gemini API to generate a full Markdown article for each, saves to `pipeline-data/drafts/`.

### AI Provider
- **Model:** `gemini-2.5-flash` (or `gemini-2.5-pro` as fallback)
- **API Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}`
- **API Key:** User will paste their key in a config variable at the top of the script

### Rate Limiting
- Wait 3-5 seconds between API calls
- If 429 (quota limit): stop gracefully, print how many were completed, save progress
- The script must be **resumable** — on next run, it skips items already at `DRAFTED` or beyond

### Frontmatter Schema (CRITICAL — Astro will break if this is wrong)

The AI must output a complete `.md` file. The frontmatter must EXACTLY match this Astro schema:

**For `nutrition` articles:**
```yaml
---
title: "Article Title Here"
excerpt: "A compelling 1-2 sentence summary for SEO and social sharing."
category: "nutrition"
tags: ["tag1", "tag2", "tag3", "tag4"]
image: "/images/SLUG-main.jpg"
imageAlt: "Descriptive alt text for the image"
date: 2026-02-21
featured: false
editorsPick: false
whatsHot: false
mustRead: false
---
```

**For `recipes` articles (ALL these extra fields are REQUIRED):**
```yaml
---
title: "Recipe Title Here"
excerpt: "A compelling 1-2 sentence summary."
category: "recipes"
tags: ["tag1", "tag2", "tag3", "tag4"]
image: "/images/SLUG-main.jpg"
imageAlt: "Descriptive alt text"
date: 2026-02-21
featured: false
editorsPick: false
whatsHot: false
mustRead: false
prepTime: "10 minutes"
cookTime: "25 minutes"
totalTime: "35 minutes"
servings: 4
calories: 380
difficulty: "Easy"
ingredients:
  - "Ingredient 1 with quantity"
  - "Ingredient 2 with quantity"
steps:
  - "Full instruction for step 1."
  - "Full instruction for step 2."
---
```

### Field Rules
- `title`: Must include the target keyword naturally. Max 65 characters for SEO.
- `excerpt`: 1-2 sentences. Must be compelling. Max 160 characters for SEO meta description.
- `tags`: 4-6 tags, lowercase, hyphenated (e.g., `"gut-health"`, `"high-fiber"`). Derived from the hashtags column.
- `image`: Always `/images/{slug}-main.jpg` — the image script will create this file later.
- `imageAlt`: Descriptive, includes the main keyword naturally.
- `date`: Use today's date for all articles.
- `featured`, `editorsPick`, `whatsHot`, `mustRead`: All `false`. The user will manually set these later.
- `difficulty`: One of exactly: `"Easy"`, `"Medium"`, or `"Hard"`. No other values.
- `servings`: A number (integer), not a string.
- `calories`: A number (integer), not a string. Must be realistic.
- `ingredients`: Each item is a full string like `"2 cups chopped broccoli"`. Realistic quantities.
- `steps`: Each item is a full sentence instruction. Realistic, actionable.

### Article Body Requirements
- 800-1200 words for nutrition articles
- 600-900 words for recipe articles (because the recipe card in frontmatter already has ingredients + steps)
- Use `##` for main headings, `###` for subheadings
- Include practical, actionable advice
- Write in a warm, approachable tone — like a knowledgeable friend, not a doctor
- Include a "Meal Prep Tips" or "How to Store" section when relevant
- For recipes: include a "Nutritional Breakdown" and "Variations" section

### CRITICAL: Content Safety Rules (System Prompt)

Embed these rules as a system prompt in every API call. The AI MUST follow these:

```
STRICT CONTENT RULES — VIOLATION OF ANY RULE MEANS THE ARTICLE IS REJECTED:

NEVER WRITE:
- Medical cure claims: "cures cancer", "prevents diabetes", "heals depression"
- Weight loss promises: "lose 10 pounds in a week", "burns belly fat", "miracle diet"
- Specific weight loss numbers or timeframes
- Diagnosis: "if you have symptom X, you have disease Y"
- Drug replacement: "stop taking medication and eat Z instead"
- Fake science: "studies prove..." without naming a real study
- "Superfood" as a medical term
- "Detox" or "cleanse" as medical concepts
- "Boosts immunity" or "prevents flu/cold"
- Any claim that food can replace medical treatment

ALWAYS USE CAUTIOUS LANGUAGE:
- "may help support" instead of "will cure"
- "some research suggests" instead of "proven to"
- "could contribute to" instead of "guaranteed to"
- "supports healthy weight management" instead of "makes you lose weight"
- "may support digestive comfort" instead of "cures IBS"
- "nutrients that support immune function" instead of "boosts immunity"
- "foods linked to better mood" instead of "cures anxiety"

ALWAYS INCLUDE in every article:
- Target audience: healthy adults looking to eat better (NOT sick people seeking cures)
- Tone: warm, practical, encouraging — like a knowledgeable friend
- The article must provide genuinely useful, actionable information

NEVER INCLUDE:
- External links (no URLs at all in the article body)
- References to other websites
- Affiliate promotions
- Brand name product recommendations
```

### Output
- Save each article as `pipeline-data/drafts/{slug}.md`
- Update tracker: set `status` to `DRAFTED`, set `draft_path`, set `article_title`

### Example Prompt to Gemini

```
Write a complete Markdown article for a nutrition blog.

TOPIC: {description from tracker}
TARGET KEYWORD: {keyword from tracker}
CATEGORY: {category}
HASHTAGS FOR TAGS: {hashtags}
IMAGE ALT TEXT: {alt_text}

Output a complete .md file starting with --- frontmatter --- followed by the article body.
The frontmatter must exactly follow this schema: [paste schema above]

[paste content safety rules above]
```

---

## Script 3: Validation (`3-validate.py`)

### What it does
Reads tracker, finds all items with status `DRAFTED`, validates each `.md` file against the Astro schema, and lets the user approve/reject.

### Validation Checks (automated, no AI needed)
1. Frontmatter exists and is valid YAML
2. `title` exists and is ≤ 80 characters
3. `excerpt` exists and is ≤ 200 characters
4. `category` is exactly `"nutrition"` or `"recipes"`
5. `tags` is an array with 2+ items
6. `image` matches pattern `/images/{slug}-main.jpg`
7. `date` is a valid date
8. If `category` is `"recipes"`: ALL recipe fields exist (`prepTime`, `cookTime`, `totalTime`, `servings`, `calories`, `difficulty`, `ingredients`, `steps`)
9. `difficulty` is exactly one of: `"Easy"`, `"Medium"`, `"Hard"`
10. `servings` and `calories` are numbers, not strings
11. `ingredients` has at least 3 items
12. `steps` has at least 3 items
13. Article body has at least 400 words
14. Article body does NOT contain any URLs (http:// or https://)
15. Article body does NOT contain banned phrases: "cures", "miracle", "guaranteed to", "proven to cure", "lose X pounds"

### Interactive CLI Flow
Use Python's built-in `input()` — no need for fancy libraries. For each draft:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Article 3/100: high-fiber-meals-constipation-relief
Category: nutrition
Title: "High Fiber Meals for Gentle Constipation Relief"
Word count: 847
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ All automated checks passed.

[A]pprove  [R]eject  [V]iew full article  [S]kip for later
>
```

If validation fails:
```
❌ Issues found:
  1. Missing field: prepTime (required for recipes)
  2. calories is a string "380" — must be integer
  3. Body contains banned phrase: "proven to cure"

[F]ix with AI  [R]eject  [V]iew  [S]kip
>
```

If user chooses "Fix with AI": call Gemini to regenerate just the broken parts, then re-validate.

### Output
- Approved files: copy to `pipeline-data/validated/{slug}.md`
- Update tracker: set `status` to `VALIDATED`, set `validated_path`
- Rejected files: set status back to `IDEATED` (so Script 2 will regenerate them on next run)

---

## Script 4: Image Generation (`4-images.py`)

### What it does
Reads tracker, finds all items with status `VALIDATED`, generates images using Imagen 4 Ultra.

### Images Per Article
1. **Web image** (clean, no text): `public/images/{slug}-main.jpg`
2. **Pinterest pins** (with text overlay): `public/images/pins/{slug}-pin-1.jpg` through `{slug}-pin-4.jpg`

### API Details
- **Model:** `imagen-4.0-ultra-generate-001`
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:predict?key={API_KEY}`
- **Aspect ratio:** `3:4`
- **Payload format:**
```json
{
  "instances": [{"prompt": "..."}],
  "parameters": {"sampleCount": 1, "aspectRatio": "3:4"}
}
```
- **Response parsing:** Check for `predictions[0].bytesBase64Encoded` first, then `generatedImages[0].image.imageBytes`

### Prompts

**Web image (no text):**
```
Create a high-quality, professional image for a food and nutrition blog.
CONTENT TOPIC: {description}
DESIGN REQUIREMENTS: Vertical 3:4 aspect ratio. Modern food photography with professional lighting.
CRITICAL INSTRUCTION: ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS on the image. Clean composition only.
```

**Pinterest pin (with text):**
```
Create a high-quality, professional Pinterest pin image for food and nutrition content.
CONTENT TOPIC: {description}
TITLE TO DISPLAY ON IMAGE: "{pin_title}"
DESIGN REQUIREMENTS:
- Format: Vertical 3:4 aspect ratio (Pinterest standard)
- Style: Modern food photography aesthetic with professional lighting
- Text overlay: The title must be clearly visible in an elegant, bold, readable font
- Colors: Vibrant but natural
- Quality: High resolution, Pinterest worthy
```

### Rate Limiting
- 4 seconds between pin variations
- 10 seconds between articles
- Handle 429 gracefully, save progress, print summary

### Smart Skip
- If file already exists on disk, skip it (so re-runs don't waste API quota)

### Output
- Save web images to `public/images/{slug}-main.jpg`
- Save pin images to `public/images/pins/{slug}-pin-1.jpg` through `pin-4.jpg`
- Update tracker: set `status` to `IMAGES_READY`, set `image_web` and `image_pins` paths

---

## Script 5: Publish (`5-publish.py`)

### What it does
Moves validated articles from `pipeline-data/validated/` into the Astro content directory `src/data/articles/`.

### Steps
1. Read tracker, find all items with status `IMAGES_READY`
2. For each item:
   - Verify the `.md` file exists in `pipeline-data/validated/`
   - Verify the web image exists in `public/images/`
   - Copy the `.md` file to `src/data/articles/{slug}.md`
3. Update tracker: set `status` to `PUBLISHED`, set `published` to `true`

### Safety
- Do NOT overwrite existing files in `src/data/articles/` without asking
- Print a summary: "Ready to publish X articles. Proceed? [Y/N]"
- If an article already exists in `src/data/articles/`, warn and skip unless user confirms overwrite

---

## Script 6: Deploy (`6-deploy.py`)

### What it does
Commits all new content to Git and pushes to GitHub, which triggers Cloudflare Pages auto-deploy.

### Prerequisites
- Git must be initialized and remote must be set (the script should check this)
- If no git repo exists: `git init`, then prompt user for GitHub repo URL

### Steps
1. Check that we're in the right directory (look for `astro.config.mjs`)
2. Check git status
3. Stage ONLY these specific paths:
   - `src/data/articles/*.md`
   - `public/images/*`
4. Show the user what will be committed:
   ```
   Files to commit:
     + src/data/articles/high-fiber-meals.md
     + src/data/articles/chia-seed-water.md
     + public/images/high-fiber-meals-main.jpg
     ... (47 more files)

   Commit message: "Add 25 new articles with images"
   Proceed? [Y/N]
   ```
5. If confirmed: `git add [specific files]`, `git commit -m "..."`, `git push origin main`
6. Update tracker: set `status` to `DEPLOYED`, set `deployed` to `true`

### Safety
- NEVER run `git add .` or `git add -A` — only add specific file paths
- NEVER force push
- Show what will be committed BEFORE committing
- If push fails, don't retry — print the error and let user handle it

---

## Config Section (Top of Every Script)

Every script should have a clear config section at the top:

```python
# ==========================================
# CONFIGURATION — Edit these values
# ==========================================
API_KEY = "YOUR_GOOGLE_API_KEY_HERE"
PROJECT_DIR = "."  # root of the Astro project
TRACKER_FILE = "pipeline-data/content-tracker.json"
# ==========================================
```

The user should only ever need to change the API_KEY. Everything else should work with defaults.

---

## Python Dependencies

Only use these libraries (all pip-installable):
- `openpyxl` (for reading .xlsx)
- `requests` (for API calls)
- `Pillow` (for image processing)
- `pyyaml` (for YAML parsing/validation)

Do NOT use: pandas, inquirer, click, or any heavy framework. Keep it simple.

Create a `requirements.txt` in the `scripts/` folder:
```
openpyxl
requests
Pillow
pyyaml
```

---

## Testing

After building all 6 scripts, test Script 1 against the real `diet-website.xlsx` to verify:
1. All 100 rows are parsed correctly
2. Categories are assigned correctly based on board mapping
3. Slugs are generated without special characters
4. The tracker JSON is valid and complete

Do NOT test Scripts 2-4 in bulk — the user will run a small test (5 articles) first to verify quality before generating all 100.

---

## Files to Create
- `scripts/1-research.py`
- `scripts/2-generate.py`
- `scripts/3-validate.py`
- `scripts/4-images.py`
- `scripts/5-publish.py`
- `scripts/6-deploy.py`
- `scripts/requirements.txt`
- `pipeline-data/` (empty directory with a `.gitkeep` file)

## Files NOT to Modify
- Any file in `src/` (except indirectly through Script 5 which adds articles)
- `astro.config.mjs`
- `package.json`
- Any existing content in `src/data/articles/`
