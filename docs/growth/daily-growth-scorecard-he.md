# הפעלת מדידת הצמיחה היומית

המערכת עונה בכל יום על שתי שאלות שונות:

1. האם מערכת האתר, ההפצה והמדידה פועלת?
2. האם נמדדה תנועה חדשה באותו קוהורט ובאותו חלון זמן?

אסור להסיק תשובה לשאלה השנייה מהראשונה. build ירוק, workflow מוצלח או pin מתוזמן אינם צמיחה.

הכלי השבועי הקיים, `scripts/weekly-scorecard.py`, נשאר אחראי ליעדי שלב ולמדדים אוטומטיים ארוכי טווח. הכלי היומי אינו מחליף אותו: הוא מוסיף את השוואת הקוהורט המדויקת ואת ממשל השחרורים החסרים.

## 1. ייצוא הנתונים

שמור את הקבצים ב־`Downloads`. אין צורך לשנות את שמות ברירת המחדל.

- **GSC:** פתח Performance, החל מסנן Page שמכיל רק את 20 הכתובות בקובץ `reports/growth/search-recovery-cohort-2026-07-23.csv`, בחר חלון שמכיל לפחות שמונה ימים מלאים, והורד ZIP. ייצוא ללא Page filter יסומן `COHORT_MISMATCH`.
- **Bing:** הורד `SearchPerformanceOverview_All`. כל האתר הוא הקוהורט הקבוע של Bing.
- **Pinterest:** הורד Analytics overview עם `Claimed accounts=All Pins` ו־`Curated content=Not included`.
- **Clarity:** נדרש CSV עם סדרה יומית `Date,Sessions`. Dashboard snapshot מצטבר ייקרא, אבל יסומן `NON_COMPARABLE`.

מקור שלא כולל את אתמול או את כל שבעת ימי הבסיס יסומן כמיושן או חלקי. הוא לא יוצג כ־0.

## 2. הרצת הדוח

```powershell
py -3 scripts/daily-growth-scorecard.py --input-dir "$HOME\Downloads" --stdout
```

ברירת המחדל כותבת:

```text
pipeline-data/scorecards/daily/scorecard-YYYY-MM-DD.md
```

הרצה לתאריך היסטורי וקובץ JSON נלווה:

```powershell
py -3 scripts/daily-growth-scorecard.py `
  --input-dir "$HOME\Downloads" `
  --as-of 2026-07-28 `
  --output pipeline-data/scorecards/daily/scorecard-2026-07-28.md `
  --json-output pipeline-data/scorecards/daily/scorecard-2026-07-28.json
```

הדוח תמיד משווה את `as-of - 1` לממוצע שבעת הימים שקדמו לו. הוא אינו עובר אוטומטית ליום האחרון הזמין, כי פעולה כזו תערבב חלונות ותיצור מראית עין של השוואה תקינה.

## 3. קוהורטים קבועים

הגדרות הקוהורט נמצאות ב־`pipeline-data/growth-measurement/cohorts.json`.

- GSC: עשרים כתובות recovery מ־23 ביולי.
- Bing: כל האתר, ללא מעבר בין Pages, Queries או AI citations.
- Pinterest: חשבון שלם, All Pins, ללא curated content.
- Clarity: כל האתר, sessions יומיים.

אין לשנות קוהורט בגלל יום חלש. שינוי קוהורט הוא release מדידה חדש, עם תאריך והסבר.

## 4. מוסכמת UTM

כל שחרור חיצוני משתמש בארבעה שדות באותיות קטנות וב־kebab-case:

```text
utm_source=<platform>
utm_medium=<organic-social|community|email|syndication|referral>
utm_campaign=<yyyy-mm-topic-goal>
utm_content=<asset-variant>
```

דוגמה:

```text
?utm_source=pinterest&utm_medium=organic-social&utm_campaign=2026-07-protein-cost&utm_content=beans-chart-v1
```

אין להשתמש רק ב־`utm_content=v1`. ללא source, medium ו־campaign אי אפשר לייחס תנועה לשחרור.

## 5. רישום שחרור

הכלי משתמש ב־ledger הקיים: `pipeline-data/distribution-release-ledger.jsonl`. ברירת המחדל היא dry-run.

```powershell
py -3 scripts/growth-release-log.py release `
  --channel pinterest `
  --cohort-id pinterest-research-july `
  --experiment-id protein-cost-static `
  --asset-id beans-chart-v1 `
  --destination https://www.daily-life-hacks.com/protein-per-dollar/ `
  --campaign 2026-07-protein-cost `
  --content beans-chart-v1 `
  --external-id 1124140757000000000
```

בדוק את ה־JSON ואת ה־UTM. רק לאחר שהשחרור באמת קיים בפלטפורמה, הרץ שוב עם `--write`.
כתיבה דורשת `--external-id`, כלומר URL או מזהה חיצוני שמוכיח שהשחרור אכן קיים. asset מקומי או תאריך מתוכנן אינם מספיקים.

הרשומה כוללת אוטומטית מועדי מדידה לאחר 7, 30 ו־60 יום. ה־scorecard מציג checkpoints שמגיעים היום או נמצאים באיחור.
לאחר שנרשם checkpoint, הוא מוסר מרשימת האיחורים בלי למחוק את רשומת השחרור המקורית.

## 6. רישום checkpoint והחלטה

```powershell
py -3 scripts/growth-release-log.py checkpoint `
  --release-id rel-20260728-pinterest-beans-chart-v1 `
  --day 30 `
  --releases 5 `
  --impressions 1200 `
  --outbound-clicks 18 `
  --qualified-sessions 8
```

גם כאן ברירת המחדל היא dry-run. הוסף `--write` לאחר בדיקה.
`--releases` הוא מספר הפריטים בקוהורט שעל בסיסו מתקבלת החלטת STOP/SCALE. checkpoint חייב להפנות ל־release שכבר קיים ב־ledger, ולא ניתן לכתוב פעמיים את אותו יום מדידה לאותו release.

### יום 7

- STOP מיד אם יש warning, removal, ban או יעד שבור.
- ITERATE אם אין שום אות הפצה.
- אחרת HOLD. לא מגדילים נפח בשבוע הראשון.

### יום 30

- STOP אם לפחות חמישה שחרורים קיבלו 0 חשיפות.
- SCALE אם לפחות שלושה שחרורים יצרו בממוצע סשן איכותי אחד לשחרור, ללא אירועי מדיניות.
- אחרת ITERATE.

### יום 60

- STOP אם לפחות עשרה שחרורים יצרו 0 סשנים איכותיים.
- SCALE אם לפחות עשרה שחרורים יצרו בממוצע סשן איכותי אחד לשחרור, ללא אירועי מדיניות.
- אחרת ITERATE.

ניתן לתעד override אנושי עם `--decision` ו־`--note`. אין למחוק החלטה קודמת מה־ledger.

## 7. בדיקות

```powershell
py -3 -m pytest tests/cli/test_daily_growth_scorecard.py tests/cli/test_growth_release_log.py -q
```

## 8. פירוש צבעים

- 🟢: הקלט בר־השוואה או אות יומי חיובי. אות יומי אחד עדיין אינו מגמה.
- 🟡: שטוח, חסר היסטוריה, מיושן או aggregate בלבד.
- 🔴: קוהורט שגוי, קלט פגום או ירידה שעוברת את סף האיתות.
- ⚪: אין קובץ. המשמעות היא "לא ידוע", לא אפס.

הפעולה היומית הנכונה היא לייצא, להריץ, לסגור checkpoints ולתעד החלטה. אין לשכתב כתבות או לשנות URLs בגלל יום אחד.
