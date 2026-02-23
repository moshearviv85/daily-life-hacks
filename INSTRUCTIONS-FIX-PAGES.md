# הוראות: תיקון באגים בדפים החדשים

## הקדמה
ג'ימיני יצר 5 דפים חדשים (קטגוריות + משפטי). יש 3 באגים שצריך לתקן.

---

## באג 1: חסרים Header ו-Footer בכל 5 הדפים החדשים (קריטי)

**בעיה:** כל הדפים החדשים מציגים תוכן בלי Header (ניווט, לוגו, חיפוש, dark mode toggle) ובלי Footer. המשתמש לא יכול לנווט חזרה.

**קבצים לתיקון:**
1. `src/pages/nutrition/index.astro`
2. `src/pages/recipes/index.astro`
3. `src/pages/privacy.astro`
4. `src/pages/disclaimer.astro`
5. `src/pages/contact.astro`

**מה לעשות:**
- בכל דף, הוסף import ל-Header ו-Footer (תסתכל על `src/pages/index.astro` כדוגמא)
- הוסף `<Header />` מיד אחרי פתיחת `<BaseLayout>`
- הוסף `<Footer />` מיד לפני סגירת `</BaseLayout>`
- הנתיבים ל-import: `../components/Header.astro` ו-`../components/Footer.astro` (לדפי privacy/disclaimer/contact) או `../../components/Header.astro` ו-`../../components/Footer.astro` (לדפי nutrition/recipes)

---

## באג 2: ArticleCard מקבל props שגויים בדפי הקטגוריות (קריטי - ישבור build)

**בעיה:** בדפי `/nutrition` ו-`/recipes`, ה-ArticleCard נקרא עם `article={article}` אבל הקומפוננט מצפה ל-props נפרדים.

**קבצים לתיקון:**
1. `src/pages/nutrition/index.astro`
2. `src/pages/recipes/index.astro`

**מה לעשות:**
- תסתכל על ה-Props interface ב-`src/components/ArticleCard.astro` - הוא מצפה ל: `title`, `excerpt`, `image`, `imageAlt`, `category`, `slug`, `date`, `size` (optional), `fillHeight` (optional)
- החלף את הקריאה ל-ArticleCard כך שתעביר את ה-props הנפרדים מתוך `article.data` (למשל `title={article.data.title}`)
- ה-slug צריך להיות `article.id` (לא `article.data.slug`)

---

## באג 3: צבעים hardcoded שלא עובדים ב-dark mode (בינוני)

**בעיה:** חלק מהדפים המשפטיים משתמשים בצבעים קבועים במקום CSS variables, מה שגורם לבעיות ב-dark mode.

**קבצים לתיקון:**
1. `src/pages/contact.astro` - `bg-gray-50`, `text-gray-700`, `border-gray-200` בטופס
2. `src/pages/privacy.astro` - `bg-yellow-50`, `text-yellow-800`, `border-yellow-400` בהתראה

**מה לעשות:**
- החלף Tailwind color classes ב-inline styles עם CSS variables של האתר
- הצבעים הזמינים: `var(--card-bg)`, `var(--text-color)`, `var(--heading-color)`, `var(--muted-color)`, `var(--border-color)`, `var(--input-bg)`, `var(--label-color)`
- תסתכל על `src/components/Header.astro` ו-`src/components/Footer.astro` כדוגמאות לשימוש נכון ב-CSS variables
- הצבע הכתום של המותג: `#F29B30`

---

## מה לא לשנות

- `src/pages/index.astro` - עמוד הבית עובד
- `src/pages/[slug].astro` - דפי כתבות עובדים
- `src/components/` - כל הקומפוננטות עובדות
- `src/layouts/BaseLayout.astro` - עובד

---

## בדיקה

1. `npm run dev` - אין שגיאות build
2. כנס ל-`/nutrition` - ודא: Header עם לוגו + ניווט למעלה, כרטיסי כתבות עם תמונות ותוכן, Footer למטה
3. כנס ל-`/recipes` - אותו דבר
4. כנס ל-`/privacy`, `/disclaimer`, `/contact` - ודא: Header + Footer מופיעים
5. הפעל dark mode (כפתור הירח ב-Header) - ודא שכל הדפים נראים טוב
6. לחץ על כרטיס כתבה בדף קטגוריה - ודא שהלינק עובד ומוביל לדף הכתבה
