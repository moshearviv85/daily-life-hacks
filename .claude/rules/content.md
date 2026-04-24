# Content Rules (Always Active)

These rules apply to ALL content written for the site: articles, pins, landing pages, emails, lead magnets, newsletter content, and any user-facing text.

## Hard Bans (Zero Tolerance)

### Typography
- **NO em dashes** (`—`). Use regular hyphens sparingly, or rewrite the sentence. The em-dash character is never acceptable in published content.
- **NO emojis** in articles or site content. (Rare allowed exception: one wink in a casual email context.)

### Medical / Health Language
- **NO medical claims.** Avoid "cure", "treat", "heal", "relieve", "prevents", "fights", "combats". Use hedges: "may support", "could help", "might improve", "is thought to".
- **NO absolute health statements.** Never "is good for your gut" or "helps regulate blood sugar". Always hedge with "could", "may", "might".
- **NO detox/cleanse language.** Never "detox", "cleanses", "reset your system". Use "refresh", "feel refreshed".
- **NO disclaimer inside articles.** The site has a dedicated `/disclaimer` page. Do not duplicate.

### Supplements
- **NO supplements of any kind.** Includes synthetic (vitamins, minerals, protein powders, pre-workouts, fat burners) AND "natural" (herbal extracts, adaptogens, probiotic capsules, fiber powders, collagen powders, greens powders, sea moss, ashwagandha, etc.). If a topic requires supplementation, reject the topic. Food-first content only.

### Voice / Style
- **ALWAYS use contractions.** Never "it is", "do not", "they are". Always "it's", "don't", "they're".
- **NO "Conclusion" heading.** Use a natural closing paragraph instead.
- **NO double endings.** One natural close. No "Happy eating!", "Enjoy!", "Give it a try!", "You won't regret it!", "Your [X] will thank you!" sign-offs.
- **Tone:** warm, conversational blogger. Not clinical. Not robotic.

## AI-Detection Avoidance

### Banned AI Words
Never use: Furthermore, Moreover, In conclusion, Delve into, Dive into, It's important to note, It's worth noting, In today's world, Unlock, Elevate, Navigating, Game-changer, Revolutionize, Take it to the next level, Mouthwatering.

### Style Requirements
- **Burstiness:** mix short punchy sentences with longer descriptive ones.
- **Anecdotes:** sprinkle personal-sounding stories.
- **Imperfection:** casual tone, occasional fragments, conversational asides.

## Recipe Requirements
- Realistic quantities.
- Accurate calories.
- Correct cooking times and temperatures.

## Language
- English only. American audience.
- Include long-tail keywords naturally in headings and body.

## Why

On 2026-04-16, all meal plan work was reverted (commit `3a32e3e`) because these rules were violated. The site targets a Pinterest / affiliate audience; YMYL medical content can trigger Google penalties and is out of scope for this project.

## Enforcement

A PreToolUse hook (`.claude/hooks/content-checker.py`) blocks Edit/Write to article paths that contain em-dash or medical-claim keywords. Violations are surfaced before the edit is written. This rule document is the source of truth; the hook is a safety net.
