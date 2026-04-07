# Reference Data — Kinetic Video

Full examples, templates, failure history. Read when you need specifics.

---

## 1. FiberGasV7 — Current Gold Standard

**Topic:** how-to-increase-fiber-intake-without-gas
**Voice:** Charlie 1.1x | **Music:** Trap energetic | **Duration:** ~39s
**Output:** `projects/dlh-fiber-gas/output-v7.mp4`

**Script (script-v3-clean.txt):**
```
You added fiber to your diet.
That's the reason.
Your gut just started working twice as hard.
...
DEAD GUTS DON'T BLOAT.
...
The bacteria weren't ready for it.
Hit them slowly.
Don't blame the broccoli.
Don't blame the oatmeal.
That apple in your fridge — give it a shot.
FOUR WEEKS.
Then decide.
...
Recipes at dailylifehacks.com.
Free. Every week.
```

**Composition (FiberGasV7.tsx):**
```tsx
import transcript from '../../projects/dlh-fiber-gas/transcript-v3_transcript.json';

const OUTRO_START = 33.0;
const OUTRO_FADE  = 0.5;

<KineticShortComposition
  wordTimings={transcript.words}
  speechFile="dlh-fiber-gas/speech-v3.mp3"
  musicFile="dlh-fiber-gas/music-v3.mp3"
  musicVolume={0.18}
  imageCues={[{ time: 0, src: 'dlh-fiber-gas/images/bg-main.jpg' }]}
  overlayOpacity={0.30}
  colorSchemeStart={0}
/>
```

**Background image prompt:**
> "Colorful spread of high-fiber foods — broccoli, oats, apples, black beans, chia seeds, artichokes — arranged on a dark slate surface. Close-up food photography, moody warm lighting, rich textures, no text, no labels."

**Why it works:**
- Single image → no distracting transitions, attention stays on text
- CAPS on "DEAD GUTS DON'T BLOAT" → hero orange 280px → visual punch at the WTF moment
- Charlie 1.1x + trap → rhythmic, punchy, matches the script's pacing
- Ken Burns 8%-22% + drift → 37s of movement from one still image

---

## 2. FiberJapanV4 — List-Based Script Reference

**Topic:** high-fiber-japanese-food-sashimi
**Voice:** Charlie 1.1x | **Music:** Trap energetic | **Duration:** ~37s
**Output:** `projects/dlh-fiber-japan/output-v4.mp4`

Use this when the script names specific items (foods, comparisons) that benefit from changing visuals.

**Script:**
```
Japan.
Longest lives on the planet.
...
Their secret?
Not a pill. Not a diet plan.
Three foods.
...
Edamame.
Eight grams of fiber. One cup.
Natto.
Fermented soy. Probiotic hit.
Burdock root.
Six grams. One serving.
...
Most people eat sashimi and call it healthy.
Great protein.
Zero fiber.
...
Swap one thing.
Every single day.
Small move. Real shift.
...
Recipes at www.daily-life-hacks.com
Free. Every week.
```

**Composition:**
```tsx
imageCues={[
  { time: 0,    src: 'dlh-fiber-japan/images/img4.jpg' },  // Japanese spread
  { time: 8.6,  src: 'dlh-fiber-japan/images/img1.jpg' },  // Edamame
  { time: 12.5, src: 'dlh-fiber-japan/images/img2.jpg' },  // Natto
  { time: 16.5, src: 'dlh-fiber-japan/images/img3.jpg' },  // Burdock root
  { time: 20.1, src: 'dlh-fiber-japan/images/img4.jpg' },  // sashimi contrast
]}
overlayOpacity={0.30}
musicVolume={0.18}
// OUTRO_START = 31.0
```

**Rule for multiple images:**
- No image on screen more than ~8 seconds
- Each image change timed to the word it illustrates
- Cross-fade (0.5s) is built into KineticShortComposition automatically

---

## 3. CabbageV4 — Second Gold Standard

**Topic:** high-fiber-cabbage-recipes-the-2026-superfood-trend
**Voice:** Voice-Q (`q0IMILNRPxOgtBTS4taI`) 0.95x | **Music:** Guitar Upbeat | **Duration:** ~57s
**Output:** `projects/dlh-cabbage/output-v4.mp4`

**What made it work:**
- Voice selected from 5 candidates — user picked `q0IMILNRPxOgtBTS4taI` as "מושלם"
- Music: ElevenLabs simple prompt `"Upbeat YouTube Intro Music with Electric Guitar"` — user called it "נהדר"
- Background: 3 variants generated, user chose dark moody close-up (bg-v1.jpg)
- KEYWORDS expanded: cabbage, kombucha, fiber, caramelizes, vegetable, probiotic, gut, sauerkraut → all hero orange
- Long word overflow fixed: heroStartScaleX capped + hero minSize=80

**Composition:**
```tsx
<KineticShortComposition
  wordTimings={transcript.words}
  speechFile="dlh-cabbage/speech-v1.mp3"
  musicFile="dlh-cabbage/music-v1.mp3"
  musicVolume={0.18}
  imageCues={[{ time: 0, src: 'dlh-cabbage/images/bg-v1.jpg' }]}
  overlayOpacity={0.30}
  colorSchemeStart={0}
/>
// OUTRO_START = 50.26  (timestamp of "Recipes" word)
```

**Background image prompt used:**
> "Professionally plated roasted cabbage wedge with charred edges on a dark slate surface, garnished with fresh herbs and olive oil drizzle, moody warm lighting, close-up food photography, rich textures, no text, no labels."

**Script (script-v1-clean.txt):**
```
You walk past the same vegetable every week at the grocery store.
...
It's $1.50 a head. And it's doing what a $40 probiotic can't.
THE GUT FOOD YOU'VE BEEN IGNORING COSTS A DOLLAR FIFTY.
Cabbage is packed with insoluble fiber. The kind that moves things
through your gut and feeds your bacteria.
One cup cooked. That's 4 grams of fiber, barely any calories,
and almost zero prep time.
Roast it with olive oil and it caramelizes, gets almost sweet.
Or ferment it into sauerkraut. Now you've got fiber AND live
bacteria in one bite.
If you're spending $12 on kombucha, the cheapest thing in
produce might be doing the same job.
Three recipes. One ingredient. All under 20 minutes.
Recipes at dailylifehacks.com.
Free. Every week.
```

---

## 4. Single Image vs. Multiple Images (unchanged)

| Situation | Use |
|-----------|-----|
| Script is conceptual (principle, myth, comparison) | Single image |
| Script names specific items (3 foods, 5 snacks) | Multiple images, one per item |
| Script has one segment > 8s on same subject | Add a second image to break it up |

Single image is simpler and usually better. Multiple images only when the content clearly calls for it.

---

## 4. Music JSON Templates

**Trap Energetic (Charlie scripts):**
```json
{
  "duration_ms": 55000,
  "instrumental": true,
  "positive_global_styles": ["trap", "modern hip-hop", "rhythmic", "punchy", "bass-forward", "energetic"],
  "negative_global_styles": ["slow", "ambient", "acoustic", "jazz", "lo-fi", "cinematic", "mellow"],
  "sections": [
    { "section_name": "Hard Drop", "duration_ms": 8000,
      "positive_local_styles": ["hard drop", "trap drums", "bold", "punchy bass", "immediate energy"],
      "negative_local_styles": ["soft", "gentle", "build-up"], "lines": [] },
    { "section_name": "Rhythm Drive", "duration_ms": 30000,
      "positive_local_styles": ["driving trap beat", "syncopated rhythm", "forward energy", "crisp hi-hats"],
      "negative_local_styles": ["chaotic", "boring", "slow"], "lines": [] },
    { "section_name": "Exit", "duration_ms": 17000,
      "positive_local_styles": ["clean fade", "decisive", "rhythm resolution"],
      "negative_local_styles": ["lingering", "abrupt"], "lines": [] }
  ]
}
```

**Acoustic Warm (Roger scripts):**
```json
{
  "duration_ms": 50000,
  "instrumental": true,
  "positive_global_styles": ["acoustic", "warm", "intimate", "understated", "natural", "organic"],
  "negative_global_styles": ["lo-fi", "electronic", "trap", "phonk", "heavy", "dramatic", "cinematic"],
  "sections": [
    { "section_name": "Opener", "duration_ms": 8000,
      "positive_local_styles": ["sparse acoustic guitar", "minimal", "single note picking"],
      "negative_local_styles": ["loud", "busy"], "lines": [] },
    { "section_name": "Groove", "duration_ms": 30000,
      "positive_local_styles": ["warm acoustic", "soft fingerpicking", "subtle percussion"],
      "negative_local_styles": ["electronic", "synth"], "lines": [] },
    { "section_name": "Outro", "duration_ms": 12000,
      "positive_local_styles": ["gentle fade", "minimal"],
      "negative_local_styles": ["abrupt"], "lines": [] }
  ]
}
```

**Music Preview Workflow:**
Generate 3 × 20s clips with different style descriptors. User picks one. Then generate full version of winner using the approved JSON.

---

## 5. Failure History

Every entry here is a real mistake that was made.

| Mistake | Result | Rule |
|---------|--------|------|
| Acoustic music with punchy Charlie script | "מוזיקה שלא הייתי רוצה בלווייה שלי" | Match voice type to music type |
| Lo-fi chill music | "מוזיקת מעליות" — flat, no character | No lo-fi. Ever. |
| musicVolume 0.18 with acoustic | Music fights the voice | Acoustic max 0.13 |
| overlayOpacity 0.70 | Images completely black | Always 0.28–0.35 |
| FILLER list with 50+ words | 90% of text appears as tiny subtitles | FILLER = 17 words only |
| CAPS bonus +20 | CAPS words don't reach hero threshold (85) | CAPS bonus must be +52 |
| URL in script: "daily-life-hacks.com" | TTS reads "daily dash life dash hacks" | Script: "dailylifehacks.com" |
| Generic stock images (explosion, random veg) | Off-brand, boring, irrelevant | Custom 9:16 from pin alt_text |
| Petri dish image for "bacteria" | Visually unclear | Use classic optical microscope |
| Single image on screen 13+ seconds | Static, loses attention | Break up with second image or go single |
| Single-word lines in script | Flat TTS, disconnected | Full sentences always |
| "turbo mode", "you'll thank me" | Hype, not David Miller | Zero promises, zero exclamation energy |
| Relative paths in Node/Python | Working directory wrong, crash | Absolute paths always |
| ElevenLabs music JSON composition mode | Flat, boring, "elevator music" — all 3 previews rejected | Use simple `-p "..."` prompt mode only |
| "WUTANG STYLE HIPHOP YOUTUBE INTRO" as prompt | ElevenLabs ToS block (400 error) | Use: "gritty raw hip-hop intro, hard-hitting beats, underground vibe, classic 90s East Coast rap" |
| Long hero word (CARAMELIZES, SAUERKRAUT) with heroScaleX=1.6 | Word overflows frame during squash-stretch entry | heroStartScaleX = min(1.6, frameWidth*0.90/heroSteadyWidth) |
| hero minSize=130 for long words | Font too large → overflow | hero minSize=80 allows smaller safe font |
| Using one background image without showing options | User satisfaction lower | Generate 3 variants, let user choose |
| Skipping voice selection step | Wrong voice for the music style | Always generate 5 short voice samples, let user pick before full production |
| Cascade/stack display for ALL words (V2) | "הגרסא השניה פשוט דפוקה לחלוטין" — user hated it | Single word at a time (V1 approach). Stack effect for ALL words = chaos |

---

## 6. Project Status

| Project | Topic slug | Best version | Voice | Music |
|---------|-----------|--------------|-------|-------|
| dlh-fiber-japan | high-fiber-japanese-food-sashimi | V4 ✅ | Charlie 1.1x | Trap |
| dlh-fiber-gas | how-to-increase-fiber-intake-without-gas | V7 ✅ | Charlie 1.1x | Trap |
| dlh-healthy-fats | — | V4 (pending review) | Roger 0.95x | Acoustic |
| dlh-cabbage | high-fiber-cabbage-recipes-the-2026-superfood-trend | V4 ✅ | Voice-Q 0.95x | Guitar Upbeat |

---

## 7. Topics Source

Full list of 82 topics: `pipeline-data/pins.json`
Pick `status: "draft"`. Mark `"video_done"` when MP4 is final.
Image prompt: `alt_text` from the same pin entry, adapted for clean food photography.
