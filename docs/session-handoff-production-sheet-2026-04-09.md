# Session Handoff — Production Sheet Workflow (2026-04-09)

## Objective (new workflow)
- Work as a **production line** using **ONE table file only**.
- **Single source of truth:** `pipeline-data/production-sheet.csv`
- The table must contain *everything* per row:
  - Article title + full article markdown (in-cell)
  - Image filenames + image alt + image prompts (in-cell)
  - Pinterest pin titles/descriptions/alt + image filenames + links (v1–v5, in-cell)
  - QA + publish flags (in-cell)
- **No external references** for content (no “see file X”).  
  The **only** external reference allowed is **image filenames** (because the binary images live on disk/CDN).

## Hard rules from user
- Start with **headers only** (no data rows) until user approves column structure.
- After approval: fill **exactly ONE row**, then STOP and wait for approval.
- No “notes” columns (removed/avoid) — they invite problems.
- Row number is the primary identifier for coordination, not slug names.

## Current state (as of now)
- `pipeline-data/production-sheet.csv` exists and currently contains:
  - A single header row
  - No content rows
- Image scene randomizer exists:
  - `pipeline-data/image-scenes.json` (array of scene strings)
  - Scripts should pick a random scene at generation time and append it to the prompt.

## What NOT to do
- Do not create or rely on `pipeline-data/drafts/*.md` as the working unit.
- Do not create multiple batch files as “sources of truth”.
- Do not auto-fill many rows without explicit user approval.

## Next step for the new chat
1. Confirm/adjust the **exact columns** in `pipeline-data/production-sheet.csv`.
2. After user approval: fill **row 1 only** (populate every required cell).
3. Stop and wait for user approval.

