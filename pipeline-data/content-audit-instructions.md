# Content Audit & Quality Gate Instructions

This document provides exact instructions for an AI Agent to systematically audit all articles in the repository. The goal is to detect AI hallucinations (like "word salad" or aggressive repetition of adverbs), formatting violations, and breaches of the Daily Life Hacks content rules.

## Target Directories
The agent must scan all `.md` files in:
1. `src/data/articles/` (published/scheduled articles)
2. `pipeline-data/drafts/` (pending drafts, if any exist)

## Phase 1: Automated Formatting & Schema Check
For every file, verify the following structure without subjective reading:

1. **YAML Frontmatter Presence:** File must start with `---`, contain valid YAML, and end with `---`.
2. **Required Fields:** `title`, `excerpt`, `category` (must be exactly `nutrition`, `recipes`, or `tips`), `tags`, `image`, `imageAlt`, `date`, `faq`.
3. **Recipe Fields:** If `category` is `recipes`, the frontmatter MUST contain `prepTime`, `cookTime`, `totalTime`, `servings`, `calories`, `difficulty`, `ingredients` (list), and `steps` (list).
4. **FAQ Count:** The `faq` array must contain exactly 5 items.
5. **No Em Dashes:** The file MUST NOT contain the em dash character (`—`).
6. **No Emojis:** The file MUST NOT contain any emojis.

## Phase 2: AI Hallucination & Word Salad Detection
This is the most critical check to prevent the "aggressively massive" bug. For the **body text, excerpt, ingredients, and steps**:

1. **Repetitive Adverbs/Adjectives:** Flag any file that heavily repeats words like `entirely`, `practically`, `massively`, `aggressively`, `completely`, `absolutely`, `totally`, `thoroughly`, `basically`. (If a single paragraph contains 3+ of these, it is a severe hallucination).
2. **Run-on Sentences:** Flag any sentence longer than 40 words that lacks punctuation or consists of strung-together adjectives (e.g., "The absolute essential completely total practically fundamental deeply total entirely secret...").
3. **Ingredient/Step Weirdness:** In recipes, ingredients and steps must be plain instructions. Flag if they contain emotional adjectives (e.g., "heavily minced", "aggressively dump", "intense heat").

## Phase 3: Content & Tone Rules (David Miller Voice)
Scan the article body for these strict rule violations:

1. **Banned AI Words:** Flag any use of: `Furthermore`, `Moreover`, `In conclusion`, `Delve into`, `Dive into`, `It's important to note`, `It's worth noting`, `In today's world`, `Unlock`, `Elevate`, `Navigating`, `Game-changer`, `Revolutionize`, `Take it to the next level`, `Mouthwatering`.
2. **Banned Headings:** Flag if the heading `## Conclusion` (or any variation like `### Conclusion`) exists.
3. **Sign-off Endings:** Flag if the article ends with phrases like `Enjoy!`, `Happy eating!`, `Give it a try!`, `You won't regret it!`, `Your gut will thank you!`.
4. **Medical/Weight Loss Claims:** Flag absolute claims like `cures`, `treats`, `heals`, `relieves`, `burns belly fat`, `guaranteed to lose weight`. (Must use hedged language: `may support`, `could help`).
5. **Detox Language:** Flag words like `detox`, `cleanse`, `flush your system`.
6. **Lack of Contractions:** Flag if the text feels robotic and repeatedly uses `it is`, `do not`, `cannot` instead of `it's`, `don't`, `can't`.

## Agent Execution Output Format
The Agent should not fix the files automatically unless explicitly asked. Instead, the Agent must generate a JSON or Markdown report listing ONLY the files that failed the audit.

**Example Report Format:**
```markdown
# Content Audit Report

## Severe Hallucinations (Word Salad)
- `src/data/articles/example-recipe.md`: Heavy use of "completely", "totally" in steps.

## Rule Violations
- `pipeline-data/drafts/another-post.md`: Contains "In conclusion" and an em dash.
- `src/data/articles/third-post.md`: Makes a direct medical claim ("cures IBS").

## Schema Errors
- `src/data/articles/bad-frontmatter.md`: Missing `totalTime` in a recipe.
```

**Instructions for the Agent:** 
"Read `pipeline-data/gemini-article-instructions.md` and `.cursor/skills/david-miller-voice/SKILL.md` for context. Then, scan all articles against the rules above. Provide a summary report of all flagged files."

## Phase 5: Dashboard Scan Log (MANDATORY — run at the END of every audit)

After completing the audit and any fixes, the agent MUST POST a scan summary to the dashboard log endpoint. This records the scan timestamp and results so the owner can see when the last quality check was performed.

**Endpoint:** `POST https://www.daily-life-hacks.com/api/agent-scan?key=moshiko1985!`
**Method:** POST
**Content-Type:** application/json
**Body:**
```json
{
  "scan_type": "content_audit",
  "notes": "One-line summary of what was checked and overall result",
  "issues_found": <total number of violations found>,
  "issues_fixed": <total number of violations fixed>,
  "details": "Optional: comma-separated list of fixed files or brief detail"
}
```

**Example curl command:**
```bash
curl -s -X POST "https://www.daily-life-hacks.com/api/agent-scan?key=moshiko1985!" \
  -H "Content-Type: application/json" \
  -d '{"scan_type":"content_audit","notes":"Scanned 66 articles — 3 violations fixed (em dashes, banned words)","issues_found":3,"issues_fixed":3,"details":"fixed: article-a.md, article-b.md, article-c.md"}'
```

This step is non-optional. The dashboard owner tracks all scans through this log.
