# Daily Life Hacks - Project Memory

## About
- **Site:** Daily Life Hacks (daily-life-hacks.com)
- **Stack:** Astro 5 + Tailwind CSS v4
- **Language:** English only, American audience
- **Communication:** Hebrew with user
- **Brand color:** #F29B30 (orange)
- **Workflow:** Claude Code = project manager (plans, reviews, data). Gemini Pro 3 = executor (writes site code). Instructions for Gemini go in `INSTRUCTIONS-*.md` files at project root. Instructions should be managerial (what/why), NOT full code.

## Team & Content Decisions
- **Content writer:** Gemini (won comparison test against Claude Chat and GPT-4o)
- **Why Gemini:** Most human tone, best long-tail keyword integration, most detailed recipes with realistic quantities/calories, longest articles (good for SEO), rich H2/H3 structure
- **Claude Chat:** Clean but too short, formal tone, weak recipes (unrealistic cooking methods)
- **GPT-4o:** Generic/robotic tone, missing tags, uses "Conclusion" (AI giveaway), double endings
- **Test articles:** 6 test articles in `src/data/articles/test-*.md` (2 per model, breakfast + constipation topics)

## Project Structure
```
src/
  pages/
    index.astro          - Homepage (hero + 4x4 grid)
    [slug].astro         - Article/Recipe detail page
    nutrition/index.astro - Nutrition category page
    recipes/index.astro   - Recipes category page
    privacy.astro         - Privacy Policy
    disclaimer.astro      - Medical Disclaimer
    contact.astro         - Contact page with form
    terms.astro           - Terms of Use
  components/
    Header.astro          - Sticky header with nav, search, dark mode toggle
    Footer.astro          - Footer with Pinterest, legal links, disclaimer
    HeroSection.astro     - Hero with featured article + sidebar
    ArticleCard.astro     - Reusable article card (props: title, excerpt, image, imageAlt, category, slug, date, size, fillHeight)
    Newsletter.astro      - Newsletter signup section
    NewsletterPopup.astro - Modal popup with dynamic images from article collection
    ArticleGrid.astro     - Article grid component
    ArticleCarousel.astro - Article carousel component
  layouts/
    BaseLayout.astro      - Base HTML (meta, OG, Twitter, Pinterest, favicon, JSON-LD, sitemap, dark mode flash prevention)
  styles/
    global.css            - Theme CSS variables (light/dark mode)
  content.config.ts       - Content collection schema (articles with optional recipe fields)
  data/articles/          - Markdown content files (14 articles currently)
public/
  images/                - Article images (PIN_*, WEB_*, classic.jpg, hero.jpg, etc.)
  logo.png               - Site logo
  logo-old.png, logo-old2.png - Old logos
  favicon.ico            - Custom favicon (user-created, orange leaf)
  favicon.svg            - SVG favicon (orange leaf)
  robots.txt             - Robots file
  popup-image.jpg        - Newsletter popup image
pipeline-data/
  pins.json              - Master pin database (100 pins, JSON)
  pins.csv               - Same data in CSV format
  content-tracker.json   - Article generation status tracker
scripts/
  1-research.py          - Research script
  2-generate.py          - Content generation
  3-validate.py          - Validation
  4-images.py            - Image generation
  5-publish.py           - Publishing
  6-deploy.py            - Deployment
  requirements.txt       - Python dependencies
```

## Pin Database (pins.json / pins.csv)
- **82 article topics** (18 YMYL/pseudo-science topics removed), each currently variant=1
- **Pinterest strategy:** Multiple pins (v1, v2, v3...) per article, each with different image, all pointing to same page with different UTM tracking
- **14 columns:** pin_id, pin_title, description, hashtags, alt_text, board, affiliate_link, date, category, slug, variant, image_filename, site_url, status
- **Categories:** 57 recipes, 25 nutrition
- **Statuses:** draft → image_ready → article_written → published
- **3 Pinterest boards:** "High Fiber Dinner and Gut Health Recipes", "Healthy Breakfast, Smoothies and Snacks", "Gut Health Tips and Nutrition Charts"
- **Naming convention:** image = `{slug}_v{variant}.jpg`, URL = `https://www.daily-life-hacks.com/{slug}?utm_content=v{variant}`
- **Source:** Converted from `diet-website.xlsx` (original Excel kept at project parent dir). Removed columns: longtail keyword, photo instruction, original url, skro campaign name, skro link, publisher. Fixed typo: discription → description.

## Content Status
- **82 article topics** in pins.json (57 recipes, 25 nutrition)
- **All 82 articles to be written from scratch** via Gemini pipeline
- Existing articles in `src/data/articles/` are old drafts/tests - will be replaced
- Every article goes through review before publishing
- **Removed 18 topics:** YMYL/medical (IBS, diabetes, cholesterol, hormones, supplements), pseudo-science (detox, colon cleanse, ACV), risky (100g fiber challenge, kids content)

## Content Rules (for Gemini prompts)
- **NO disclaimer in articles** - site already has a dedicated /disclaimer page
- **NO medical claims** - avoid "cure", "treat", "heal", "relieve" - use "may support", "could help"
- **NO "Conclusion" heading** - AI giveaway, use natural closing instead
- **NO double endings** - one natural closing paragraph, no "Happy eating!" type sign-offs
- **Include long-tail keywords** naturally in headings and body text
- **Recipes must have:** realistic quantities, accurate calories, correct cooking times/temperatures
- **Tone:** warm, conversational blogger - not clinical or robotic

## Anti-AI-Detection Rules (Gemini config)
- **Temperature: 0.85** (higher = less predictable word choices = higher Perplexity)
- **Burstiness:** vary sentence lengths aggressively - mix short punchy sentences with longer descriptive ones. Never write paragraphs of equal size
- **Banned AI words:** "Furthermore", "Moreover", "In conclusion", "Delve into", "Dive into", "It's important to note", "It's worth noting", "In today's world", "Unlock", "Elevate", "Navigating", "Game-changer", "Revolutionize", "Take it to the next level", "Mouthwatering"
- **Banned endings:** NO sign-off endings. No "Enjoy!", "Happy eating!", "Give it a try!", "You won't regret it!", "Your [X] will thank you!" — these are 100% AI-detected by GPTZero. Last paragraph should be useful info or personal thought, NOT call-to-action
- **Anecdotes:** sprinkle personal-sounding stories ("I tried this last week and...", "My friend swears by...")
- **Imperfection:** not every paragraph needs to be polished - casual tone, occasional fragments, conversational asides in parentheses
- **Human review required:** every article must be edited by a human before publishing to add genuine personal touches and ensure AI detectors score low
- **Lesson from sample review:** GPTZero flagged "Go ahead, give these a try... Enjoy!" as 100% AI. Also "game-changer" appeared in both articles — avoid repetitive buzzwords across articles

## Content Schema (content.config.ts)
- Required: title, excerpt, category (nutrition|recipes), tags, image, imageAlt, date
- Flags: featured, editorsPick, whatsHot, mustRead (all boolean, default false)
- Recipe optional: prepTime, cookTime, totalTime, servings, calories, difficulty (Easy|Medium|Hard), ingredients (string[]), steps (string[])

## CSS Variables (dark mode support)
- `--card-bg`, `--text-color`, `--heading-color`, `--muted-color`, `--border-color`, `--input-bg`, `--label-color`, `--header-bg`, `--header-border`

## Completed Tasks (chronological)
1. **Grid card ratio** - Changed image/text flex from 1:1 to 7:3 (70% image, 30% text)
2. **Font bold** - Grid card titles changed to `font-bold`
3. **Newsletter text** - Updated copy + line break before "No spam"
4. **SEO basics** - robots.txt, Organization Schema on homepage, H1 sr-only, title/description optimization
5. **Pinterest save button** - Pinterest SDK with hover-on-image, nopin on logo, pin-description on article images
6. **Recipe pages** - Conditional Recipe vs Article JSON-LD schema, recipe card UI (orange bar + ingredients + steps)
7. **Example recipes** - lemon-herb-chicken.md and overnight-oats.md with full recipe data
8. **Category pages** - /nutrition and /recipes with filtered article grids
9. **Legal pages** - /privacy, /disclaimer, /contact
10. **Bug fixes** - Added Header/Footer to all new pages, fixed ArticleCard props, fixed dark mode colors, fixed Footer placement in contact.astro
11. **Favicon** - Replaced Astro default with custom orange leaf favicon (user-created .ico + SVG)
12. **OG image fallback** - Changed from missing og-default.jpg to logo.png
13. **Apple touch icon** - Added with logo.png
14. **Footer redesign** - Gemini redesigned: centered Pinterest button, logo with tagline, horizontal legal links, disclaimer text
15. **Terms of Use page** - /terms page created
16. **NewsletterPopup** - Modal popup component with dynamic images
17. **Recipe data backfill** - avocado-toast and smoothie-bowl updated with full recipe data
18. **Model comparison test** - 6 test articles (Claude/Gemini/GPT-4o), Gemini selected as content writer
19. **Pin database** - Converted Excel → JSON+CSV, cleaned columns, added category/slug/variant/status/image_filename/site_url

## Pending Tasks (priority order)
1. **Content pipeline** - Build Python scripts to auto-generate articles with Gemini from pins.json
2. **Content scaling** - 82 articles to write from scratch
3. **Search** - Search bar exists in Header but not functional
4. **Dark mode fixes** - Some hardcoded gray colors in article prose content
5. **OG image** - Need proper 1200x630 image (user should create in Canva)
6. **Pin variants** - Create v2/v3/v4 pins for each article (different images + descriptions)

## Important Notes
- favicon.ico is the SVG one the user created (not Astro default). May need browser cache clear (Ctrl+Shift+R)
- BaseLayout has `favicon.svg` listed BEFORE `favicon.ico` - SVG takes priority in modern browsers
- Contact form is non-functional (static site, no backend)
- Newsletter popup/signup is non-functional (no backend)
- Original Excel file kept at `../diet-website.xlsx` as backup
- Skro tracking links exist for pins 1-10 in original Excel (removed from clean version)
