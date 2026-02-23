# הוראות ביצוע: כפתור Pinterest Save (Hover על תמונות)

## הקדמה לג'ימיני
אתה מפתח שמקבל הנחיות מפורטות לביצוע. בצע בדיוק לפי ההוראות הבאות, צעד אחרי צעד. אל תשנה כלום מעצמך.

## מה עושים?
מוסיפים כפתור "Save" של Pinterest שמופיע כשמרחפים על תמונות באתר.

---

## שינוי 1: הוסף Pinterest SDK לאתר

**קובץ:** `src/layouts/BaseLayout.astro`
**מיקום:** לפני תג הסגירה `</body>`

**מצב נוכחי:**
```html
<body class="bg-gray-50 text-gray-900 min-h-screen">
  <slot />
</body>
</html>
```

**מצב חדש:**
```html
<body class="bg-gray-50 text-gray-900 min-h-screen">
  <slot />

  <!-- Pinterest Save Button SDK -->
  <script async defer src="https://assets.pinterest.com/js/pinit.js" data-pin-hover="true" data-pin-tall="true" data-pin-round="true"></script>
</body>
</html>
```

---

## שינוי 2: סמן את הלוגו כ-nopin

**קובץ:** `src/components/Header.astro`
**מיקום:** שורה 20 - תג ה-img של הלוגו

**מצב נוכחי:**
```html
<img src="/logo.png" alt="Daily Life Hacks" style="max-width: 200px; height: auto; vertical-align: middle;" />
```

**מצב חדש:**
```html
<img src="/logo.png" alt="Daily Life Hacks" data-pin-nopin="true" style="max-width: 200px; height: auto; vertical-align: middle;" />
```

---

## שינוי 3: הוסף Pin Description לתמונה הראשית של כתבה

**קובץ:** `src/pages/[slug].astro`
**מיקום:** שורות 74-78 - תג ה-img של התמונה הראשית

**מצב נוכחי:**
```html
<img
  src={article.data.image}
  alt={article.data.imageAlt}
  class="w-full rounded-2xl mb-10 aspect-video object-cover shadow-md"
/>
```

**מצב חדש:**
```html
<img
  src={article.data.image}
  alt={article.data.imageAlt}
  data-pin-description={`${article.data.title} - ${article.data.excerpt} | Daily Life Hacks`}
  class="w-full rounded-2xl mb-10 aspect-video object-cover shadow-md"
/>
```

---

## מה לא לשנות
- `src/pages/index.astro` - ה-SDK מטפל אוטומטית
- `src/components/HeroSection.astro` - ה-SDK מטפל אוטומטית
- `src/components/ArticleCard.astro` - ה-SDK מטפל אוטומטית

---

## בדיקה

1. הפעל `npm run dev`
2. רחף על תמונה בעמוד הבית → צריך להופיע כפתור Save אדום
3. רחף על הלוגו → לא צריך להופיע כפתור
4. לחץ על כתבה, רחף על התמונה הראשית → צריך להופיע כפתור Save
