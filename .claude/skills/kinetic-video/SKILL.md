---
name: kinetic-video
description: Create kinetic typography short videos for daily-life-hacks.com YouTube Shorts, TikTok, Reels. Use when the user mentions video, shorts, kinetic, TikTok, YouTube Shorts, Reels, script, or in Hebrew קינטיק, סרטון, שורטס.
---

# Kinetic Video Skill — Daily Life Hacks

Target output: **FiberGasV7 quality**. Every decision below was learned the hard way.

---

## !! MANDATORY RULE !!

```
NEVER start producing without explicit written approval.

STEP 1 — Propose (nothing gets created yet):
  a. Read pins.json → pick a draft topic → read its alt_text
  b. Read SKILL-SCRIPT.md → write a full script
  c. Generate 3 × 20s music previews (different styles) → present to user
  d. Ask: "האם אתה מאשר את הנושא, התסריט, והמוזיקה? אפשר לשנות לפני שנתחיל."

STEP 2 — Wait for EXPLICIT approval: "כן" / "אשר" / "קדימה" / "go"
  If the user changes the script: revise and ask again.
  If the user picks a music style: generate the full track in Step 4.

STEP 3 — After approval: execute all production steps autonomously to MP4.
  No questions in the middle. Make decisions, report results.

VIOLATION = creating any audio/image/video before step 2 approval.
```

---

## 1. The Proven Recipe (FiberGasV7)

These settings are the result of many iterations. Use them exactly.

### Script
- Write through-line first (see SKILL-SCRIPT.md)
- Every sentence connects to next via BUT or THEREFORE — no "and then"
- **CAPS** on the WTF moment → becomes hero orange 280px in the video
- Full sentences always — never single-word lines
- Contractions always: it's / don't / can't / they're
- **URL in script:** write `dailylifehacks.com` (no dashes — TTS reads dashes as separate words)
- **URL in outro card:** `www.daily-life-hacks.com` (with dashes — displayed visually, not read)

### Voice
| Script type | Voice | Voice ID | Settings |
|------------|-------|----------|---------|
| Punchy / rhythmic (trap music) | Charlie | `IKne3meq5aSn9XLyUdCD` | `--speed 1.1 --stability 0.30 --similarity 0.78 --style 0.45` |
| Dry / narrative (acoustic music) | Roger | `CwhRBWXzGAHq8TQ4Fs17` | `--speed 0.95 --stability 0.40 --similarity 0.78 --style 0.25` |
| Warm / energetic (guitar/upbeat) | Voice-Q | `q0IMILNRPxOgtBTS4taI` | `--speed 0.95 --stability 0.40 --similarity 0.78 --style 0.25` |

Charlie = punchy, rhythmic, works with trap. Roger = dry, grounded, works with acoustic.
Voice-Q = warm, clear, works with upbeat guitar — validated on CabbageV4.
Match voice to music — mismatch sounds wrong.

**Voice selection workflow (mandatory before production):**
Generate 5 short voice samples (3-sentence excerpt from script) with different voice IDs.
Use `--speed 0.95 --stability 0.40 --similarity 0.78 --style 0.25` for all samples.
Let user listen and pick. Only then generate full speech.

### Music
Preview workflow is mandatory (see mandatory rule step 1c).
After user picks style → generate full track.

| Style | Use when | musicVolume | Generator mode |
|-------|----------|-------------|---------------|
| Trap energetic | Punchy script, short sentences, rhythm-heavy | `0.18` | simple prompt |
| Acoustic warm | Narrative script, longer sentences, storytelling | `0.13` | simple prompt |
| Upbeat guitar | Energetic food/lifestyle content, upbeat tone | `0.18` | simple prompt |

**IMPORTANT — ElevenLabs music mode:**
Use **simple prompt mode** (`-p "..."`) NOT the JSON composition files.
Simple prompts produce much better, more musical results.
JSON composition mode produces flat, generic output ("מוזיקת מעליות").

**Proven prompts (use these first):**
- `"Upbeat YouTube Intro Music with Electric Guitar"` → great energy, validated on CabbageV4
- Note: "WUTANG STYLE HIPHOP" is blocked by ElevenLabs ToS — use `"A gritty and raw hip-hop intro with hard-hitting beats, underground vibe, classic 90s East Coast rap"` instead

**3 preview workflow:**
Generate 3 × 20s previews using simple prompt mode with 3 different style strings.
Let user pick, then generate full track at 65s with winning prompt.

Full JSON templates (fallback only): see SKILL-REFERENCE.md.

### Background Image
- **One** custom 9:16 image for the entire video
- Ken Burns (8%–22% zoom + ±2.5% horizontal drift) keeps it alive for 37s
- Source: read `alt_text` from the pin in pins.json → adapt to food photography prompt
- Formula: `"{alt_text content}, dark slate surface, moody warm lighting, close-up food photography, no text, no labels."`
- Generate with `nano-banana-pro-preview`, aspect ratio `9:16`, temperature `2.0`
- Save as: `remotion-project/public/{name}/images/bg-main.jpg`

### Composition Settings
```tsx
imageCues={[{ time: 0, src: '{name}/images/bg-main.jpg' }]}
overlayOpacity={0.30}      // NEVER above 0.35 — above 0.50 images go black
musicVolume={0.13 or 0.18} // depends on music style (see above)
colorSchemeStart={0}
```

### Outro (identical in every video)
```tsx
const OUTRO_START = XX.X;  // timestamp of "Recipes" word in transcript
const OUTRO_FADE  = 0.5;
// White background fades in over 0.5s
// Logo: logo.png, width 520px
// URL: www.daily-life-hacks.com — color #F29B30, 72px, fontWeight 800
// Tagline: Free recipes. Every week. — color #444444, 46px, fontWeight 500
```

### KineticShortComposition.tsx — Core Settings
These settings are hard-won. Do not change without testing a full render:
```
baseSizes:      hero 280 | strong 230 | normal 185 | subtle 85
FILLER (17):    the, a, an, of, to, at, in, on, for, and, but, or, is, are, was, it
CAPS bonus:     +52 (pushes to hero threshold 85)
hero min show:  0.4s (prevents flicker on fast-spoken hero words)
Ken Burns:      [1.08, 1.22] zoom + ±2.5% translateX drift
Cross-fade:     0.5s dissolve between image cues
```

### KineticShortComposition.tsx — KEYWORDS (expand per topic)
KEYWORDS list controls which words appear as hero (orange, big, centered CAPS).
For each new video, identify the 8-15 most important words in the script and add them.
Words in KEYWORDS score +48 → total ≥ 86 → hero treatment.

**Currently in KEYWORDS (validated, keep these):**
```
food/gut/health: cabbage, kombucha, fiber, caramelizes, vegetable, probiotic,
                 gut, sauerkraut, bacteria, edamame, natto, burdock, protein,
                 probiotics, inflammation
general:         wrong, stop, real, nobody, worse, right, zero, none, free,
                 weekly, eight, five, six, grams, done, centuries
```

**Per-video additions:** read the script, identify key nouns/verbs → add to KEYWORDS at the top of KineticShortComposition.tsx before production.

### KineticShortComposition.tsx — Long Hero Word Fix (permanent)
For words like CARAMELIZES, SAUERKRAUT, VEGETABLE, PROBIOTIC — long words
that become hero (orange, CAPS) can overflow the frame during squash-stretch entry.

Two fixes already in the file (do not revert):
1. `minSize` for hero words = **80** (not 130) — allows smaller font for long hero words
2. `heroStartScaleX = Math.min(1.6, (frameWidth * 0.90) / heroSteadyWidth)` — caps the
   initial horizontal squash based on actual word width. Long words get less squash but
   still have the animation effect. Short words still get the full 1.6x squash.

---

## 2. Production Steps

**{name}** = slug from pins.json (e.g. `dlh-prebiotic-vs-probiotic`)
All paths are absolute. No exceptions.

---

**Step 1 — Write script**
Save to `projects/{name}/script-v1.txt`. Format:
```
[matter-of-fact] First line — strong hook.
[pause]
[emphatic] WTF MOMENT IN CAPS.
[matter-of-fact] Follow-through.
...
[warm] Recipes at dailylifehacks.com.
[matter-of-fact] Free. Every week.
```
Must pass BUT/THEREFORE test. See SKILL-SCRIPT.md.

**Step 2 — Clean script**
```bash
node -e "
const fs = require('fs');
const t = fs.readFileSync('C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/script-v1.txt','utf8')
  .replace(/\[pause\]/g, '... ')
  .replace(/\[.*?\]/g, '')
  .replace(/  +/g, ' ').trim();
fs.writeFileSync('C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/script-v1-clean.txt', t);
console.log(t);
"
```

**Step 3 — Generate speech**
```bash
cd C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/kinetic-bundle/speech-generator/scripts
npx ts-node generate_speech.ts \
  --file "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/script-v1-clean.txt" \
  --voice "{VOICE_ID}" \
  --speed {SPEED} --stability {STAB} --similarity 0.78 --style {STYLE} \
  --output "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/speech-v1.mp3"
```

**Step 4 — Generate music (approved style from preview)**
```bash
cd C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/kinetic-bundle/music-generator/scripts
npx ts-node generate_music.ts \
  -c "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/music-v1.json" \
  -o "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/music-v1.mp3"
```

**Step 5 — Transcribe (word timestamps)**
```bash
cd C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/kinetic-bundle/transcribe/scripts
npx ts-node transcribe.ts \
  -i "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/speech-v1.mp3" \
  -o "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/transcript-v1.srt" \
  --json
# Output: transcript-v1_transcript.json
```

**Step 6 — Generate 3 background image variants (user picks one)**
Read `alt_text` from pin in pins.json. Build 3 prompts with different angles:
- v1: Classic dark — `"{alt_text}, dark slate surface, moody warm lighting, close-up food photography, no text, no labels."`
- v2: Rustic/fermented — different ingredient angle, rustic dark wood, side lighting
- v3: Overhead flat-lay — top-down, vibrant colors, matte black plate

Generate all 3 in parallel (3 separate Python scripts, run with `& wait`).
Save as `remotion-project/public/{name}/images/bg-v1.jpg`, `bg-v2.jpg`, `bg-v3.jpg`.
Present to user, wait for pick. Use chosen image in composition.
This workflow was validated on CabbageV4 — user satisfaction significantly higher than single image.

Original single-image script (use as template for each variant):
```python
# save as /tmp/gen_bg.py and run: python /tmp/gen_bg.py
import requests, base64, json

API_KEY = open('C:/Users/offic/Desktop/dlh-fresh/.env').read()
API_KEY = [l.split('=',1)[1].strip() for l in API_KEY.splitlines() if l.startswith('GEMINI_API_KEY')][0]

prompt = "PROMPT_HERE"
url = f"https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview:generateContent?key={API_KEY}"
r = requests.post(url, json={
    "contents": [{"parts": [{"text": prompt}]}],
    "generationConfig": {"responseModalities": ["IMAGE","TEXT"], "temperature": 2.0, "imageConfig": {"aspectRatio": "9:16"}}
}, timeout=120)
img = r.json()["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
open("C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/remotion-project/public/{name}/images/bg-main.jpg","wb").write(base64.b64decode(img))
print("done")
```

**Step 7 — Find outro timestamp**
```bash
node -e "
const t = require('C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/transcript-v1_transcript.json');
t.words.filter(w => w.word.trim()).forEach(w => console.log(w.start.toFixed(2) + 's: ' + w.word));
"
# Find the timestamp of "Recipes" → that is OUTRO_START
```

**Step 8 — Copy assets to remotion/public**
```bash
mkdir -p "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/remotion-project/public/{name}/images"
mkdir -p "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/remotion-project/projects/{name}"
cp "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/speech-v1.mp3" \
   "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/remotion-project/public/{name}/"
cp "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/music-v1.mp3" \
   "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/remotion-project/public/{name}/"
cp "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/projects/{name}/transcript-v1_transcript.json" \
   "C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/remotion-project/projects/{name}/"
```

**Step 9 — Create composition**
Create `remotion-project/src/compositions/{VideoName}V1.tsx`.
Use `FiberGasV7.tsx` as exact template. Replace:
- `transcript` import path
- `speechFile`, `musicFile`
- `musicVolume` (0.13 or 0.18)
- `OUTRO_START`
- `src` in imageCues

Add to `Root.tsx`:
```tsx
<Composition id="{VideoName}V1" component={{VideoName}V1}
  durationInFrames={Math.round(speechDurationSeconds * 30) + 90}
  fps={30} width={1080} height={1920} />
```
speechDurationSeconds = last word end time from transcript + ~2s buffer.

**Step 10 — Render**
```bash
cd C:/Users/offic/Desktop/dlh-fresh/kinetic-video-bundle/remotion-project
npx remotion render {VideoName}V1 --output ../projects/{name}/output-v1.mp4
```

---

## 3. Iron Rules — Never Break

1. `overlayOpacity` **0.28–0.35** only
2. `musicVolume` trap **0.18** | acoustic **0.13**
3. Absolute paths in every Node/Python command
4. Never `remotion studio` — only `render`
5. Full sentences in script — no single-word lines
6. CAPS in script = WTF moment = hero orange in video. Use deliberately.
7. Script URL: `dailylifehacks.com` (no dashes). Outro card: `www.daily-life-hacks.com`
8. Fixed outro every video: logo + URL + "Free recipes. Every week."
9. Music preview before full production — always
10. Never modify KineticShortComposition.tsx settings without testing a full render

---

## 4. API Keys

| Tool | File | Variable |
|------|------|----------|
| ElevenLabs | `kinetic-bundle/speech-generator/scripts/.env` | `ELEVENLABS_API_KEY` |
| Google Imagen | `dlh-fresh/.env` | `GEMINI_API_KEY` |

---

## 5. Topics & Images

**Source:** `pipeline-data/pins.json` — pick `status: "draft"`, mark `"video_done"` when done.
**Image prompt:** read `alt_text` from the pin. Add: `, dark slate surface, moody warm lighting, close-up food photography, no text, no labels.`

---

## 6. Sub-files

- **SKILL-SCRIPT.md** — copywriting guide. Read before writing any script.
- **SKILL-REFERENCE.md** — full FiberGasV7 + FiberJapanV4 examples, music JSON templates, failure history.
