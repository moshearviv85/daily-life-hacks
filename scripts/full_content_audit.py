#!/usr/bin/env python3
"""Full site content audit: content-audit-instructions + gemini-article-instructions."""
from __future__ import annotations

import glob
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
WORD_MIN = 700
WORD_MAX = 850

SKIP_SUBSTR = ("example-recipe", "example-nutrition", "INSTRUCTIONS")

banned_adverbs = [
    r"\bentirely\b",
    r"\bpractically\b",
    r"\bmassively\b",
    r"\baggressively\b",
    r"\bcompletely\b",
    r"\babsolutely\b",
    r"\btotally\b",
    r"\bthoroughly\b",
    r"\bbasically\b",
]
banned_ai_words = [
    r"\bfurthermore\b",
    r"\bmoreover\b",
    r"\bin conclusion\b",
    r"\bdelve into\b",
    r"\bdive into\b",
    r"\bit's important to note\b",
    r"\bit's worth noting\b",
    r"\bin today's world\b",
    r"\bunlock\b",
    r"\belevate\b",
    r"\bnavigating\b",
    r"\bgame-changer\b",
    r"\brevolutionize\b",
    r"\btake it to the next level\b",
    r"\bmouthwatering\b",
]
sign_offs = [
    r"enjoy!",
    r"happy eating!",
    r"give it a try!",
    r"you won't regret it!",
    r"your gut will thank you!",
]
medical_claims = [
    r"\bcures\b",
    r"\btreats\b",
    r"\bheals\b",
    r"\brelieves\b",
    r"\bburns belly fat\b",
    r"\bguaranteed to lose weight\b",
]
detox_words = [r"\bdetox\b", r"\bcleanse\b", r"\bflush your system\b"]

emoji_pattern = re.compile(r"[\U00010000-\U0010ffff]", flags=re.UNICODE)


def collect_paths() -> list[Path]:
    out: list[Path] = []
    for pattern in (
        "src/data/articles/**/*.md",
        "src/data/ready-articles/**/*.md",
        "pipeline-data/drafts/*.md",
    ):
        out.extend(ROOT.glob(pattern))
    seen: set[Path] = set()
    uniq: list[Path] = []
    for p in sorted(out):
        rp = p.resolve()
        if rp in seen:
            continue
        if any(s in str(p).lower() for s in ("example-recipe", "example-nutrition")):
            continue
        seen.add(rp)
        uniq.append(p)
    return uniq


def body_word_count(body: str) -> int:
    return len(re.findall(r"[A-Za-z']+", body))


def split_frontmatter(raw: str) -> tuple[dict | None, str, str | None]:
    if not raw.startswith("---"):
        return None, raw, "Missing YAML frontmatter"
    parts = raw.split("---", 2)
    if len(parts) < 3:
        return None, raw, "Invalid frontmatter boundaries"
    try:
        fm = yaml.safe_load(parts[1])
        if not isinstance(fm, dict):
            return None, parts[2], "Frontmatter is not a mapping"
        return fm, parts[2], None
    except Exception as e:
        return None, parts[2] if len(parts) > 2 else "", f"Invalid YAML: {e}"


def audit_file(path: Path) -> dict:
    rel = path.relative_to(ROOT).as_posix()
    raw = path.read_text(encoding="utf-8")
    issues: dict[str, list[str]] = {
        "schema": [],
        "length": [],
        "hallucination": [],
        "rules": [],
        "writing_guide": [],
    }

    fm, body_str, err = split_frontmatter(raw)
    if err:
        issues["schema"].append(err)
        return {"path": rel, "issues": issues, "body_words": 0}

    req = [
        "title",
        "excerpt",
        "category",
        "tags",
        "image",
        "imageAlt",
        "date",
        "faq",
    ]
    for f in req:
        if f not in fm:
            issues["schema"].append(f"Missing required field: {f}")

    cat = fm.get("category")
    if cat not in ("nutrition", "recipes", "tips"):
        issues["schema"].append(f"Invalid category: {cat!r}")

    if cat == "recipes":
        for f in (
            "prepTime",
            "cookTime",
            "totalTime",
            "servings",
            "calories",
            "difficulty",
            "ingredients",
            "steps",
        ):
            if f not in fm:
                issues["schema"].append(f"Missing recipe field: {f}")

    faq = fm.get("faq") or []
    if len(faq) != 5:
        issues["schema"].append(f"FAQ count is {len(faq)}, expected exactly 5")

    tags = fm.get("tags") or []
    if not (4 <= len(tags) <= 5):
        issues["writing_guide"].append(f"tags count is {len(tags)}, expected 4-5")

    if "publishAt" not in fm:
        issues["writing_guide"].append("Missing publishAt (required by gemini-article-instructions for scheduling)")

    if "—" in raw:
        issues["schema"].append("Contains em dash")

    if emoji_pattern.search(raw):
        issues["schema"].append("Contains emojis")

    w = body_word_count(body_str)
    if w < WORD_MIN:
        issues["length"].append(f"Body word count {w} < {WORD_MIN} (gemini target {WORD_MIN}-{WORD_MAX})")
    elif w > WORD_MAX:
        issues["length"].append(f"Body word count {w} > {WORD_MAX} (gemini target {WORD_MIN}-{WORD_MAX})")

    body_lower = body_str.lower()
    for adv in banned_adverbs:
        c = len(re.findall(adv, body_lower))
        if c > 2:
            issues["hallucination"].append(f"Repeated {adv.strip(chr(92) + 'b')}: {c} times")

    for word in banned_ai_words:
        if re.search(word, body_lower):
            issues["rules"].append(f"Banned AI phrase: {word.strip(chr(92) + 'b')}")

    if re.search(r"^#{2,3}\s+conclusion", body_lower, re.MULTILINE):
        issues["rules"].append("Banned Conclusion heading")

    for sign in sign_offs:
        if sign in body_lower:
            issues["rules"].append(f"Banned sign-off: {sign}")

    for claim in medical_claims:
        if re.search(claim, body_lower):
            issues["rules"].append(f"Banned medical claim pattern: {claim.strip(chr(92) + 'b')}")

    for d in detox_words:
        if re.search(d, body_lower):
            issues["rules"].append(f"Banned detox language: {d.strip(chr(92) + 'b')}")

    return {"path": rel, "issues": issues, "body_words": w}


def main() -> int:
    paths = collect_paths()
    report: list[dict] = []
    for p in paths:
        r = audit_file(p)
        flat = []
        for _k, v in r["issues"].items():
            flat.extend(v)
        if flat:
            report.append(r)

    out_md = ROOT / "pipeline-data" / "full-content-audit-report.md"
    lines = [
        "# Full Content Audit Report",
        "",
        f"Scope: `src/data/articles/`, `src/data/ready-articles/`, `pipeline-data/drafts/`.",
        f"Length rule: body (after frontmatter) **{WORD_MIN}-{WORD_MAX}** words per `gemini-article-instructions.md`.",
        "",
        f"**Files scanned:** {len(paths)}",
        f"**Files with any issue:** {len(report)}",
        "",
    ]
    sections = [
        ("length", "Length (writing guide)"),
        ("schema", "Schema / formatting"),
        ("hallucination", "Word salad / repetitive adverbs"),
        ("rules", "Banned phrases / medical / detox"),
        ("writing_guide", "Writing guide (tags, publishAt)"),
    ]
    for key, title in sections:
        lines.append(f"## {title}")
        items = [(x["path"], x["issues"][key]) for x in report if x["issues"][key]]
        if not items:
            lines.append("- None")
        else:
            for path, errs in sorted(items):
                lines.append(f"- `{path}`: {'; '.join(errs)}")
        lines.append("")

    out_md.write_text("\n".join(lines), encoding="utf-8")
    (ROOT / "pipeline-data" / "full-content-audit-report.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(out_md.read_text(encoding="utf-8")[:12000])
    if len(report) > 0 and len("\n".join(lines)) > 12000:
        print("\n... (truncated; see pipeline-data/full-content-audit-report.md)")
    return 0 if not report else 1


if __name__ == "__main__":
    sys.exit(main())
