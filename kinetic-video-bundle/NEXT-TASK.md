# NEXT TASK - קרא זה ראשון, התחל לעבוד מיד

## מה אתה צריך לעשות
שדרג את `KineticShortComposition.tsx` ואז רנדר `HealthyFatsV3` לבדיקה.
**אל תשאל כלום. אל תריץ studio. רק שנה ורנדר.**

---

## קובץ לעריכה
```
C:\Users\offic\Desktop\dlh-fresh\kinetic-video-bundle\remotion-project\src\compositions\KineticShortComposition.tsx
```

---

## שינוי 1 - Spring physics (שורה ~294)

מצא:
```ts
const enterP = spring({ frame: sinceStart, fps, config: fastMode
    ? { damping: 16, stiffness: 650, mass: 0.25 }
    : { damping: 20, stiffness: 380, mass: 0.6  }
  });
```

החלף ב:
```ts
const enterP = spring({ frame: sinceStart, fps, config: fastMode
    ? { damping: 16, stiffness: 650, mass: 0.25 }
    : { damping: 9,  stiffness: 120, mass: 0.45 }
  });
```

**למה:** damping נמוך + mass נמוך = overshoot של ~15%. מילה מגיעה קצת מעבר לגודל ואז קופצת חזרה. זה ההבדל בין כתוביות לקינטיק.

---

## שינוי 2 - גדלי base (שורה ~322)

מצא:
```ts
const baseSizes = { hero: 195, strong: 148, normal: 108, subtle: 62 };
```

החלף ב:
```ts
const baseSizes = { hero: 260, strong: 165, normal: 108, subtle: 38 };
```

**למה:** יחס פי 7 בין hero לsubtile במקום פי 3. מילות מפתח ממלאות מסך, מילות שירות כמעט בלתי נראות.

---

## שינוי 3 - מינימום גודל לפי דגש (שורה ~77)

מצא:
```ts
function getMaxSafeSize(displayWord: string, maxW: number, maxH: number, fw = 700, minSize = 62): number {
```

החלף ב:
```ts
function getMaxSafeSize(displayWord: string, maxW: number, maxH: number, fw = 700, minSize = 38): number {
```

**למה:** מינימום 62 גלובלי גרם למילות שירות להיות גדולות מדי. עכשיו 38.

---

## שינוי 4 - Filler words - ללא spring (בתוך הWord component, שורה ~290-295)

מצא את הבלוק:
```ts
const importance = getImportance(wordTiming.word, wordIdx, total, Math.floor(wordIdx / 3));
const emphasis   = getEmphasis(importance);
const animType   = getAnimType(emphasis, wordIdx);
```

**אחרי** הבלוק הזה הוסף:
```ts
// Filler words: instant appear, no spring physics
const isFiller = emphasis === 'subtle';
```

ואז מצא:
```ts
const enterP = spring({ frame: sinceStart, fps, config: fastMode
```

החלף ב:
```ts
const enterP = isFiller
    ? Math.min(1, sinceStart / 3)   // instant linear, 3 frames
    : spring({ frame: sinceStart, fps, config: fastMode
```

וסגור את הspring עם סוגר נוסף:
```ts
        : { damping: 9,  stiffness: 120, mass: 0.45 }
      });
```

**למה:** מילות שירות ("the", "of", "and") לא מצדיקות spring מלא. הן פשוט מופיעות.

---

## שינוי 5 - Squash-and-stretch על hero words (שורה ~299-310)

מצא את בלוק ה-breath animation:
```ts
const breath = sinceStart * 0.07;
const bScale = 1 + Math.sin(breath) * 0.01;
const bY     = Math.sin(breath * 0.7) * 1.5;
const bRot   = Math.sin(breath * 0.5) * 0.3;
```

**אחרי** הבלוק הזה הוסף:
```ts
// Squash-and-stretch for hero words
const scaleY = emphasis === 'hero' ? enterP : 1;
const scaleX = emphasis === 'hero'
    ? interpolate(enterP, [0, 0.6, 1.15, 1], [0, 0.75, 1.08, 1])
    : 1;
```

ואז מצא בה-JSX את:
```ts
transform: `translate(-50%, -50%) translateX(${fx}px) translateY(${fy}px) scale(${fs}) rotate(${fr}deg)`,
```

החלף ב:
```ts
transform: `translate(-50%, -50%) translateX(${fx}px) translateY(${fy}px) scaleX(${scaleX * fs}) scaleY(${scaleY * fs}) rotate(${fr}deg)`,
```

**למה:** בכניסה scaleX מפגר אחרי scaleY = תחושת "נחיתה פיזית". קלאסי animation principle.

---

## אחרי כל השינויים - רנדר לבדיקה

```bash
cd C:\Users\offic\Desktop\dlh-fresh\kinetic-video-bundle\remotion-project
npx remotion render HealthyFatsV3 "../projects/dlh-healthy-fats/output-v3-new.mp4" --overwrite
```

---

## אם הרנדר עבר - גם רנדר FiberJapanV4 (שיפשר גם אותו)

```bash
npx remotion render FiberJapanV4 "../projects/dlh-fiber-japan/output-v4-new.mp4" --overwrite
```

---

## אם יש שגיאה TypeScript

הסיבה הנפוצה: הסוגריים של ה-spring לא מסתגרים נכון.
בדוק שהבלוק של `enterP` נראה כך בדיוק:
```ts
const enterP = isFiller
    ? Math.min(1, sinceStart / 3)
    : spring({ frame: sinceStart, fps, config: fastMode
        ? { damping: 16, stiffness: 650, mass: 0.25 }
        : { damping: 9,  stiffness: 120, mass: 0.45 }
      });
```

---

## רקע (לא חובה לקרוא)
- `KINETIC-CONTEXT.md` = תיעוד מלא של הפרויקט
- המשתמש רוצה שמילות מפתח יפוצצו את המסך, מילות שירות יהיו כמעט בלתי נראות
- הבעיה: כרגע זה נראה ככתוביות מאובזרות, לא קינטיק אמיתי
- אחרי שידרוג זה - נעבוד על מוזיקה חדשה (לא lo-fi flat)
