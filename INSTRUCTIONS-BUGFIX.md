# Complete Bug Fix & Dark Mode Standardization

## RULES
1. Run `npm run dev` and open the site in Chrome with DevTools open
2. Fix each section IN ORDER — do NOT skip ahead
3. After EVERY fix: save, check the browser, verify in BOTH light and dark mode
4. **Use ONLY CSS variables for colors** — the variables are defined in `src/styles/global.css`
5. Do NOT modify any file not listed in the "Files to modify" section
6. Run `npx astro check` when done — must show 0 errors, 0 warnings

## Available CSS Variables (defined in global.css)
```
Light Mode → Dark Mode:
--page-bg:          #f9fafb → #0f172a
--card-bg:          #ffffff → #1e293b
--header-bg:        #ffffff → #1e293b
--header-border:    #e5e7eb → #334155
--heading-color:    #111827 → #f1f5f9
--text-color:       #374151 → #cbd5e1
--muted-color:      #6b7280 → #94a3b8
--label-color:      #9ca3af → #64748b
--border-color:     #e5e7eb → #334155
--newsletter-bg:    #f9fafb → #1e293b
--newsletter-border:#dcdfe4 → #334155
--input-bg:         #f3f4f6 → #334155
```

**RULE: Never use Tailwind color classes like `text-gray-900`, `bg-white`, `bg-gray-50`, `dark:bg-gray-800`, etc. Always use `style="color: var(--text-color);"` instead.**

---

## Section 1: BaseLayout.astro — Body Tag
**File:** `src/layouts/BaseLayout.astro`

**Find line 92:**
```html
<body class="bg-gray-50 text-gray-900 min-h-screen">
```

**Replace with:**
```html
<body class="min-h-screen" style="background-color: var(--page-bg); color: var(--text-color);">
```

### Verify
- [ ] Open homepage — background is light gray in light mode
- [ ] Toggle dark mode — background becomes dark navy blue
- [ ] All text is readable in both modes

---

## Section 2: ArticleCarousel.astro — Heading + Buttons + Scrollbar
**File:** `src/components/ArticleCarousel.astro`

Find the heading (has `text-gray-900`):
**Replace** `text-gray-900` class with `style="color: var(--heading-color);"`

Find the left/right scroll buttons (have `border-gray-200 bg-white text-gray-600`):
**Replace** those classes with `style="border-color: var(--border-color); background-color: var(--card-bg); color: var(--muted-color);"`

Find the scrollbar style (has `scrollbar-color: #F29B30 #f3f4f6`):
**Replace** `#f3f4f6` with `var(--input-bg)`

### Verify
- [ ] Carousel title readable in dark mode
- [ ] Scroll buttons visible in dark mode (not white boxes on dark bg)
- [ ] Scrollbar track color matches theme

---

## Section 3: ArticleGrid.astro — Heading + Separator Line
**File:** `src/components/ArticleGrid.astro`

Find the heading (has `text-gray-900`):
**Replace** `text-gray-900` class with inline style: `style="color: var(--heading-color);"`

Find the separator line (has `bg-gray-200`):
**Replace** `bg-gray-200` class with `style="background-color: var(--border-color);"`

### Verify
- [ ] Section title readable in dark mode
- [ ] Separator line visible but subtle in dark mode

---

## Section 4: NewsletterPopup.astro — Standardize ALL Colors
**File:** `src/components/NewsletterPopup.astro`

This component currently mixes `dark:` Tailwind classes with hardcoded grays. Replace ALL of them with CSS variables.

**Line 19 — popup container:**
Replace `bg-white dark:bg-gray-800` with:
`style="background-color: var(--card-bg);"`
(keep the other classes like rounded, shadow, etc.)

**Line 50 — close button:**
Replace `text-gray-400 hover:text-gray-600 dark:hover:text-gray-200` with:
`style="color: var(--label-color);"`

**Line 76 — title:**
Replace `text-gray-900 dark:text-white` with:
`style="color: var(--heading-color);"`

**Line 83 — description:**
Replace `text-gray-600 dark:text-gray-300` with:
`style="color: var(--muted-color);"`

**Line 99 — email input:**
Replace `text-gray-900 bg-gray-50 border border-gray-300 ... dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white` with:
`style="color: var(--text-color); background-color: var(--input-bg); border: 1px solid var(--border-color);"` and keep `rounded-lg focus:ring-2 focus:ring-[#F29B30] focus:border-[#F29B30] outline-none transition-all`

**Line 110 — "No spam" text:**
Replace `text-gray-400` with:
`style="color: var(--label-color);"`

**Line 122 — success icon:**
`bg-green-100 text-green-500` — these are accent colors (green for success), OK to keep as-is.

**Line 137 — "You're in!" text:**
Replace `text-gray-800 dark:text-white` with:
`style="color: var(--heading-color);"`

**Line 140 — "Check your inbox" text:**
Replace `text-gray-600 dark:text-gray-300` with:
`style="color: var(--muted-color);"`

**Line 37 — fallback gradient:**
Replace `from-orange-100 to-orange-200 dark:from-gray-700 dark:to-gray-900` with:
`style="background-color: var(--input-bg);"`

### Verify
Open popup with this Console command:
```js
localStorage.removeItem("newsletter_popup_closed");
document.getElementById("newsletter-popup").classList.remove("pointer-events-none", "opacity-0");
document.getElementById("popup-content").classList.remove("translate-y-full", "scale-95");
```
- [ ] Popup background matches card-bg in both modes
- [ ] All text readable in dark mode
- [ ] Input field visible and usable in dark mode
- [ ] Close with X button works
- [ ] Close by clicking overlay works
- [ ] Image fills the entire left panel (no white/gray gaps)

---

## Section 5: Newsletter.astro — Subtitle Color
**File:** `src/components/Newsletter.astro`

Find `text-gray-600` on the subtitle text.
**Replace** with `style="color: var(--muted-color);"`

### Verify
- [ ] Newsletter subtitle readable in dark mode

---

## Section 6: recipes/index.astro — Hardcoded Grays
**File:** `src/pages/recipes/index.astro`

Find all `text-gray-600` → Replace with `style="color: var(--muted-color);"`
Find all `text-gray-500` → Replace with `style="color: var(--label-color);"`

### Verify
- [ ] /recipes page — all text readable in dark mode

---

## Section 7: nutrition/index.astro — Hardcoded Grays
**File:** `src/pages/nutrition/index.astro`

Same as recipes:
Find all `text-gray-600` → Replace with `style="color: var(--muted-color);"`
Find all `text-gray-500` → Replace with `style="color: var(--label-color);"`

### Verify
- [ ] /nutrition page — all text readable in dark mode

---

## Section 8: contact.astro — Link Colors
**File:** `src/pages/contact.astro`

Find `text-sky-600` → Replace with `style="color: var(--text-color);"`
Find `text-gray-600 hover:text-red-600` → Replace with `style="color: var(--muted-color);"` (keep hover effect with onmouseover/onmouseout if needed, or just use a simple style)
Find `text-gray-600 hover:text-blue-600` → same
Find `text-gray-600 hover:text-pink-600` → same
Find any `hover:bg-orange-600` → keep as-is (accent color)

### Verify
- [ ] /contact page — all text and links readable in dark mode

---

## Section 9: disclaimer.astro — Amber Colors
**File:** `src/pages/disclaimer.astro`

Find `bg-amber-50 border-l-4 border-amber-500`:
**Replace** with `style="background-color: var(--input-bg); border-left: 4px solid #F29B30;"`

Find `text-amber-900` → Replace with `style="color: var(--heading-color);"`
Find `text-amber-800` → Replace with `style="color: var(--text-color);"`

### Verify
- [ ] /disclaimer page — all text readable in dark mode
- [ ] Warning box visible but not blinding in dark mode

---

## Section 10: Astro Hints — Code Cleanup
These are warnings from `npx astro check`. Fix them:

**10a. `src/pages/index.astro` line 5:**
Delete this unused import:
```
import ArticleCard from '../components/ArticleCard.astro';
```

**10b. `src/pages/nutrition/index.astro` line 7:**
Delete this unused import:
```
import type { CollectionEntry } from "astro:content";
```

**10c. `src/pages/recipes/index.astro` line 7:**
Delete this unused import:
```
import type { CollectionEntry } from "astro:content";
```

**10d. `src/components/Newsletter.astro` lines 50-51:**
Replace deprecated iframe attributes:
- Remove `frameborder="0"` and `scrolling="no"`
- Add to the iframe's style: `border: 0; overflow: hidden;`

**10e. `src/layouts/BaseLayout.astro` line 88:**
The JSON-LD script tag — add `is:inline` attribute:
```html
<script is:inline type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
```

### Verify
Run `npx astro check` — should show 0 errors, 0 warnings, at most 1-2 hints.

---

## Section 11: Pinterest Save Button — Verify
**File:** `src/layouts/BaseLayout.astro` (already has the SDK)

The Pinterest SDK is at the bottom of body with `data-pin-build="parsePinBtns"` and an `astro:page-load` listener calling `parsePinBtns()`.

### VERIFY THIS EXACT SEQUENCE (do NOT skip any step):
1. [ ] Go to homepage → hover over an article card image → red "Save" button appears
2. [ ] Click on an article → hover over the main image → red "Save" button appears
3. [ ] Click "Home" in nav → hover over images → Save button appears
4. [ ] Click "Nutrition" → hover over images → Save button appears
5. [ ] Click "Recipes" → hover over images → Save button appears
6. [ ] Click on another article → hover over image → Save button appears
7. [ ] Navigate back to homepage → hover → Save button still works
8. [ ] Toggle dark mode → repeat steps 1-3 → still works

**If the Save button does NOT appear after navigation:**
The `parsePinBtns()` call isn't working. Try this alternative — replace the Pinterest script block in BaseLayout.astro with:
```html
<script is:inline>
  function loadPinterestSDK() {
    document.querySelectorAll('[data-pin-log]').forEach(function(el) { el.remove(); });
    var old = document.getElementById("pinterest-sdk");
    if (old) old.remove();

    var s = document.createElement("script");
    s.id = "pinterest-sdk";
    s.async = true;
    s.src = "https://assets.pinterest.com/js/pinit.js";
    s.setAttribute("data-pin-hover", "true");
    s.setAttribute("data-pin-tall", "true");
    s.setAttribute("data-pin-round", "true");
    document.body.appendChild(s);
  }

  document.addEventListener("astro:page-load", function() {
    setTimeout(loadPinterestSDK, 300);
  });
</script>
```

---

## Section 12: Recipe Articles Missing Data
**File:** `src/data/articles/avocado-toast-variations.md`
**File:** `src/data/articles/smoothie-bowl-recipes.md`

These articles have `category: recipes` but are missing recipe fields. Add the following frontmatter fields to each:

For **avocado-toast-variations.md**, add after the existing frontmatter fields:
```yaml
prepTime: "5 minutes"
cookTime: "5 minutes"
totalTime: "10 minutes"
servings: 2
calories: 320
difficulty: "Easy"
ingredients:
  - "2 slices whole grain bread"
  - "1 ripe avocado"
  - "1 tablespoon lemon juice"
  - "Salt and pepper to taste"
  - "Red pepper flakes (optional)"
  - "1 tablespoon extra virgin olive oil"
steps:
  - "Toast the bread slices until golden and crispy."
  - "Cut the avocado in half, remove the pit, and scoop the flesh into a bowl."
  - "Mash the avocado with lemon juice, salt, and pepper to your desired consistency."
  - "Spread the mashed avocado evenly on each toast slice."
  - "Drizzle with olive oil and top with red pepper flakes if desired."
  - "Serve immediately and enjoy!"
```

For **smoothie-bowl-recipes.md**, add after the existing frontmatter fields:
```yaml
prepTime: "10 minutes"
cookTime: "0 minutes"
totalTime: "10 minutes"
servings: 1
calories: 280
difficulty: "Easy"
ingredients:
  - "1 frozen banana"
  - "1/2 cup frozen mixed berries"
  - "1/2 cup Greek yogurt"
  - "1/4 cup almond milk"
  - "1 tablespoon honey or maple syrup"
  - "Toppings: granola, sliced fruit, chia seeds, coconut flakes"
steps:
  - "Add frozen banana, berries, yogurt, and almond milk to a blender."
  - "Blend on low speed, using a tamper or stirring as needed, until thick and creamy."
  - "The mixture should be thicker than a regular smoothie — add milk sparingly."
  - "Pour into a bowl and smooth the top with a spoon."
  - "Arrange your toppings in rows: granola, sliced fruit, chia seeds, and coconut."
  - "Serve immediately before it melts!"
```

### Verify
- [ ] Go to `/avocado-toast-variations` → orange recipe card shows with prep time, ingredients, steps
- [ ] Go to `/smoothie-bowl-recipes` → same orange recipe card shows
- [ ] Both display correctly in dark mode

---

## Final QA Checklist — Do This LAST

### Every Page Loads
Navigate to each URL — verify header + content + footer appear:
- [ ] http://localhost:4321/
- [ ] http://localhost:4321/nutrition
- [ ] http://localhost:4321/recipes
- [ ] http://localhost:4321/privacy
- [ ] http://localhost:4321/terms
- [ ] http://localhost:4321/disclaimer
- [ ] http://localhost:4321/contact
- [ ] http://localhost:4321/10-high-protein-breakfasts
- [ ] http://localhost:4321/avocado-toast-variations
- [ ] http://localhost:4321/healthy-snack-ideas
- [ ] http://localhost:4321/lemon-herb-chicken
- [ ] http://localhost:4321/meal-prep-sunday-guide
- [ ] http://localhost:4321/mediterranean-diet-guide
- [ ] http://localhost:4321/overnight-oats
- [ ] http://localhost:4321/smoothie-bowl-recipes

### Dark Mode on Every Page
- [ ] Toggle dark mode on homepage
- [ ] Navigate through ALL 15 pages above — dark mode persists, no white flash
- [ ] ALL text readable on every page (no black text on dark background)

### Pinterest Save Button
- [ ] Works on homepage after initial load
- [ ] Works after navigating to 3+ different pages via header links
- [ ] Works on article pages (hover over featured image)

### Newsletter Popup
- [ ] Opens after 20 seconds (or use Console command to test)
- [ ] X button closes it
- [ ] Overlay click closes it
- [ ] Looks correct in both light and dark mode
- [ ] Image fills the left panel completely

### Run Astro Check
```
npx astro check
```
- [ ] 0 errors
- [ ] 0 warnings

---

## Files to Modify
- `src/layouts/BaseLayout.astro` (body tag + JSON-LD script)
- `src/components/ArticleCarousel.astro`
- `src/components/ArticleGrid.astro`
- `src/components/NewsletterPopup.astro`
- `src/components/Newsletter.astro`
- `src/pages/recipes/index.astro`
- `src/pages/nutrition/index.astro`
- `src/pages/contact.astro`
- `src/pages/disclaimer.astro`
- `src/pages/index.astro` (remove unused import only)
- `src/data/articles/avocado-toast-variations.md`
- `src/data/articles/smoothie-bowl-recipes.md`

## Files NOT to Modify
- `src/styles/global.css`
- `src/components/Header.astro`
- `src/components/Footer.astro`
- `src/components/HeroSection.astro`
- `src/components/ArticleCard.astro`
- `src/pages/[slug].astro`
- `src/pages/privacy.astro`
- `src/pages/terms.astro`
- `src/content/config.ts`
- `astro.config.mjs`
