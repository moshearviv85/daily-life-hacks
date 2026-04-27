# Article Spec — Daily Life Hacks production articles

This is the authoritative, machine-checkable spec for every article produced
by `scripts/write.py`. The companion validator is `scripts/validate_article.py`;
each rule ID below maps to one function there.

**Tier 1** rules are build-blockers: one violation disqualifies the article
(no file is written; the run records the failed rule_id in `write_outputs`).
**Tier 2** rules are soft quality gates; they are reported but do not block.

Voice, flow, SEO, hook and overall quality are judged separately by the
existing stage 1.75 rubric. They are intentionally out of scope for this spec.

---

## Tier 1 — Build blockers

| ID   | Rule                                                                                       | Detection                                                             |
|------|--------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| S-01 | Markdown starts with a `---` frontmatter fence on the first non-empty line.                | regex on first lines                                                   |
| S-02 | Frontmatter closes with a second `---` fence before any article body content.              | split and inspect                                                      |
| S-03 | Frontmatter parses as valid YAML (no syntax errors).                                       | `yaml.safe_load` without raising                                       |
| S-04 | All required frontmatter fields present: title, excerpt, category, tags, image, date, author, faq. | key presence in parsed dict                                  |
| S-05 | `category` is one of: `nutrition`, `recipes`, `tips`.                                      | membership check                                                       |
| S-06 | `author` equals exactly `David Miller`.                                                    | string equality                                                        |
| S-07 | `faq` is a list of 4 or 5 items; each item has non-empty `question` (str) and `answer` (str). | type and length checks                                               |
| S-08 | `image` equals `/images/{slug}-main.jpg` exactly (slug derived from filename).             | string match                                                           |
| S-09 | `tags` is a list of 4 to 6 non-empty strings.                                              | type and length                                                        |
| S-10 | If `category == recipes`: `ingredients` is a non-empty list of strings, `steps` is a non-empty list of strings, `servings` is int, `calories` is int, `difficulty` is one of {Easy, Medium, Hard}, `prepTime`/`cookTime`/`totalTime` are strings. | typed checks |
| S-11 | No em-dash character (U+2014) anywhere in the file.                                        | `"—" not in text`                                                 |
| S-12 | No body heading matches `## Frequently Asked Questions` or `## FAQ` (FAQ lives in frontmatter only). | regex on body                                               |
| S-13 | No body heading equals `## Conclusion` or any H1-H6 conclusion header.                     | regex on body                                                          |
| S-14 | No supplement mention anywhere: protein/collagen/greens/fiber powder, capsule, pill, extract, adaptogen, ashwagandha, sea moss, probiotic capsule, multivitamin, pre-workout, fat burner. | regex list |
| S-15 | Body does not start or end with a markdown code fence (` ``` `).                           | regex                                                                  |

## Tier 2 — Soft quality gates (reported, not blocking)

| ID   | Rule                                                                                       | Detection                                                             |
|------|--------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| S-20 | Body word count in `[600, 1200]`.                                                          | `len(body.split())`                                                    |
| S-21 | Body contains 3 to 8 H2 headings.                                                          | regex count                                                            |
| S-22 | Body does not contain banned AI filler words (Furthermore, Moreover, In conclusion, Delve into, Dive into, Unlock, Elevate, Navigating, Game-changer, Revolutionize, Mouthwatering, It's important to note, It's worth noting). | case-insensitive word boundary match |
| S-23 | Body does not contain unhedged absolute health claims (`cures`, `heals`, `treats`, `prevents cancer|disease|diabetes`). | regex |
| S-24 | Body does not contain a sign-off phrase (Happy eating!, Enjoy!, Your gut will thank you, You won't regret it, Give it a try!, Dig in!, Bon appetit!). | regex |
| S-25 | Excerpt length in `[100, 200]` characters.                                                 | `len(excerpt)`                                                         |

---

## Change procedure

- Rules are stable contracts. Changing a rule means updating this file, the
  validator, and the tests — in that order — in a single commit.
- Promoting a rule from Tier 2 to Tier 1 requires that the baseline pass-rate
  across 15 sample articles is already 100%. Otherwise the promotion is
  aspirational, not enforceable.
- New rules start in Tier 2 and graduate after proving stable.
