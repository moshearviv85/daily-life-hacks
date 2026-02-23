# הוראות ביצוע: הפרדת דפי מתכון + Recipe Schema + 2 מתכונים לדוגמא

## הקדמה
אתה מפתח שמקבל הנחיות מפורטות. בצע בדיוק לפי ההוראות, צעד אחרי צעד. הפרויקט הוא Astro 5 + Tailwind v4.

## קבצים לשינוי/יצירה

| # | קובץ | פעולה |
|---|-------|--------|
| 1 | `src/content.config.ts` | עריכה - הוסף שדות אופציונליים למתכונים |
| 2 | `src/pages/[slug].astro` | עריכה - הוסף תנאי recipe + כרטיס מתכון + Recipe schema |
| 3 | `src/data/articles/lemon-herb-chicken.md` | יצירה - מתכון לדוגמא #1 |
| 4 | `src/data/articles/overnight-oats.md` | יצירה - מתכון לדוגמא #2 |

---

## שינוי 1: עדכון content.config.ts

הוסף את השדות האופציונליים הבאים ל-schema (כולם `.optional()`):

```ts
prepTime: z.string().optional(),
cookTime: z.string().optional(),
totalTime: z.string().optional(),
servings: z.number().optional(),
calories: z.number().optional(),
difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
ingredients: z.array(z.string()).optional(),
steps: z.array(z.string()).optional(),
```

---

## שינוי 2: עדכון [slug].astro

### 2A: JSON-LD Schema

החלף את בלוק ה-jsonLd (שורות 23-35) בלוגיקה חדשה:

```ts
const isRecipe = article.data.category === 'recipes' && article.data.ingredients && article.data.steps;

const jsonLd = isRecipe
  ? {
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: article.data.title,
      description: article.data.excerpt,
      image: article.data.image,
      datePublished: article.data.date.toISOString(),
      prepTime: article.data.prepTime ? `PT${article.data.prepTime.replace(/\s*minutes?\s*/i, 'M').replace(/\s*hours?\s*/i, 'H')}` : undefined,
      cookTime: article.data.cookTime ? `PT${article.data.cookTime.replace(/\s*minutes?\s*/i, 'M').replace(/\s*hours?\s*/i, 'H')}` : undefined,
      totalTime: article.data.totalTime ? `PT${article.data.totalTime.replace(/\s*minutes?\s*/i, 'M').replace(/\s*hours?\s*/i, 'H')}` : undefined,
      recipeYield: article.data.servings ? `${article.data.servings} servings` : undefined,
      recipeCategory: 'Healthy',
      recipeCuisine: 'American',
      nutrition: article.data.calories ? {
        '@type': 'NutritionInformation',
        calories: `${article.data.calories} calories`,
      } : undefined,
      recipeIngredient: article.data.ingredients,
      recipeInstructions: article.data.steps?.map((step: string, i: number) => ({
        '@type': 'HowToStep',
        position: i + 1,
        text: step,
      })),
      author: {
        '@type': 'Organization',
        name: 'Daily Life Hacks',
        url: 'https://www.daily-life-hacks.com',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Daily Life Hacks',
        url: 'https://www.daily-life-hacks.com',
      },
    }
  : {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.data.title,
      description: article.data.excerpt,
      image: article.data.image,
      datePublished: article.data.date.toISOString(),
      publisher: {
        '@type': 'Organization',
        name: 'Daily Life Hacks',
        url: 'https://www.daily-life-hacks.com',
      },
    };
```

### 2B: כרטיס מתכון (Recipe Card)

הוסף אחרי תמונת הכתבה הראשית, לפני Article Content, כרטיס מתכון שמופיע רק אם `isRecipe === true`:

**מבנה הכרטיס:**
1. **בר עליון כתום (#F29B30)** עם: Prep time, Cook time, Total time, Servings, Calories, Difficulty
2. **רשימת Ingredients** עם נקודות כתומות
3. **רשימת Instructions** ממוספרת עם עיגולים כתומים

**דרישות עיצוב:**
- מסגרת `border: 2px solid #F29B30` עם `rounded-2xl`
- רקע: `var(--card-bg)` (עובד dark mode)
- צבעי טקסט: `var(--heading-color)` ו-`var(--text-color)` (עובד dark mode)
- אייקוני SVG של שעון ליד זמני ההכנה
- כל מרכיב בשורה נפרדת עם נקודה כתומה עגולה קטנה
- כל שלב ממוספר בעיגול כתום עם מספר לבן

---

## שינוי 3: מתכון לדוגמא #1

**קובץ חדש:** `src/data/articles/lemon-herb-chicken.md`

**Frontmatter:**
- title: "Lemon Herb Grilled Chicken with Roasted Vegetables"
- excerpt: "A simple, flavorful grilled chicken recipe with fresh herbs and perfectly roasted vegetables. Ready in 35 minutes."
- category: "recipes"
- tags: ["chicken", "dinner", "high-protein", "meal-prep", "gluten-free"]
- image: "https://picsum.photos/seed/lemonchicken/800/500"
- imageAlt: "Grilled lemon herb chicken breast with colorful roasted vegetables on a white plate"
- date: 2026-02-19
- prepTime: "10 minutes"
- cookTime: "25 minutes"
- totalTime: "35 minutes"
- servings: 4
- calories: 380
- difficulty: "Easy"
- whatsHot: true

**13 Ingredients:**
4 chicken breasts, olive oil, 2 lemons (juice+zest), garlic, rosemary, thyme, oregano, red bell pepper, zucchini, cherry tomatoes, red onion, salt & pepper, parsley

**7 Steps:**
1. Make marinade (oil + lemon + herbs)
2. Marinate chicken 10+ min
3. Preheat grill 400°F + oven 425°F
4. Toss veggies with remaining marinade, spread on baking sheet
5. Roast veggies 20-25 min
6. Grill chicken 6-7 min per side to 165°F
7. Serve chicken over veggies, garnish

**Body content:** כתוב 4 סקשנים: Why This Recipe Works, Meal Prep Tips, Nutritional Breakdown (380cal/42g protein/12g carbs/18g fat/3g fiber), Variations (salmon, tofu, spicy, mediterranean)

---

## שינוי 4: מתכון לדוגמא #2

**קובץ חדש:** `src/data/articles/overnight-oats.md`

**Frontmatter:**
- title: "Creamy Overnight Oats: 3 Flavors You'll Crave"
- excerpt: "No-cook, make-ahead breakfast that's ready when you wake up. Three delicious flavor combos with under 5 minutes of prep."
- category: "recipes"
- tags: ["overnight-oats", "breakfast", "meal-prep", "no-cook", "vegan-friendly"]
- image: "https://picsum.photos/seed/overnightoats/800/500"
- imageAlt: "Three jars of overnight oats with different toppings"
- date: 2026-02-18
- prepTime: "5 minutes"
- cookTime: "0 minutes"
- totalTime: "5 minutes"
- servings: 1
- calories: 350
- difficulty: "Easy"
- editorsPick: true, mustRead: true

**8 Ingredients:**
½ cup rolled oats, ½ cup milk, ¼ cup Greek yogurt, 1 tbsp chia seeds, 1 tbsp maple syrup, ½ tsp vanilla, pinch salt, toppings

**5 Steps:**
1. Combine all in a jar
2. Stir well (chia seeds!)
3. Refrigerate 4+ hours or overnight
4. Stir in morning, add milk if thick
5. Add toppings, eat cold or microwave 2 min

**Body content:** כתוב סקשנים: The Base Formula (1:1:½ ratio), 3 Flavor Variations (Peanut Butter Banana, Berry Bliss, Chocolate Coconut), Meal Prep tips (3 days in fridge), Nutritional Breakdown (350cal/15g protein/45g carbs/12g fat/8g fiber)

---

## מה לא לשנות

- כתבות ישנות (smoothie-bowl, avocado-toast וכו') - ימשיכו לעבוד בלי שינוי
- index.astro, HeroSection, ArticleCard, BaseLayout - לא צריך שינוי

---

## בדיקה

1. `npm run dev` - אין שגיאות
2. עמוד הבית - מתכונים חדשים מופיעים בגריד
3. דף Lemon Herb Chicken - בר כתום + כרטיס מרכיבים + שלבים + תוכן
4. דף Overnight Oats - אותו דבר
5. דף nutrition רגיל - בלי כרטיס מתכון
6. דף recipe ישנה (Smoothie Bowl) - בלי כרטיס (אין ingredients/steps)
7. View Page Source מתכון חדש - JSON-LD עם `"@type": "Recipe"`
8. View Page Source כתבה רגילה - JSON-LD עם `"@type": "Article"`
9. Dark mode - כרטיס נראה טוב
