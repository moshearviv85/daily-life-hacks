---
name: Deterministic Scripts — Critical Distinction
description: User wants real standalone scripts that call the model via API, not hardcoded data dumps with me doing the work inline
type: feedback
originSessionId: 9d078ee8-8cfa-4c17-a921-382c7c744b4f
---
The user caught me repeatedly delivering "scripts" that are actually just INSERT statements for data I gathered manually. This is NOT what they asked for and it frustrated them ("אתה הופך אותי לנרקומן").

**The rule:** When the user asks for a deterministic script, the script must:
1. Run standalone — user clicks it and it works without me in the loop
2. Call the model via API (Claude or Gemini) when intelligence is needed
3. Prompt the user for data files when needed, or read from a fixed input directory
4. Produce a real output — not a DB pre-filled with data I chose by hand
5. Be repeatable — running it tomorrow, next month, with new data, should work

**What FAILS the rule:**
- Hardcoded Python lists of Reddit topics / Pinterest data baked into the script
- `if existing: skip` guards that make the script a no-op after first run
- Me doing WebSearch / WebFetch / analysis, then writing INSERT statements to put my findings into the DB
- Calling `python -c "..."` from bash to manipulate the DB inline — that's me doing the work, not the script

**Why:** The user pays for a tool, not for me personally doing research. If I'm the intelligence in the loop, the "script" has zero value when I'm not there. Also: they felt they became dependent on working with me instead of getting an autonomous system.

**How to apply:**
- Before writing any "research" or "pipeline" script, ask: does this call an API for intelligence, or am I baking my answers into the code?
- If the task needs judgment (topic selection, SEO analysis, insight generation), the script must POST to an LLM API — not have me decide and hardcode the answer
- If the task needs external data (CSVs, API exports), the script must either read from a configured path or prompt the user — not have me paste the data inline
- Never again write a "pipeline" script whose body is `data = [("...", "..."), ...]` that I filled in manually. That's a data migration script, not a research script.
