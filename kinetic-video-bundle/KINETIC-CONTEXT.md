# Kinetic Video Project — Full Context Document
# עדכון אחרון: מרץ 2026

---

## מה הפרויקט הזה ולמה הוא קיים

האתר daily-life-hacks.com מפרסם תוכן תזונה/מתכונים לקהל אמריקאי. אנחנו בונים סרטוני Short (9:16, 30-55 שניות) לTikTok/Reels/YouTube Shorts כדי להביא טראפיק אורגני. כל סרטון מבוסס על מאמר קיים באתר, מספר עובדה מעניינת או מפריך מיתוס, ומסתיים בCTA לאתר.

**הפורמט:** קריינות + אנימציית טקסט קינטיק + תמונות מתחלפות + מוזיקת רקע. ללא פנים, ללא עריכת וידאו ידנית, הכל מיוצר בקוד.

---

## Stack טכני מלא

```
kinetic-video-bundle/
├── remotion-project/          ← רנדור וידאו ב-React/Remotion 4.0.290
│   ├── src/compositions/      ← קומפוזיציות לכל וידאו
│   ├── projects/              ← transcript JSONs (word timings)
│   └── public/                ← קבצי audio + תמונות
├── projects/                  ← output לכל project (MP4, MP3, scripts)
│   ├── dlh-fiber-japan/
│   └── dlh-healthy-fats/
├── kinetic-bundle/            ← כלי יצירה
│   ├── speech-generator/scripts/  ← ElevenLabs TTS
│   ├── music-generator/scripts/   ← ElevenLabs Music
│   └── transcribe/scripts/        ← ElevenLabs Scribe (word-level timing)
├── generate-video-images.py   ← Google Imagen 4 Ultra (9:16)
├── KINETIC-CONTEXT.md         ← אתה כאן
└── .env                       ← API keys (ראה למטה)
```

**API Keys** (נמצאות ב `dlh-fresh/.env`):
- `GEMINI_API_KEY` — Google Imagen 4 Ultra
- ElevenLabs key — נמצא ב `kinetic-bundle/speech-generator/scripts/.env` ו`music-generator` ו`transcribe`

**פקודת רנדור:**
```bash
cd kinetic-video-bundle/remotion-project
npx remotion render {CompositionId} "../projects/{name}/output-v{N}.mp4" --overwrite
```
**לא** מריצים Studio. **לא** מבקשים מהמשתמש לחבר כלום. רק render.

---

## סגנון David Miller — חוק ברזל

כל script חייב להישמע כמו David Miller, הקול של האתר:

**מה זה אומר בפועל:**
- **ציני קלות, אף פעם לא אכזרי** — "We bought low-fat everything. It tasted fine. We got worse." לא "OMG fat is TERRIBLE!"
- **anti-hype, anti-drama** — אין "AMAZING", "SHOCKING", "YOU WON'T BELIEVE"
- **practical ו-direct** — עובדות ישירות, בלי fluff
- **dry humor** — הקסם בא מ-understatement, לא מהתלהבות
- **contractions תמיד** — it's, don't, can't, won't, they're

**דוגמה טובה:**
> "Fat was the villain for thirty years. We bought low-fat everything.
> They added sugar to make up for it. We got worse.
> Turns out the type of fat matters.
> Avocado. Half on toast keeps you full till noon.
> Nothing here is complicated. It's just fat that doesn't work against you."

**דוגמה גרועה (מה שנכשל):**
> "FAT. VILLAIN. THIRTY YEARS. WRONG. AVOCADO. DAILY."
(זה Charlie בspeed 1.3 + phonk. נשמע כמו מקדחה.)

---

## קולות ElevenLabs

| קול | Voice ID | סגנון | מתי להשתמש |
|-----|---------|-------|------------|
| **Roger** | `CwhRBWXzGAHq8TQ4Fs17` | יבש, ציני, natural | **ברירת מחדל — הכי קרוב ל-David Miller** |
| George | `JBFqnCBsd6RMkjVDRZzb` | נרטיבי, סיפורי, warm | כשהסרטון מספר סיפור עם arc |
| Charlie | `IKne3meq5aSn9XLyUdCD` | אנרגטי, punchy | **להימנע** — יוצא flat כשהמוזיקה לא מתאימה |

**הגדרות מומלצות לRoger:**
```
--speed 0.95 --stability 0.40 --similarity 0.78 --style 0.25
```
`style 0.25` נותן וריאציה טבעית בטון — עולה ויורדת כמו שיחה אנושית.

---

## מוזיקה — מה עובד ומה לא

**המסקנה הקריטית:** המוזיקה צריכה לשבת מתחת לקול, לא להתחרות בו.

| סגנון | תוצאה | סטטוס |
|-------|-------|-------|
| Lo-fi chill | elevator music, שטוח, לא מייצג את האתר | ❌ נכשל |
| Trap driving beat | קריינות vs מוזיקה — אין קשר ביניהם | ❌ נכשל |
| Phonk | נשמע כמו מקדחה על פטישון | ❌ נכשל |
| **Acoustic warm** | בדיקה ממתינה — music-v4.mp3 מוכן, V4 לא רונדר | ⏳ הבא |

**הגדרת מוזיקה acoustic (הצלחה פוטנציאלית):**
```json
{
  "positive_global_styles": ["acoustic", "warm", "intimate", "understated", "natural"],
  "negative_global_styles": ["lo-fi", "electronic", "trap", "heavy", "dramatic"],
  "sections": [
    { "section_name": "Opener", "positive_local_styles": ["sparse acoustic guitar", "minimal", "single note picking"] },
    { "section_name": "Groove", "positive_local_styles": ["warm acoustic", "soft fingerpicking", "subtle percussion"] }
  ]
}
```

**Volume המוזיקה:** תמיד `musicVolume: 0.12-0.15`. מעל זה מתחרה בקריינות.

---

## KineticShortComposition — מצב נוכחי

**קובץ:** `remotion-project/src/compositions/KineticShortComposition.tsx`

### מה כבר מיושם (גרסה עדכנית)

**Spring physics עם overshoot:**
```ts
{ damping: 9, stiffness: 120, mass: 0.45 }
// overshoot ~10-15% — מילה עוברת קצת את הגודל ואז קופצת חזרה
// זה מה שמפריד בין כתוביות לקינטיק אמיתי
```

**היררכיית גדלים קיצונית:**
```ts
baseSizes = { hero: 260, strong: 160, normal: 105, subtle: 38 }
// יחס פי 7 בין hero לsubtile
// filler words (the, of, and) = 38px, opacity 35% — כמעט בלתי נראות
// מילות מפתח = 260px — ממלאות רוב המסך
```

**Filler words — instant appear (ללא spring):**
```ts
const enterP = emphasis === 'subtle'
    ? interpolate(sinceStart, [0, 3], [0, 1], ...)  // 3 frames, linear
    : spring({ frame: sinceStart, fps, config: springConfig });
```

**Squash-and-stretch על hero words:**
```ts
// scaleY נכנס מהיר (0.15 → 1 עם overshoot)
// scaleX מפגר 4 פריימים (1.6 → 1) — נותן תחושת "נחיתה פיזית"
const xSpring = spring({ frame: Math.max(0, sinceStart - 4), fps, config });
const heroScaleY = interpolate(enterP, [0, 1], [0.15, 1]);
const heroScaleX = interpolate(xSpring, [0, 1], [1.6, 1]);
```

**Highlight block כתום מאחורי hero words:**
```tsx
// div כתום (#F29B30) עם opacity 0.18, border-radius 8px
// מופיע ב-spring יחד עם המילה, נעלם עם יציאתה
```

**Semantic motion — תנועה לפי משמעות:**
```ts
// מילות שלילה (wrong, no, stop, zero) → zoomCrash (SLAM)
// מילות גילוי (turns out, actually, here's) → slideLeft
// מספרים (eight, five, grams, percent) → scaleUp
// CTA words (recipes, free, weekly) → driftUp (gentle float)
```

### מה עדיין בעייתי (לא תוקן)
1. **Importance scoring** — הרבה מילות תוכן מקבלות 'normal' במקום 'strong' כי הן לא ב-KEYWORDS. צריך להרחיב את הרשימה לכל נושא חדש.
2. **מוזיקה** — עדיין לא מצאנו את הסגנון הנכון. acoustic (V4) ממתין לרנדור.
3. **Ken Burns** — zoom כרגע רק 4%-12%. אפשר להעלות ל-8%-18% לדינמיות.

---

## מבנה Composition — תבנית סטנדרטית

כל composition בנויה כך:

```tsx
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticShortComposition } from './KineticShortComposition';
import transcript from '../../projects/{name}/transcript-v1_transcript.json';

const OUTRO_START = 37.0;  // השניה שבה מתחיל "Recipes at www..."
const OUTRO_FADE  = 0.5;   // חצי שניה fade

export const MyVideoV1: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame    = useCurrentFrame();
  const t        = frame / fps;

  const outroOpacity = interpolate(t, [OUTRO_START, OUTRO_START + OUTRO_FADE], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <KineticShortComposition
        wordTimings={transcript.words}
        speechFile="{name}/speech-v1.mp3"
        musicFile="{name}/music-v1.mp3"
        musicVolume={0.13}                     // תמיד 0.12-0.15
        imageCues={[
          { time: 0,    src: '{name}/images/img0.jpg' }, // ← תמונת HOOK - מתאימה לטקסט הראשון
          { time: 10,   src: '{name}/images/img1.jpg' }, // ← מחליפה כשמגיעים לנושא
          // ...
        ]}
        overlayOpacity={0.30}                  // תמיד 0.28-0.35 — מעל 0.5 = תמונות שחורות
        colorSchemeStart={0}
      />
      {outroOpacity > 0 && (
        <AbsoluteFill style={{
          backgroundColor: `rgba(255,255,255,${outroOpacity})`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 48,
        }}>
          <Img src={staticFile('logo.png')} style={{ width: 520, opacity: outroOpacity }} />
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 72, fontWeight: 800,
            color: '#F29B30', textAlign: 'center', opacity: outroOpacity }}>
            www.daily-life-hacks.com
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 46, fontWeight: 500,
            color: '#444', textAlign: 'center', opacity: outroOpacity }}>
            Free recipes. Every week.
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
```

**Root.tsx** — כל composition חייבת להירשם כאן:
```tsx
<Composition id="MyVideoV1" component={MyVideoV1}
  durationInFrames={speechDurationSeconds * 30 + 90}  // +90 = 3s buffer
  fps={30} width={1080} height={1920} />
```

---

## עקרון Image Cues — הכלל הכי חשוב

**כל תמונה חייבת לספר את אותה סיפור כמו הטקסט באותו רגע.**

- **תמונה ראשונה (HOOK)** = חייבת להתאים לשניות הראשונות של הסרטון, גם אם הן שליליות.
  - ❌ "Fat was the villain for 30 years" + תמונת אבוקדו יפה = ניגוד קוגניטיבי
  - ✅ "Fat was the villain for 30 years" + מדף low-fat מדכא = מסר אחיד

- **מעבר תמונה** = בדיוק כשאומרים את המילה, לא לפני.
  - ✅ "Avocado" נאמר ב-13.7s → `{ time: 13.7, src: 'img1.jpg' }`

- **תמונת HOOK שלילית** = לייצר img0 (פרט לnegative hero) ולהשתמש בה מ-0s.

---

## Workflow לסרטון חדש (8 שלבים)

### שלב 1: כתיבת script בסגנון David Miller
- משפטים שלמים, לא רשימת מילים
- ציניות קלה, dry humor
- `[pause]` → יהפוך ל-`...` לפני TTS
- `[matter-of-fact]`, `[slowly]`, `[building]` → יימחקו לפני TTS
- שמור ב: `projects/{name}/script-v1.txt`

### שלב 2: Clean script
```bash
node -e "
const fs = require('fs');
const text = fs.readFileSync('C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/script-v1.txt','utf8')
  .replace(/\[pause\]/g, '... ')
  .replace(/\[.*?\]/g, '')
  .replace(/  +/g, ' ').trim();
fs.writeFileSync('C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/script-v1-clean.txt', text);
console.log(text);
"
```

### שלב 3: Speech (Roger voice)
```bash
cd kinetic-video-bundle/kinetic-bundle/speech-generator/scripts
npx ts-node generate_speech.ts \
  --file "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/script-v1-clean.txt" \
  --voice "CwhRBWXzGAHq8TQ4Fs17" \
  --speed 0.95 --stability 0.40 --similarity 0.78 --style 0.25 \
  --output "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/speech-v1.mp3"
```
**חשוב: תמיד absolute paths. relative paths נכשלות.**

### שלב 4: Music
```bash
cd kinetic-video-bundle/kinetic-bundle/music-generator/scripts
npx ts-node generate_music.ts \
  -c "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/music-v1.json" \
  -o "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/music-v1.mp3"
```
**סגנון מומלץ עכשיו:** acoustic warm (ראה music-v4.json כתבנית — ממתינה לאישור).

### שלב 5: Transcribe
```bash
cd kinetic-video-bundle/kinetic-bundle/transcribe/scripts
npx ts-node transcribe.ts \
  -i "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/speech-v1.mp3" \
  -o "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/transcript-v1.srt" \
  --json
# מייצר: transcript-v1_transcript.json עם word-level timestamps
```

### שלב 6: תמונות
הוסף לPROJECTS ב-`generate-video-images.py`:
```python
"{name}": {
    "images": [
        { "filename": "img0.jpg", "prompt": "... visual that matches HOOK text, NOT the positive answer yet ..." },
        { "filename": "img1.jpg", "prompt": "... first positive food/topic ..." },
        # ...
    ]
}
```
ואז:
```bash
cd kinetic-video-bundle
python generate-video-images.py {name}
```

### שלב 7: Word timings לimage cues
```bash
node -e "
const t = require('C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/transcript-v1_transcript.json');
t.words.filter(w=>w.word.trim()).forEach(w => console.log(w.start.toFixed(1)+'s: '+w.word));
"
```
מאתר מתי כל מילה נאמרת → בונה imageCues בהתאם.

### שלב 8: העתק קבצים לRemotip public
```bash
cp "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/speech-v1.mp3" \
   "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/remotion-project/public/{name}/"
cp "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/music-v1.mp3" \
   "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/remotion-project/public/{name}/"
cp "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/images/*.jpg" \
   "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/remotion-project/public/{name}/images/"
cp "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/transcript-v1_transcript.json" \
   "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/remotion-project/projects/{name}/"
```

### שלב 9: Composition + Root.tsx + Render
צור קובץ tsx, הוסף ל-Root.tsx, רנדר.

---

## מצב כל הפרויקטים הקיימים

### dlh-fiber-japan
| גרסה | קול | מוזיקה | אורך | סטטוס | הערות |
|------|-----|--------|------|-------|-------|
| V1 | Roger, lo-fi | 55s | ✅ רונדר | "The Skeptic" |
| V2 | Charlie, driving beat | 39s | ✅ רונדר | "Facts Drop" |
| V3 | George, cinematic | 55s | ✅ רונדר | "The Story" |
| V4 | Charlie 1.1x, trap | 37s | ✅ רונדר | "Rhythm Drop" + outro לבן |

**תמונות:** img1=edamame, img2=natto, img3=burdock, img4=Japanese spread
**ב-V1:** תמונה ראשונה = img4 (Japanese spread) = בסדר כי הטקסט מתחיל ישר בנושא
**ב-V4:** יש script עם "Picture this... Japanese restaurant" = img4 מהרגע הראשון ✅

### dlh-healthy-fats
| גרסה | קול | מוזיקה | אורך | סטטוס | הערות |
|------|-----|--------|------|-------|-------|
| V1 | Charlie 1.1x | trap | 40s | ✅ רונדר | ❌ קריינות flat, מוזיקה לא קשורה |
| V2 | Charlie 1.3x | phonk | 41s | ✅ רונדר | ❌ נכשל לחלוטין — "מקדחה על פטישון" |
| V3 | Roger 0.95x | lo-fi | 45s | ✅ רונדר | ✅ קול טוב ❌ "מוזיקת מעליות" |
| V4 | Roger 0.95x | acoustic | 45s | ⏳ **לא רונדר** | = V3 עם מוזיקה חדשה — זה הצעד הבא |

**תמונות (5 תמונות):**
- img0 = מדף סופרמרקט low-fat מדכא (HOOK - "Fat was villain")
- img1 = אבוקדו חתוך
- img2 = שמן זית נשפך
- img3 = קערת אגוזים מעורבים
- img4 = פילה סלמון

**speech-v3.mp3** = הקובץ הטוב ביותר שיש. V4 משתמש באותו קריינות.

---

## הצעד הבא — לרנדר HealthyFatsV4

V4 כבר מוכן לחלוטין. רק צריך לוודא שהקבצים הועתקו ולרנדר.

**בדיקה:**
```bash
ls "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/remotion-project/public/dlh-healthy-fats/"
# צריך להיות: speech-v3.mp3, music-v4.mp3, + תיקיית images
```

**אם music-v4.mp3 לא קיים שם:**
```bash
cp "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/dlh-healthy-fats/music-v4.mp3" \
   "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/remotion-project/public/dlh-healthy-fats/"
```

**רנדר:**
```bash
cd C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/remotion-project
npx remotion render HealthyFatsV4 "../projects/dlh-healthy-fats/output-v4.mp4" --overwrite
```

**מה בודקים בתוצאה:**
1. האם המוזיקה האקוסטית מרגישה חיה ולא flat?
2. האם הקריינות והמוזיקה "מדברים" יחד?
3. האם מילות מפתח (Avocado, Wrong, Fat) ממלאות מסך?
4. האם מילות שירות (the, of, to) כמעט בלתי נראות?
5. האם squash-and-stretch נראה על hero words?

---

## לאחר V4 — רשימת עבודה ממתינה

1. **KEYWORDS expansion** — הוסף מילות מפתח ספציפיות לכל topic לKineticShortComposition כדי שיקבלו hero emphasis. עכשיו רק מילות fiber/Japan מוכרות.

2. **Ken Burns intensity** — העלה zoom מ-4%-12% ל-8%-18% לדינמיות רבה יותר.

3. **סרטון חדש** — בחר נושא מאחד מ-43 המאמרים הקיימים, בנה פרויקט חדש מאפס.

4. **אם acoustic לא עובד** — לנסות "minimal jazz" (בס + אקורד, ללא sax מלא) או "podcast style ambient" (cinematic subtle).

---

## כללי ברזל — אל תפר אלה לעולם

1. **overlayOpacity תמיד 0.28-0.35** — מעל 0.50 התמונות נראות שחורות
2. **תמונה ראשונה = hook visual** — חייבת לתמוך בטקסט הראשוני, לא לחשוף את הפתרון
3. **musicVolume תמיד 0.12-0.15** — מעל זה מתחרה בקריינות
4. **absolute paths בפקודות Node/Python** — relative paths נכשלות בגלל תיקיית working directory
5. **אל תריץ remotion studio** — רק render, המשתמש לא מחבר כלום
6. **Roger = ברירת מחדל** לכל script David Miller style
7. **speech-v3 של healthy-fats** = הקריינות הטובה ביותר שנוצרה עד כה — שמור אותה

---

## מה נכשל ולמה — לא לחזור על זה

| מה | למה נכשל |
|---|---|
| Charlie + trap music | קריינות flat מול מוזיקה אנרגטית = ניגוד קוגניטיבי |
| Charlie speed 1.3 + phonk | נשמע כמו מקדחה — "גרוע מאוד" |
| Lo-fi flat | "מוזיקת מעליות" — אין character |
| overlayOpacity 0.70 | תמונות שחורות לחלוטין |
| תמונה ראשונה = positive food כשהטקסט שלילי | ניגוד ויזואלי/טקסטואלי |
| relative paths ב-Node scripts | working directory לא נכון |
| KEYWORDS list קצרה | מילות מפתח לא מקבלות hero treatment |

