# Indexation and Internal-Link Audit — 2026-07-13

## מסקנה

בשכבת ה-build המקומית לא נמצאה חסימת indexability טכנית עבור 187 המאמרים: כולם נבנו, כולם self-canonical, אף אחד מהם אינו `noindex`, וכולם נמצאים ב-sitemap. גם לא נמצאו orphan pages אמיתיים או יעדי קישור פנימיים בלתי פתירים.

החולשה המוכחת היא ארכיטקטונית: 40 מאמרים מקבלים רק 1–2 קישורים נכנסים ממאמרים אחרים, ורק 7 מתוך 187 משויכים ל-content cluster. זה signal חזק לתיעדוף internal linking ו-cluster activation, אבל אינו הוכחה שמאמר כלשהו אינו מאונדקס. את מצב האינדוקס בפועל יש לאמת ב-GSC URL Inspection.

## Snapshot ומתודולוגיה

- Git HEAD שנבדק: `cada34daca8c83f2f59d3079558c7cf3a1ee559e` (`chore(deploy): promote article visual upgrade`).
- `dist/` נוצר ב-2026-07-13 06:20:28; הבדיקה היא של artifact מקומי ולא הוכחת deploy/live.
- inventory: כל 187 הקבצים תחת `src/data/articles/`.
- build graph: 569 קובצי HTML, מתוכם 196 canonical pages indexable.
- sitemap: 196 כתובות, מתוכן כל 187 המאמרים ועוד 9 דפי אתר.
- `article_inlinks`: מספר עמודי מאמר ייחודיים אחרים שמקשרים למאמר. ספירת referring pages, לא ספירת anchors.
- `site_inlinks`: מספר עמודים indexable ייחודיים מכל הסוגים שמקשרים למאמר.
- מקורות `noindex`, self-links, scripts ו-styles לא נספרו בגרף.
- cluster metadata נבדק מול `src/content/clusters.ts` באמצעות `npm run audit:clusters` במצב report-only.

## ממצאים מוכחים מקומית

| בדיקה | תוצאה | משמעות |
|---|---:|---|
| מאמרים עם build artifact | 187/187 | אין canonical article חסר ב-`dist/` |
| self-canonical תקין | 187/187 | 0 missing/mismatch canonical |
| מאמרים עם `noindex` | 0 | אין חסימת robots מוכחת במאמרים |
| מאמרים ב-sitemap | 187/187 | אין sitemap omission מוכח |
| duplicate canonical | 0 | לא נמצאה התכנסות של שני דפי מאמר לאותו canonical |
| article-graph orphans | 0 | לכל מאמר יש לפחות קישור אחד ממאמר אחר |
| sitewide orphans | 0 | לכל מאמר יש לפחות referring page indexable אחד |
| מאמרים עם 1–2 article inlinks | 40 | שכבת discovery/equity דקה; 8 עם קישור אחד ו-32 עם שניים |
| יעדי קישור פנימי בלתי פתירים | 0 | נבדקו built canonical paths וגם 537 runtime aliases |
| קישורים לנתיב indexable לא-canonical | 0 | `verify:internal-links` עבר על 16,248 anchors |

גם `npm run verify:routing` עבר: 187 canonical pages קיימים, 537 יעדי pin נשארו runtime-301 בלבד, ואין alias HTML leakage.

## תור P2: שמונת העמודים החלשים ביותר

לכל אחד מהעמודים הבאים יש רק referring article אחד. הם אינם orphan pages — אבל הם השכבה הראשונה לחיזוק באמצעות 2–3 קישורים contextual מעמודים רלוונטיים וחזקים.

| Slug | Article inlinks | Site inlinks | Outgoing article links |
|---|---:|---:|---:|
| `30-day-high-fiber-challenge-meal-plan` | 1 | 3 | 6 |
| `black-bean-brownies-hidden-fiber-dessert` | 1 | 3 | 5 |
| `healthy-sweet-tooth-snack-ideas-night` | 1 | 2 | 6 |
| `how-to-reduce-food-waste-at-home-easy-tips` | 1 | 2 | 7 |
| `ricotta-berry-toast-bar-no-cook` | 1 | 2 | 6 |
| `selenium-containing-foods-easy-ways` | 1 | 2 | 4 |
| `sheet-pan-salmon-and-vegetables-30-minutes` | 1 | 2 | 6 |
| `tuscan-white-bean-kale-soup-stovetop` | 1 | 2 | 6 |

32 עמודים נוספים מקבלים שני article inlinks בלבד; כולם מסומנים `P2` ב-CSV.

התפלגות article inlinks לכל ה-inventory: 8 עם 1, 32 עם 2, 28 עם 3, 20 עם 4, 29 עם 5, ו-70 עם 6 ומעלה. לכן הבעיה אינה orphaning אלא זנב ארוך עם link equity דק.

## Cluster metadata

`npm run audit:clusters` החזיר:

- 187 מאמרים נסרקו.
- 7 משויכים ל-cluster תקין.
- 180 ללא `cluster`.
- לא נמצאו unknown cluster, parent mismatch או self-referential parent במאמרים המשויכים.

| Cluster רשום | מאמרים משויכים | Parent pillar | מצב parent | Parent article inlinks |
|---|---:|---|---|---:|
| `budget-fiber` | 3 | `how-to-eat-more-fiber-on-a-budget-complete-guide` | משויך ופעיל | 67 |
| `budget-protein` | 4 | `high-protein-on-a-budget-complete-guide` | משויך ופעיל | 25 |
| `weekly-budget-shopping` | 0 | `eat-healthy-on-a-budget-complete-playbook` | קיים אך לא משויך | 25 |
| `meal-prep-food-storage` | 0 | `meal-prep-for-beginners-complete-system` | קיים אך לא משויך | 14 |

המשמעות: שני clusters קיימים רק ברישום, אף שיש להם pillars בנויים עם קישורים נכנסים. זה חוב ארכיטקטורה מוכח. לעומת זאת, `cluster_missing` על 180 מאמרים אינו בפני עצמו חסימת אינדוקס ואינו סיבה לבצע bulk metadata edit; יש להרחיב clusters רק סביב pillars ו-query families שנבחרו לפי נתוני GSC.

## מה דורש GSC URL Inspection

הבדיקה המקומית אינה יכולה לקבוע:

- האם Google indexed את ה-URL בפועל.
- האם הסטטוס הוא `Crawled - currently not indexed` או `Discovered - currently not indexed`.
- מהו Google-selected canonical.
- מועד crawl אחרון, sitemap detection בפועל, או השפעת קישורים על impressions.

תור הבדיקה המומלץ:

1. שמונת העמודים עם article inlink יחיד.
2. 32 עמודי P2 עם שני article inlinks.
3. שני ה-pillars הרשומים אך הלא-משויכים, רק אם לנתוני Performance שלהם יש מעט/אפס impressions.

לכל URL יש לתעד: Page indexing status, user-declared canonical, Google-selected canonical, last crawl, sitemap detection ו-Live Test. אין להסיק מ-report lag או מאפס impressions בלבד שהעמוד אינו מאונדקס, ואין לבצע Request Indexing סדרתי לפני שמוודאים שיש שינוי אמיתי בעמוד או בגרף הקישורים.

## סדר ביצוע מומלץ

1. **Internal-link wave 1:** לחזק את 8 עמודי ה-1-inlink מתוך מאמרים רלוונטיים שכבר מקבלים 10+ article inlinks; יעד מדיד: לפחות 3 referring articles לכל עמוד.
2. **Internal-link wave 2:** לחזק את 32 עמודי ה-2-inlink ל-3–5 referring articles, בלי sitewide/template links ובלי anchors מלאכותיים.
3. **Activate two registered clusters:** למפות satellites אמיתיים ל-`weekly-budget-shopping` ול-`meal-prep-food-storage`, ולוודא קישורים דו-כיווניים pillar ↔ satellite לפני הוספת metadata.
4. **GSC evidence merge:** לצרף את תוצאות URL Inspection ל-CSV ולפצל בין indexed, crawled-not-indexed ו-discovered-not-indexed. רק אז לקבוע remediation שונה לכל קבוצה.

## CSV ותיעדוף

הקובץ `reports/growth/indexation-link-audit-2026-07-13.csv` כולל את כל 187 המאמרים.

- `P1`: blocker מקומי כמו missing build/canonical, `noindex` או sitemap omission — נמצאו 0.
- `P2`: orphan/site-orphan או 1–2 article inlinks — נמצאו 40.
- `P3`: cluster metadata חסר ללא blocker טכני — נמצאו 140; שני registered parents לא משויכים מקבלים score גבוה יותר בתוך הקבוצה.
- `P4`: cluster assignment תקין וללא concern מקומי — נמצאו 7.
- `canonical_concern`, `orphan`, `site_orphan`, `low_inlink` ו-`cluster_status` הם שדות מפורשים כדי לא לערבב בין סוגי הבעיה.
- `gsc_url_inspection` הוא תור עבודה, לא סטטוס אינדוקס.

## גבולות ההוכחה

זהו audit read-only של repo ו-build artifacts. לא נבדק GSC live, לא בוצעה URL Inspection, לא נבדק deploy production, ולא שונו מאמרים, קוד, D1 או GitHub. לכן המסקנה המדויקת היא: **ה-output המקומי indexable ו-connected; מצב האינדוקס בפועל עדיין דורש אימות Google-side.**
