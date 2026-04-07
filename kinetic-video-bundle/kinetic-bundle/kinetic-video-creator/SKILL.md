---
name: kinetic-video-creator
description: "Create professional kinetic typography videos for YouTube Shorts (9:16). Includes script writing, TTS, music generation, image generation, and animated text synced to speech. Use for: DLH social shorts, promo videos, educational content."
argument-hint: [topic] [style: skeptic/facts-drop/story]
enhancedBy:
  - speech-generator: "ElevenLabs TTS - multiple voices available"
  - transcribe: "Word-level timing (millisecond precision) for animation sync"
  - music-generator: "Background music with section-based emotional arc"
  - youtube-uploader: "Optional publishing to YouTube"
---

# Kinetic Video Creator

## Stack

- **Remotion** 4.0.290 — React-based video renderer
- **ElevenLabs** — TTS (speech) + Music + Scribe (transcription). Requires Starter plan or above.
- **Google AI Studio** — Image generation via Imagen 4 Ultra (`imagen-4.0-ultra-generate-001`)
- **Project root:** `kinetic-video-bundle/`
- **Remotion project:** `kinetic-video-bundle/remotion-project/`
- **Project data:** `kinetic-video-bundle/projects/{project-name}/`

---

## Workflow (8 steps)

1. **Script** — Write 1-3 variant scripts per topic
2. **Clean script** — Strip `[direction]` brackets before TTS (keep `[pause]` → `...`)
3. **Speech** — Generate TTS per script (different voice per style variant)
4. **Transcribe** — Get word-level JSON timing
5. **Music** — Generate per-style music composition JSON
6. **Images** — Generate 9:16 images with Imagen 4 Ultra
7. **Compose** — Create Remotion composition with `KineticShortComposition`
8. **Render** — `npx remotion render`

No ffmpeg needed. Remotion mixes speech + music internally using two `<Audio>` components.

---

## Step 1: Script

### Style variants (for the same topic)

| Style | Voice | Tone | Music |
|-------|-------|------|-------|
| "The Skeptic" | Roger (`CwhRBWXzGAHq8TQ4Fs17`) | Dry humor, David Miller voice | Lo-fi chill |
| "Facts Drop" | Charlie (`IKne3meq5aSn9XLyUdCD`) | Rapid-fire, punchy, no padding | Energetic driving beat |
| "The Story" | George (`JBFqnCBsd6RMkjVDRZzb`) | Narrative, opens with scenario | Cinematic, building |

### Script rules (David Miller voice)

- Contractions always: `it's`, `don't`, `can't`, `won't`
- Short punchy sentences mixed with longer ones
- No em dashes, no emojis, no fake urgency
- No AI phrases: Furthermore, Moreover, Unlock, Elevate, Mouthwatering...
- No sign-off endings: no "Enjoy!", "Give it a try!", "You won't regret it!"
- Hedge health claims: "may support", "could help", never "cures" or "prevents"

### Emotional direction brackets

Used for human readability only — stripped before TTS:

| Bracket | Keep/Strip |
|---------|-----------|
| `[pause]` | → Replace with `...` |
| `[emphatic]`, `[slowly]`, `[building]`, `[matter-of-fact]`, `[faster]`, `[warm]` | Strip |

### English script structure

```
[HOOK - 5-8 seconds]
[matter-of-fact] Opening statement that challenges assumption.
[pause] Short. Punchy.

[BUILD - 15-30 seconds]
[building] Reveal the real information.
[emphatic] Key fact with a number or surprising detail.

[PEAK - 10-20 seconds]
[emphatic] The main takeaway. One or two words that land.
[slowly] Let it breathe.

[CTA - 8-10 seconds]
[warm] Find the recipes at daily-life-hacks.com
[emphatic] Free. Weekly. No nonsense.
```

### Clean script before TTS

```bash
# Node one-liner: replace [pause] with "..." and strip all other brackets
node -e "
const fs = require('fs');
const text = fs.readFileSync('script-v1.txt','utf8')
  .replace(/\[pause\]/g, '... ')
  .replace(/\[.*?\]/g, '')
  .replace(/  +/g, ' ')
  .trim();
fs.writeFileSync('script-v1-clean.txt', text);
"
```

---

## Step 2: Generate Speech

```bash
cd kinetic-video-bundle/kinetic-bundle/speech-generator/scripts

npx ts-node generate_speech.ts \
  -f "../../projects/{project}/script-v1-clean.txt" \
  -v "CwhRBWXzGAHq8TQ4Fs17" \
  -o "../../projects/{project}/speech-v1.mp3" \
  --stability 0.55 --similarity 0.78 --style 0.15 --speed 0.92
```

### Voice settings per style

| Style | stability | similarity | style | speed |
|-------|-----------|-----------|-------|-------|
| Skeptic (Roger) | 0.55 | 0.78 | 0.15 | 0.92 |
| Facts Drop (Charlie) | 0.45 | 0.80 | 0.25 | 1.05 |
| Story (George) | 0.60 | 0.82 | 0.12 | 0.88 |

### List available voices

```bash
npx ts-node generate_speech.ts --list-voices
```

---

## Step 3: Transcribe

```bash
cd kinetic-video-bundle/kinetic-bundle/transcribe/scripts

npx ts-node transcribe.ts \
  -i "../../projects/{project}/speech-v1.mp3" \
  -o "../../projects/{project}/transcript-v1.srt" \
  --json
```

Output: `transcript-v1_transcript.json` with word-level timing (millisecond precision).

**Important:** The transcript includes space entries (`" "`). Filter them out in the composition:
```tsx
const words = wordTimings.filter(w => w.word.trim().length > 0);
```

---

## Step 4: Generate Music

```bash
cd kinetic-video-bundle/kinetic-bundle/music-generator/scripts

npx ts-node generate_music.ts \
  -c "../../projects/{project}/music-v1.json" \
  -o "../../projects/{project}/music-v1.mp3"
```

### Music composition template

```json
{
  "duration_ms": 60000,
  "instrumental": true,
  "positive_global_styles": ["lo-fi", "chill", "laid-back"],
  "negative_global_styles": ["aggressive", "chaotic", "epic"],
  "sections": [
    { "section_name": "Hook", "duration_ms": 10000, "positive_local_styles": ["sparse", "minimal"], "negative_local_styles": ["loud"], "lines": [] },
    { "section_name": "Build", "duration_ms": 30000, "positive_local_styles": ["warm", "groove"], "negative_local_styles": ["heavy"], "lines": [] },
    { "section_name": "Resolve", "duration_ms": 15000, "positive_local_styles": ["chill"], "negative_local_styles": ["dramatic"], "lines": [] },
    { "section_name": "CTA", "duration_ms": 5000, "positive_local_styles": ["warm fade"], "negative_local_styles": ["abrupt"], "lines": [] }
  ]
}
```

Duration rules: 15s–330s. Match total to speech duration + 5-10s buffer.

---

## Step 5: Generate Images

Images must be 9:16 (1080×1920) for Shorts.

```bash
cd kinetic-video-bundle

python generate-video-images.py {project-name}
```

Edit `generate-video-images.py` to add your project in the `PROJECTS` dict:

```python
"my-project": {
    "images": [
        { "filename": "img1.jpg", "prompt": "..." },
        { "filename": "img2.jpg", "prompt": "..." },
    ]
}
```

### Image prompt rules

- Specify **9:16 vertical composition** in the prompt
- End every prompt with "no text" (Imagen adds text otherwise)
- Style: dark, moody, cinematic food photography for DLH
- 3-4 images per project (one per major topic segment)

Copy generated images to Remotion public folder:
```bash
cp projects/{project}/images/*.jpg remotion-project/public/{project}/images/
```

---

## Step 6: Compose in Remotion

### Active template: `KineticShortComposition`

Location: `remotion-project/src/compositions/KineticShortComposition.tsx`

```tsx
import { KineticShortComposition } from './KineticShortComposition';
import transcript from '../../projects/{project}/transcript-v1_transcript.json';

export const MyVideoV1: React.FC = () => (
  <KineticShortComposition
    wordTimings={transcript.words}
    speechFile="{project}/speech-v1.mp3"
    musicFile="{project}/music-v1.mp3"
    musicVolume={0.16}
    imageCues={[
      { time: 0,  src: '{project}/images/img1.jpg' },
      { time: 12, src: '{project}/images/img2.jpg' },
      { time: 28, src: '{project}/images/img3.jpg' },
      { time: 42, src: '{project}/images/img4.jpg' },
    ]}
    overlayOpacity={0.70}
    colorSchemeStart={0}
  />
);
```

### imageCues: how to set correct timing

1. Print the transcript JSON to find word timestamps:
```bash
node -e "
const t = require('./projects/{project}/transcript-v1_transcript.json');
t.words.filter(w=>w.word.trim()).forEach(w => console.log(w.start.toFixed(1)+'s: '+w.word));
"
```
2. Find the timestamp of the first keyword that introduces each image topic
3. Set `{ time: thatTimestamp, src: '...img.jpg' }`

### imageCues rules

- Always start with `{ time: 0, src: '...' }` — required fallback
- One cue per major topic shift in the script
- Match image content to spoken content (edamame image when saying "edamame")

### Register in Root.tsx

```tsx
// remotion-project/src/Root.tsx
import { MyVideoV1 } from './compositions/MyVideoV1';

<Composition
  id="MyVideoV1"
  component={MyVideoV1}
  durationInFrames={Math.ceil(audioDurationSeconds * 30)}  // 30fps
  fps={30}
  width={1080}
  height={1920}
/>
```

Duration formula: `audioDuration (seconds) × 30 = frames`. Add 30-60 frames buffer.

### Copy audio to Remotion public folder

```bash
cp projects/{project}/speech-v*.mp3 remotion-project/public/{project}/
cp projects/{project}/music-v*.mp3  remotion-project/public/{project}/
```

### Copy transcripts to Remotion projects folder

```bash
cp projects/{project}/transcript-*_transcript.json \
   remotion-project/projects/{project}/
```

---

## Step 7: Render

```bash
cd kinetic-video-bundle/remotion-project

npx remotion render MyVideoV1 "../projects/{project}/output-v1.mp4"
```

---

## Font size: critical rules

**The most common bug: text overflowing video edges.**

Root causes and how the system prevents them:

| Cause | Prevention |
|-------|-----------|
| `textTransform: uppercase` adds ~35-40% width for mixed-case words | Compute `displayWord = word.toUpperCase()` for hero words **before** measuring, then render `displayWord` (no CSS textTransform) |
| Font measurement table is approximate | Width margin is conservative: `0.65` (35% safety buffer) |
| `fontWeight: 900` widens glyphs | Weight multiplier `1.12` in `measureWord()` |
| Scale animations overshoot | Max baseSizes: hero=180, strong=145, normal=115, subtle=90 |
| CSS `maxWidth` ignored with `whiteSpace: nowrap` | Not relied upon — font sizing must be correct before CSS |

**If text clips after any change to font/animation:**
- Check that hero words measure uppercase (`displayWord`)
- Check `widthMargin` in `getMaxSafeSize` is ≤ 0.65
- Check `baseSizes.hero` ≤ 180
- Reduce `baseSizes` by 10-15% across the board if still clipping

---

## QA Checklist (run before every final render)

### Before rendering

- [ ] Transcript JSON copied to `remotion-project/projects/{project}/`
- [ ] Audio files (speech + music) copied to `remotion-project/public/{project}/`
- [ ] Images copied to `remotion-project/public/{project}/images/`
- [ ] `imageCues[0].time === 0` (first cue must be at t=0)
- [ ] `durationInFrames` in Root.tsx ≥ `speechDuration × 30`
- [ ] TypeScript: `npx tsc --noEmit` returns no `src/` errors

### After rendering: watch the video and check

- [ ] **Text stays inside frame** — no word touches the left or right edge. If any word clips:
  - Reduce `baseSizes` in `KineticShortComposition.tsx`
  - Ensure `displayWord` is used (not CSS textTransform) for hero words
- [ ] **Images change at the right moments** — edamame image shows when saying "edamame", natto when saying "natto", etc. If wrong: adjust `imageCues` timestamps
- [ ] **Speech is audible** — music doesn't overpower voice. Adjust `musicVolume` (default 0.16-0.20)
- [ ] **No silent gap at end** — `durationInFrames` should not be much longer than audio
- [ ] **Animations feel varied** — hero words bounce/scale/flip, not all the same entrance
- [ ] **URL is correct** — search transcript JSON for `daily` and verify word reads `daily-life-hacks.com`. If wrong, fix the JSON word directly and re-render (no need to redo TTS)

### Text overflow fast check (before full render)

Render just 1 frame per word to spot overflow quickly:

```bash
# Render frame 90 (3s into video) as a still
npx remotion still MyVideoV1 --frame=90 /tmp/check.png
```

Scan through a few key frames at timestamps where long words appear.

---

## Project file structure

```
kinetic-video-bundle/
├── generate-video-images.py         # Imagen 4 Ultra 9:16 image generator
├── projects/{project}/
│   ├── script-v1.txt                # Raw script with [direction] brackets
│   ├── script-v1-clean.txt          # Stripped script sent to TTS
│   ├── speech-v1.mp3                # ElevenLabs TTS output
│   ├── transcript-v1.srt            # Subtitles
│   ├── transcript-v1_transcript.json # Word-level timing (ms precision)
│   ├── music-v1.json                # Music composition spec
│   ├── music-v1.mp3                 # Generated music
│   ├── images/img1-4.jpg            # Generated 9:16 images
│   └── output-v1.mp4                # Final rendered video
├── remotion-project/
│   ├── src/
│   │   ├── Root.tsx
│   │   └── compositions/
│   │       ├── KineticShortComposition.tsx  # Main template
│   │       └── {ProjectName}V1.tsx          # Per-video composition
│   ├── public/{project}/
│   │   ├── speech-v*.mp3
│   │   ├── music-v*.mp3
│   │   └── images/img*.jpg
│   └── projects/{project}/
│       └── transcript-v*_transcript.json
└── kinetic-bundle/
    ├── speech-generator/   ElevenLabs TTS
    ├── transcribe/         ElevenLabs Scribe
    ├── music-generator/    ElevenLabs Music
    └── youtube-uploader/   Google OAuth2
```

---

## Known issues log

| Issue | Root cause | Fix applied |
|-------|-----------|-------------|
| Long orange words clip at edges | `textTransform: uppercase` applied in CSS but measurement was on lowercase string. EDAMAME is ~40% wider than edamame | Compute `displayWord = word.toUpperCase()` before measuring; render `displayWord`; no CSS textTransform |
| Images not synced to speech | Old code rotated images every 15s regardless of content | `imageCues` prop: array of `{time, src}` matched to word timestamps from transcript |
| Transcript space entries shown as blank frames | ElevenLabs Scribe returns `" "` entries between words | Filter: `wordTimings.filter(w => w.word.trim().length > 0)` |
| Music missing (old videos) | ElevenLabs free tier doesn't include Music API | Requires Starter plan ($5/mo) |
| ffmpeg not installed on this machine | N/A | Not needed — Remotion mixes audio natively via two `<Audio>` components |
| URL displayed wrong in video (dailylifehacks.com / dailylife-hacks.com) | ElevenLabs TTS pronounces hyphens inconsistently → Scribe transcribes differently each time | Fix transcript JSON directly: find the URL word and replace with `daily-life-hacks.com`, then re-render. No need to regenerate speech. |
