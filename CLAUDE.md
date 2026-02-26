# Daily Life Hacks - Project Memory

## About
- **Site:** Daily Life Hacks (daily-life-hacks.com)
- **Stack:** Astro 5 + Tailwind CSS v4, deployed on **Cloudflare Pages**
- **GitHub:** github.com/moshearviv85/daily-life-hacks
- **Language:** English only, American audience
- **Communication:** Hebrew with user
- **Brand color:** #F29B30 (orange)
- **Workflow:** Claude Code = project manager (plans, reviews, data). Gemini Pro 3 = executor (writes site code). Instructions for Gemini go in `INSTRUCTIONS-*.md` files at project root. Instructions should be managerial (what/why), NOT full code.

## Team & Content Decisions
- **Content writer:** Gemini (won comparison test against Claude Chat and GPT-4o)
- **Why Gemini:** Most human tone, best long-tail keyword integration, most detailed recipes with realistic quantities/calories, longest articles (good for SEO), rich H2/H3 structure
- **Image generation model:** Nano Banana Pro (`nano-banana-pro-preview`) via `generateContent` API, $0.134/image
- **Image variety:** 100 pre-defined scenes in `pipeline-data/image-scenes.json`, randomly selected per image to prevent repetitive compositions (solved "everything on wooden table" problem)

## Deployment
- **Platform:** Cloudflare Pages (connected to GitHub, auto-deploys on push)
- **Build command:** `npm run build`
- **Build output:** `dist`
- **Serverless functions:** `functions/` directory (Cloudflare Pages Functions)
- **Environment variables (Cloudflare):**
  - `BEEHIIV_API_KEY` - Beehiiv API key (Full Access) for newsletter subscriptions
  - `BEEHIIV_PUB_ID` - `99ff482f-ae3d-436b-b0b9-637220faa120` (default in code)
  - `STATS_KEY` - Password for accessing /api/stats analytics endpoint
- **D1 Database:** `dlh-subscriptions` - tracks newsletter subscriptions
  - Binding name: `DB`
  - Schema: `schema.sql`

## Newsletter / Beehiiv Integration
- **Publication ID:** `99ff482f-ae3d-436b-b0b9-637220faa120`
- **Footer form** (`Newsletter.astro`): Custom styled form, POSTs to `/api/subscribe`
- **Popup form** (`NewsletterPopup.astro`): Modal popup, POSTs to `/api/subscribe`
- **Server proxy** (`functions/api/subscribe.js`): Cloudflare Pages Function that calls Beehiiv API v2 with Bearer auth, logs to D1
- **Stats endpoint** (`functions/api/stats.js`): GET `/api/stats?key=SECRET` - shows total subs, today, by source, by day, recent 20
- **Important:** Beehiiv API requires Full Access API key (not regular). User needs to verify identity in Beehiiv to get it.
- **Tracking:** Every subscription logs: email, source (footer/popup), page path, referrer, status, timestamp

## Project Structure
```
src/
  pages/
    index.astro          - Homepage (hero + 4x4 grid)
    [slug].astro         - Article/Recipe detail page (BreadcrumbList + Article/Recipe schema)
    nutrition/index.astro - Nutrition category page
    recipes/index.astro   - Recipes category page
    privacy.astro         - Privacy Policy
    disclaimer.astro      - Medical Disclaimer
    contact.astro         - Contact page with form
    terms.astro           - Terms of Use
  components/
    Header.astro          - Sticky header with nav, search, dark mode toggle
    Footer.astro          - Footer with Pinterest, legal links, disclaimer
    HeroSection.astro     - Hero with featured article + sidebar (width/height on images)
    ArticleCard.astro     - Reusable article card (width/height on images, pin metadata)
    Newsletter.astro      - Newsletter signup form (custom, calls /api/subscribe)
    NewsletterPopup.astro - Modal popup newsletter (calls /api/subscribe, page-aware text)
    ArticleGrid.astro     - Article grid component
    ArticleCarousel.astro - Article carousel component
  layouts/
    BaseLayout.astro      - Base HTML (meta, OG, Twitter, Pinterest, JSON-LD array support, robots directive, sitemap)
  styles/
    global.css            - Theme CSS variables (light/dark mode)
  content.config.ts       - Content collection schema (articles with optional recipe fields)
  data/articles/          - Markdown content files (25 published articles)
public/
  images/                - Article web images ({slug}-main.jpg)
  images/pins/           - Pinterest pin images ({slug}_v1-v4.jpg)
  logo.png               - Site logo
  favicon.ico            - Custom favicon (orange leaf)
  favicon.svg            - SVG favicon (orange leaf)
  robots.txt             - Robots file
  popup-image.jpg        - Newsletter popup fallback image
functions/
  api/subscribe.js       - Beehiiv subscription proxy (POST, logs to D1)
  api/stats.js           - Analytics endpoint (GET, key-protected)
pipeline-data/
  pins.json              - Master pin database (100 pins, JSON)
  pins.csv               - Same data in CSV format
  content-tracker.json   - Article generation status tracker
  image-scenes.json      - 100 diverse scenes for image generation variety
  pins-export.csv        - Pin export for Tailwind app upload
scripts/
  generate-images.py     - Image generation script (web + 4 pin variants per article)
  1-research.py          - Research script
  2-generate.py          - Content generation
  3-validate.py          - Validation
  4-images.py            - Image generation (old)
  5-publish.py           - Publishing
  6-deploy.py            - Deployment
  requirements.txt       - Python dependencies
schema.sql              - D1 database schema for subscriptions table
```

## Image Generation
- **Web image:** 16:9 ratio, clean food photo, NO text. Saved as `public/images/{slug}-main.jpg`
- **Pin images:** 3:4 ratio (1000x1500), with text overlay of pin title. 4 variants per article:
  - v1: Bright, clean, white/light background
  - v2: Dark, moody, warm lighting
  - v3: Flat-lay overhead perspective
  - v4: Close-up ingredients focus
- **Prompt structure:** `"{title}, {random_scene}. Realistic food photography. No text on the image."` (web), with text overlay instruction for pins
- **Scene randomizer:** 100 scenes in `image-scenes.json` picked via `random.choice()` for variety
- **Temperature:** 2.0 for maximum variety
- **Rate limiting:** 4s between API calls, 10s between articles, graceful stop on 429

## SEO / Schema
- **Article pages:** Article OR Recipe JSON-LD + BreadcrumbList (3 levels: Home > Category > Article)
- **Recipe schema:** Full structured data with ingredients, steps, nutrition, times
- **Meta robots:** `index, follow, max-image-preview:large, max-snippet:-1`
- **Image optimization:** width/height attributes on all images, fetchpriority="high" on featured, lazy loading on rest
- **Pinterest:** Rich pins meta, pin-description, pin-url, pin-media on article images

## Pin Database (pins.json / pins.csv)
- **82 article topics** (18 YMYL/pseudo-science topics removed), each currently variant=1
- **Pinterest strategy:** Multiple pins (v1, v2, v3...) per article, each with different image, all pointing to same page with different UTM tracking
- **14 columns:** pin_id, pin_title, description, hashtags, alt_text, board, affiliate_link, date, category, slug, variant, image_filename, site_url, status
- **Categories:** 57 recipes, 25 nutrition
- **Statuses:** draft → image_ready → article_written → published
- **3 Pinterest boards:** "High Fiber Dinner and Gut Health Recipes", "Healthy Breakfast, Smoothies and Snacks", "Gut Health Tips and Nutrition Charts"
- **Naming convention:** image = `{slug}_v{variant}.jpg`, URL = `https://www.daily-life-hacks.com/{slug}?utm_content=v{variant}`

## Content Status
- **25 articles published** (removed hormone-balance YMYL article, replaced with high-protein-high-fiber-meals-for-weight-loss)
- **82 article topics** in pins.json (57 recipes, 25 nutrition)
- Every article goes through review before publishing
- **Removed 18 topics:** YMYL/medical (IBS, diabetes, cholesterol, hormones, supplements), pseudo-science (detox, colon cleanse, ACV), risky (100g fiber challenge, kids content)

## Content Rules (for Gemini prompts)
- **NO em dashes** - never use the long dash character. Use regular hyphens sparingly, or rewrite the sentence instead
- **NO emojis** - never use emojis in articles or site content (rare exception: one wink in casual email context)
- **NO disclaimer in articles** - site already has a dedicated /disclaimer page
- **NO medical claims** - avoid "cure", "treat", "heal", "relieve", "prevents", "fights", "combats" - use "may support", "could help", "might improve", "is thought to"
- **NO absolute health statements** - never say "is good for your gut" or "helps regulate blood sugar" - always hedge with "could", "may", "might"
- **NO detox/cleanse language** - never use "detox", "cleanses", "reset your system" - use "refresh", "feel refreshed"
- **ALWAYS use contractions** - never "it is", "do not", "they are" - always "it's", "don't", "they're"
- **NO "Conclusion" heading** - AI giveaway, use natural closing instead
- **NO double endings** - one natural closing paragraph, no "Happy eating!" type sign-offs
- **Include long-tail keywords** naturally in headings and body text
- **Recipes must have:** realistic quantities, accurate calories, correct cooking times/temperatures
- **Tone:** warm, conversational blogger - not clinical or robotic

## Anti-AI-Detection Rules (Gemini config)
- **Temperature: 0.85** (higher = less predictable word choices = higher Perplexity)
- **Burstiness:** vary sentence lengths aggressively - mix short punchy sentences with longer descriptive ones
- **Banned AI words:** "Furthermore", "Moreover", "In conclusion", "Delve into", "Dive into", "It's important to note", "It's worth noting", "In today's world", "Unlock", "Elevate", "Navigating", "Game-changer", "Revolutionize", "Take it to the next level", "Mouthwatering"
- **Banned endings:** NO sign-off endings. No "Enjoy!", "Happy eating!", "Give it a try!", "You won't regret it!", "Your [X] will thank you!"
- **Anecdotes:** sprinkle personal-sounding stories
- **Imperfection:** casual tone, occasional fragments, conversational asides

## Content Schema (content.config.ts)
- Required: title, excerpt, category (nutrition|recipes), tags, image, imageAlt, date
- Flags: featured, editorsPick, whatsHot, mustRead (all boolean, default false)
- Recipe optional: prepTime, cookTime, totalTime, servings, calories, difficulty (Easy|Medium|Hard), ingredients (string[]), steps (string[])

## CSS Variables (dark mode support)
- `--card-bg`, `--text-color`, `--heading-color`, `--muted-color`, `--border-color`, `--input-bg`, `--label-color`, `--header-bg`, `--header-border`

## Completed Tasks (chronological)
1. Grid card ratio - 70% image, 30% text
2. Font bold on grid card titles
3. Newsletter text updates
4. SEO basics - robots.txt, Organization Schema, H1, title/description
5. Pinterest save button with SDK
6. Recipe pages - conditional Recipe vs Article JSON-LD
7. Example recipes - lemon-herb-chicken, overnight-oats
8. Category pages - /nutrition, /recipes
9. Legal pages - /privacy, /disclaimer, /contact
10. Bug fixes - Header/Footer, ArticleCard props, dark mode, Footer placement
11. Custom favicon (orange leaf)
12. OG image fallback to logo.png
13. Apple touch icon
14. Footer redesign by Gemini
15. Terms of Use page
16. NewsletterPopup modal with dynamic images
17. Recipe data backfill
18. Model comparison test (Gemini selected)
19. Pin database (Excel → JSON+CSV)
20. Image scene randomizer (100 scenes in JSON)
21. Image generation script with random scenes, temperature 2.0
22. 25 articles published with generated images
23. SEO optimization - BreadcrumbList schema, image width/height, fetchpriority, robots meta
24. Newsletter popup text fix (removed false meal plan promise)
25. Beehiiv integration - custom forms + Cloudflare Pages Function proxy
26. D1 subscription tracking - source/page analytics
27. Stats endpoint - /api/stats with key protection
28. Site deployed to Cloudflare Pages
29. Medical claims audit - softened 34 health claims across 17 articles
30. Removed hormone-balance article (YMYL) - replaced with high-protein-high-fiber-meals-for-weight-loss
31. Tabbouleh article - removed "Detox"/"cleanses" from title/excerpt/tags
32. Gemini article instructions prepared (pipeline-data/gemini-article-instructions.md)
33. Topics list prepared for Gemini (pipeline-data/topics-to-write.md)

## Pending Tasks (priority order)
1. **Beehiiv API key** - User needs to complete identity verification in Beehiiv to get Full Access API key, then update in Cloudflare env vars
2. **Thank you page** - Create a thank you page for new subscribers with a first recipe
3. **Pin export for upload** - Prepare pins CSV with v1-v4 variants and UTM links for Tailwind app
4. **PDF meal plan** - Create as lead magnet (Gemini can help)
5. **Diversify article topics** - Next batch should cover more than just high-fiber
6. **Search** - Search bar exists in Header but not functional
7. **Dark mode fixes** - Some hardcoded gray colors in article prose
8. **OG image** - Need proper 1200x630 image
9. **Pin variants** - Create v2/v3/v4 pins for remaining articles

## Important Notes
- favicon.ico is the SVG one the user created (not Astro default)
- Contact form is non-functional (static site, no backend)
- Original Excel file kept at `../diet-website.xlsx` as backup
- Beehiiv embed iframe URL format (`/subscribe/form/{ID}`) does NOT work - that's why we switched to custom form + API proxy
- D1 database needs to be created manually in Cloudflare Dashboard and bound as `DB`
