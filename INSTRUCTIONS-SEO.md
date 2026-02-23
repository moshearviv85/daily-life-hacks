# תוכנית SEO - Daily Life Hacks

## סטטוס: ✅ כבר בוצע (על ידי Claude)

> **הערה:** כל המשימות בתוכנית הזאת כבר בוצעו. קובץ זה נשמר לתיעוד ולהפניה עתידית.

---

## מה בוצע:

### 1. robots.txt - ✅ בוצע
**קובץ:** `public/robots.txt`
**מה נעשה:** נוצר קובץ חדש עם הנחיות לגוגל/בינג

```
User-agent: *
Allow: /

Disallow: /admin/
Disallow: /.git/
Disallow: /node_modules/

Sitemap: https://www.daily-life-hacks.com/sitemap-index.xml
```

---

### 2. Organization Schema - ✅ בוצע
**קובץ:** `src/pages/index.astro`
**מה נעשה:** נוסף אובייקט JSON-LD של Organization Schema

```js
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Daily Life Hacks',
  url: 'https://www.daily-life-hacks.com',
  description: 'Science-backed nutrition tips and easy, healthy recipes for everyday wellness.',
  logo: 'https://www.daily-life-hacks.com/logo.png',
  sameAs: ['https://pinterest.com'],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Support',
    url: 'https://www.daily-life-hacks.com/contact'
  }
};
```

---

### 3. Title & Description - ✅ בוצע
**קובץ:** `src/pages/index.astro`
**מה נעשה:** עדכון ה-BaseLayout tag

```astro
<BaseLayout
  title="Healthy Recipes & Nutrition Tips | Daily Life Hacks"
  description="Discover science-backed nutrition tips and easy, healthy recipes. Join 2,500+ readers for weekly wellness insights and meal prep guides."
  jsonLd={organizationSchema}
>
```

---

### 4. H1 Heading (מוסתר) - ✅ בוצע
**קובץ:** `src/pages/index.astro`
**מה נעשה:** נוסף H1 מוסתר (sr-only) לפני ה-HeroSection

```html
<div class="sr-only">
  <h1>Healthy Recipes & Nutrition Tips for a Better You</h1>
</div>
```

---

## משימות עתידיות (טרם בוצעו):

1. **יצירת og-default.jpg** - תמונת OG 1200x630px בתיקיית `public/`
2. **דפי קטגוריות** - `/nutrition` ו-`/recipes` (עדיין לא קיימים)
3. **דפים חוקיים** - `/privacy`, `/disclaimer`, `/contact` (עדיין לא קיימים)
4. **Favicon מותאם** - להחליף את ה-favicon של Astro ללוגו של Daily Life Hacks

---

## בדיקה

1. הפעל `npm run dev`
2. נכנס ל-localhost ו-View Page Source
3. בדוק ש-`<script type="application/ld+json">` קיים ב-head
4. בדוק ש-`<h1>` קיים ב-div עם class sr-only
5. הפעל `npm run build`
6. בדוק ש-`dist/robots.txt` קיים
