---
name: Maximize Delegation to Sonnet
description: User requires Opus to delegate EVERY delegable task to Sonnet via Agent tool. Opus should only do work that genuinely needs Opus-level judgment.
type: feedback
originSessionId: 9d078ee8-8cfa-4c17-a921-382c7c744b4f
---
# Delegate Everything Possible to Sonnet

**Rule:** When running as Opus on this project, hand off every task that Sonnet can reasonably execute to a Sonnet sub-agent (`subagent_type: general-purpose` or specialized, `model: "sonnet"`). Opus should keep only the work that genuinely requires Opus-level judgment.

**Why:** User explicitly insisted ("אני חייב שכל משימה שאפשר מבחינתך לבצע שתעביר אותה לסונט"). Opus is slower and more expensive; delegating to Sonnet in parallel (run_in_background + worktree isolation) maximizes throughput and reduces cost. The user is paying attention to this and values aggressive delegation.

**How to apply:**
- **Default = delegate.** When planning a task, the first question is "can Sonnet do this?" not "should I do this myself?"
- **Sonnet handles:** TDD modules with clear specs, mechanical implementations, API clients, schema/boilerplate code, data-munging, test writing, file edits with explicit instructions, codebase exploration, running test suites, documentation generation, style/SEO analysis of existing content.
- **Opus keeps:** High-stakes architectural decisions, prompt engineering for downstream LLM quality, ambiguous/exploratory debugging where root cause is unknown, judgment calls on whether a spec is correct, final review before merge, and direct dialog with the user.
- **Prefer parallel background agents** with `run_in_background: true` and `isolation: "worktree"` so multiple tasks progress at once without stepping on each other.

**CRITICAL — keep delegation prompts THIN:**
- User explicitly called this out ("אל תהיה דפוק. אם אתה מאציל — שלח הנחיות בלבד. שלא תכתוב אתה את הקוד ואז רק תעביר לסונט שיעתיק"). The POINT of delegation is saving Opus's context + compute. Writing the full schema, every column, every function signature, every test case in the prompt = Opus did the work already. Sonnet just transcribes. Zero savings.
- **Delegate prompts should be SHORT specs:** goal, constraints, file paths to read for conventions, acceptance criteria (e.g. "12+ tests pass, full suite still green"), what to report back. Let Sonnet figure out column names, function signatures, test cases, edge cases on its own.
- **Good example:** "Build `db.py` — SQLite schema for the topic-research pipeline. Tables needed: runs, inputs (audience + pin inspector), source signals (reddit/autocomplete/trends), per-stage outputs. Stdlib sqlite3 only. Match conventions from `sources/reddit.py`. TDD, run full suite green. Report back."
- **Bad example:** listing every CREATE TABLE statement, every column, every CHECK constraint, every function signature — that's not delegating, that's typing.
- **Test:** if your delegation prompt is longer than ~300 words, you probably over-specified. Cut detail Sonnet can infer from the codebase.
- **Trade-off accepted:** Sonnet's output may diverge from what Opus would have written. That's OK — we iterate once on review rather than pre-specifying to death. A slight rework after-the-fact is still cheaper than Opus writing it upfront.

- **After Sonnet reports back, verify** — don't trust the summary blindly. Run tests, read key files, confirm the merge is clean.
- If a task is already 80% done in Opus's hands, finishing it is fine. Don't abandon mid-stream just to delegate the last 20% — that's waste. But the NEXT task should go to Sonnet.
