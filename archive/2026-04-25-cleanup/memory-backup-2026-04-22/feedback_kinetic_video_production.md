---
name: Kinetic Video Production - Validated Workflow (CabbageV4)
description: What works in kinetic video production — validated settings, voice, music, workflow from CabbageV4 session
type: feedback
---

Validated production workflow from CabbageV4 session. Follow this exactly for best results.

**Voice selection:** Always generate 5 short samples before committing. Voice `q0IMILNRPxOgtBTS4taI` (Voice-Q) works great with upbeat guitar music. Settings: `--speed 0.95 --stability 0.40 --similarity 0.78 --style 0.25`

**Music:** Use ElevenLabs simple prompt mode (`-p "..."`) NOT JSON composition. JSON produces flat "elevator music." Proven prompt: `"Upbeat YouTube Intro Music with Electric Guitar"` with `-d 65 -i`. User called it "נהדר."

**Background images:** Generate 3 variants with different angles and let user choose. Much higher satisfaction than single image.

**KEYWORDS for hero orange:** Must expand KEYWORDS per topic in KineticShortComposition.tsx. For food/gut content: cabbage, kombucha, fiber, caramelizes, vegetable, probiotic, gut, sauerkraut already there.

**Long hero word overflow fix (permanent in code):**
- hero minSize=80 (not 130) — allows smaller font for long words
- heroStartScaleX = min(1.6, frameWidth*0.90/heroSteadyWidth) — caps squash-stretch
- Both fixes are in KineticShortComposition.tsx — do NOT revert

**What NOT to do:**
- Never use JSON composition mode for music
- Never cascade/stack ALL words (V2 disaster) — user: "הגרסא השניה פשוט דפוקה לחלוטין"
- Never skip voice selection step
- Never show single background image option without variants

**Why:** All learned from multiple failed iterations (V1→V4) during CabbageV4 production session.

**How to apply:** Follow SKILL.md exactly. The mandatory approval rule, voice selection, 3 image variants, and KEYWORDS expansion are all non-negotiable.
