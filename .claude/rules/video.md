---
paths:
  - "scripts/*kinetic*"
  - "scripts/*video*"
  - "scripts/*elevenlabs*"
  - "elevenlabs/**"
  - ".cursor/skills/kinetic-video/**"
  - ".claude/skills/kinetic-video/**"
---

# Kinetic Video Rules (Path-Scoped)

These rules load when working on kinetic videos, shorts, or voice/music generation.

## Mandatory

Before starting any video work, load the kinetic-video skill at `.claude/skills/kinetic-video/SKILL.md` (or the Cursor original at `.cursor/skills/kinetic-video/SKILL.md`). The skill contains approval rules, script standards, full workflow, API keys, and the topic list. Do not start video work from memory.

## Voice Configuration

- **Voice ID:** `q0IMILNRPxOgtBTS4taI` (Voice-Q)
- **Settings:** `--speed 0.95 --stability 0.40 --similarity 0.78 --style 0.25`

## Music Generation

- Use ElevenLabs **simple prompt mode**: `-p "Upbeat YouTube Intro Music with Electric Guitar" -d 65 -i`
- **DO NOT use JSON mode.** It produces elevator music and has been tested to fail.

## Image Variants

Always generate 3 variants with different angles per shot.

## Composition Constants (Do Not Change)

These are tuned values in `KineticShortComposition.tsx`:
- `hero minSize = 80`
- `heroStartScaleX = min(1.6, frameWidth * 0.90 / heroSteadyWidth)`

Changing these has historically broken long-word rendering. Leave them alone unless explicitly debugging layout issues.

## Keywords

When adding new topics, extend the KEYWORDS array in `KineticShortComposition.tsx`.

## Why Path-Scoped

Video work is a separate workstream. These rules are irrelevant when writing articles or editing site code.
