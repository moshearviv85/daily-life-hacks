# Pesach Cleanup - System Configuration Reset

## Problem

The Claude Code configuration accumulated layers from 4 different tools (Menace AI, Antigravity, Cursor, Claude Code) creating conflicting rules, redundant hooks, stale memory, and context bloat. This directly caused the Pinterest incident: broken slugs went undetected because the system was too fragmented to catch them.

Every session loads ~363 lines of always-on rules + 37-line memory index + hooks running on every tool call. The overhead reduces available context for actual work and creates "split personality" behavior where contradictory instructions fight each other.

## Goal

Clean slate: minimal, non-contradictory configuration that uses Superpowers as the process framework and keeps only project-specific content (voice, article workflow, video, Pinterest) as custom skills.

## Decisions (all approved by user)

### Hooks: 7 → 0
### Rules: 5 → 1 (pinterest.md cleaned)
### Custom Skills: 7 → 4 (keep voice, article, video, pin)
### Memory: 15 → 6
### CLAUDE.md: rewrite clean
### Cursor remnants: archive

## Expected Result

- Always-on context: ~115 lines (down from ~363)
- Hooks per tool call: 0 (down from 4-7)
- Memory files: 6 (down from 15), ~250 lines total (down from 870)
