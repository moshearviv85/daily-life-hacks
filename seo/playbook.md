# SEO/AEO Playbook - Technical Details

> How to implement each change. Updated as we go.

## llms.txt

Location: `public/llms.txt`
Purpose: Tells LLMs what the site is and where to find key content.
Format: Plain text, structured sections describing the site, its purpose, and key URLs.

Reference: https://llmstxt.org/

## robots.txt Updates

Current location: `public/robots.txt`
Changes needed: Ensure AI crawlers (GPTBot, Google-Extended, ClaudeBot, PerplexityBot,
Bytespider) are explicitly allowed or not blocked.

## Structured Data (JSON-LD)

### FAQ Schema
- Add to article pages with 3-5 Q&As extracted from content
- Must not duplicate - only one FAQPage per page
- Implementation: Astro component that injects JSON-LD in `<head>`

### Organization Schema
- Add to homepage
- Fields: name, url, logo, sameAs (social links)

### Article Schema
- Already may exist - audit first
- Enhance with: datePublished, dateModified, author, image

### BreadcrumbList Schema
- Add to all inner pages
- Format: Home > Category > Article

## Quick Answer Block

- 40-60 words directly answering the main question
- Goes right after the H1, before the first H2
- Styled as a highlighted box
- This is what AI Overviews and featured snippets extract

## H2 as Questions

- Convert informational H2s to question format where natural
- "High Fiber Breakfast Options" -> "What Are the Best High Fiber Breakfast Options?"
- Don't force it - only where it reads naturally

## Implementation Notes

(Add notes here as we implement each piece)
