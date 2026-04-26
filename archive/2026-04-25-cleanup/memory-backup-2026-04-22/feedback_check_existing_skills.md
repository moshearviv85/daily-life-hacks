---
name: Check Existing SKILL + Rule Files Before Creating or Duplicating
description: Before creating or replicating any content pattern/voice/style guide, search .cursor/skills/, .cursor/rules/, and related locations for existing canonical files. Reference them, don't duplicate.
type: feedback
originSessionId: 9d078ee8-8cfa-4c17-a921-382c7c744b4f
---
# Check for Existing SKILL / Rule Files First

**Rule:** Before creating a SKILL, rule, or style guide — OR before having Sonnet sample the corpus to extract voice/style/rules — search for existing canonical files. If one exists, REFERENCE it. Do not duplicate.

**Why:** User already maintains `.cursor/skills/david-miller-voice/SKILL.md` as the single source of truth for voice, plus `.cursor/rules/david-miller-voice.mdc` as a wrapper. I built an article-writing SKILL that duplicated half the voice rules (banned AI words, contractions, em dashes, hedging, no sign-offs) without ever searching for the existing file. User caught it: "יש לנו כבר קובץ שנקרא DAVID MILLER VOICE עד עכשיו הוא עבד נהדר. למה לא השתמשת בו?" Duplication causes drift — two files can disagree and nobody knows which wins.

**How to apply:**
- **Before writing OR delegating content-pattern work**, run `Glob` for candidate names (e.g. `**/*voice*`, `**/*style*`, `**/SKILL.md`, `**/*david*`). Check `.cursor/skills/`, `.cursor/rules/`, `skills/`, project root.
- **Read any matches** before designing the new content. Understand scope.
- **Design for composition:** new SKILL REFERENCES existing ones ("for voice, follow `.cursor/skills/X/SKILL.md`"). Your new SKILL adds only what's NOT already covered.
- **Delegation prompts must tell Sonnet to do this search too** — "First run `Glob` on `.cursor/skills/` + `.cursor/rules/`. If a relevant SKILL exists, reference it; don't duplicate its rules."
- **Empirical corpus examples ARE allowed** even if an abstract SKILL exists — e.g. verbatim excerpts from published articles have value beyond the abstract voice rules. But abstract rules (banned words, hard constraints) should live in ONE file only.
- **Applies to all shared style/rule artifacts:** voice, brand colors, content constraints, linting rules, prompt templates, commit-message style.
