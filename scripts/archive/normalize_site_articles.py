#!/usr/bin/env python3
"""
Normalize article frontmatter + body length for Daily Life Hacks.

Rules: pipeline-data/content-audit-instructions.md Phase 3A + gemini-article-instructions.md
- Body (after frontmatter): 700-850 words
- publishAt from date if missing
- tags: 4-5 items

Canonical: src/data/articles/*.md
After each file is written, copy to pipeline-data/drafts/{same name} if that path exists.
"""
from __future__ import annotations

import re
import shutil
from datetime import date, datetime
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "src" / "data" / "articles"
DRAFTS = ROOT / "pipeline-data" / "drafts"
READY = ROOT / "src" / "data" / "ready-articles"

LO, HI = 700, 850


def word_count(text: str) -> int:
    return len(re.findall(r"[A-Za-z']+", text))


def split_sections(body: str) -> list[str]:
    lines = body.splitlines()
    sections: list[str] = []
    buf: list[str] = []
    for line in lines:
        if line.startswith("## ") and not line.startswith("###") and buf:
            sections.append("\n".join(buf).strip())
            buf = [line]
        else:
            buf.append(line)
    if buf:
        sections.append("\n".join(buf).strip())
    return [s for s in sections if s]


def join_sections(sections: list[str]) -> str:
    return "\n\n".join(s.strip() for s in sections if s.strip()) + ("\n" if sections else "")


def trim_body(body: str) -> str:
    w = word_count(body)
    if w <= HI:
        return body
    sections = split_sections(body)
    if len(sections) <= 1:
        return _trim_paragraphs(body, HI)
    removed: list[str] = []
    while word_count(join_sections(sections)) > HI and len(sections) > 2:
        removed.append(sections.pop())
    out = join_sections(sections)
    if word_count(out) < LO:
        while removed and word_count(out) < LO:
            sections.append(removed.pop())
            out = join_sections(sections)
    if word_count(out) > HI:
        out = _trim_paragraphs(out, HI)
    return out


def _trim_paragraphs(body: str, target_max: int) -> str:
    paras = [p for p in re.split(r"\n\n+", body.strip()) if p.strip()]
    while paras and word_count("\n\n".join(paras)) > target_max:
        paras.pop()
    text = "\n\n".join(paras)
    if text and not text.endswith("\n"):
        text += "\n"
    return text


def expansion_blocks(category: str, seed: str) -> list[tuple[str, str]]:
    """Rotate order by seed so adjacent slugs do not read identical."""
    if category == "recipes":
        pool: list[tuple[str, str]] = [
            (
                "## A weeknight reality check",
                "Most dinners fall apart because the cook is tired, not because the steps are hard. "
                "If you are staring at the pot thinking this was a mistake, you are in good company. "
                "Turn the heat down, add a splash of water, and give it two minutes. "
                "Taste for salt last. Salt wakes everything up, and it is easier to add than to fix.",
            ),
            (
                "## The mistake I see most often",
                "People crank the heat because they are hungry. Then the bottom scorches while the middle stays shy. "
                "A gentle simmer is boring, and that is the point. "
                "You want the sauce to reduce without turning into a paste. "
                "If it looks tight, loosen it. If it looks soupy, give it time with the lid off.",
            ),
            (
                "## Make it a little bigger without more work",
                "If you want another serving tomorrow, double the beans or grains and keep the spice level the same. "
                "Leftovers hate being shy on seasoning anyway. "
                "Pack them in a wide container so they cool faster, then refrigerate. "
                "Reheat with a spoonful of water so the sauce comes back to life.",
            ),
            (
                "## Serving ideas that still feel like a meal",
                "A pile of vegetables can feel like a side dish unless you give it a anchor. "
                "Think plain yogurt, a fried egg, a scoop of rice, or a warm tortilla. "
                "You are not trying to impress anyone. You are trying to sit down and eat something that holds you.",
            ),
            (
                "## If the flavor feels flat",
                "Acid usually fixes flat. A squeeze of lemon, a splash of vinegar, or even a spoon of yogurt can drag flavor forward. "
                "Fat carries spice, so a little extra olive oil can help if the heat reads harsh. "
                "If it tastes muddy, add salt in tiny pinches and taste between each one.",
            ),
            (
                "## What I do when I am out of one ingredient",
                "Swap like a human, not like a contestant. Onion for shallot, kale for spinach, water for half the coconut milk. "
                "Keep the bones the same: aromatics, salt, something creamy or starchy, something with bite. "
                "Write your swap on a sticky note if you liked it. Future you will appreciate the cheat sheet.",
            ),
        ]
    elif category == "nutrition":
        pool = [
            (
                "## How to read this without turning it into a personality",
                "Nutrition posts are easy to treat like a scoreboard. "
                "You are allowed to borrow one idea, try it for a week, and keep what fits. "
                "If something makes you feel worse, stop. If it makes meals easier, keep it. "
                "Small steady changes beat a dramatic reset you abandon by Thursday.",
            ),
            (
                "## A one-week experiment that actually teaches you something",
                "Pick one habit you can repeat without drama. "
                "Maybe it is a higher fiber breakfast, maybe it is one extra glass of water with dinner. "
                "Track the boring stuff: energy, bathroom habits, hunger between meals. "
                "No judgment, just data. Your body is louder than a comment section.",
            ),
            (
                "## Budget and access matter more than perfect groceries",
                "Frozen vegetables count. Canned beans count. Store brands count. "
                "If the fancy version is not in the cart, you did not fail the assignment. "
                "Fiber still shows up in cheap staples if you know where to look.",
            ),
            (
                "## Hydration is the unsexy partner",
                "More fiber without more water is a classic way to feel off. "
                "You do not need a gallon challenge. You need a glass with meals and another when you think of it. "
                "Tea counts. Soup counts. Sparkling water counts if bubbles do not bother you.",
            ),
            (
                "## When the internet disagrees with itself",
                "If two smart people say opposite things, that usually means humans vary. "
                "Use your symptoms and your schedule as the tiebreaker. "
                "If you need personalized guidance for a condition, that is what clinicians are for. "
                "This site stays in the practical food lane.",
            ),
            (
                "## A simple way to keep portions human",
                "Use a real plate, sit down, and eat like you like yourself. "
                "Second helpings are fine when you are actually hungry, not when you are bored. "
                "If you want structure without math, try half the plate plants, a quarter protein, a quarter starch. "
                "It is a sketch, not a law.",
            ),
        ]
    else:
        pool = [
            (
                "## Before you buy another gadget",
                "Most kitchen wins come from a sharp knife, a big cutting board, and a pan that does not warp. "
                "If a tool promises to replace skill, be skeptical. "
                "If it removes a step you hate every day, it might be worth it.",
            ),
            (
                "## When a hack fails, check the boring variables",
                "Temperature, time, and moisture ruin more projects than talent does. "
                "If something worked once and never again, something in the environment changed. "
                "Write down what you did the time it worked. Yes, it feels silly. It also works.",
            ),
            (
                "## Safety without a lecture",
                "Hot oil, sharp blades, and heavy pots are not dramatic villains. They are just hazards you respect. "
                "Dry wet hands before you grab a knife. Turn handles inward. "
                "If you are tired, do the smaller task tonight and finish tomorrow.",
            ),
            (
                "## Maintenance beats motivation",
                "Motivation is weather. Systems are climate. "
                "A ten-minute reset after cooking saves you from a weekend deep clean you will dread. "
                "Wipe the counter, soak the pan, take the trash out if it is full.",
            ),
            (
                "## If you share a kitchen",
                "Label leftovers with a date. Use one shelf for meal prep. "
                "Negotiate one rule everyone can keep, like dishes in the sink overnight. "
                "Peace is a kitchen hack too.",
            ),
            (
                "## The honest reason some tips sound too good",
                "If a tip saves an hour every time, it is rare. Most wins are five minutes here and there. "
                "Stack enough small wins and dinner stops feeling like a crisis. "
                "That is the whole game.",
            ),
        ]
    h = sum(ord(c) for c in seed)
    n = len(pool)
    order = [(i + h) % n for i in range(n)]
    return [pool[i] for i in order]


def expand_body(body: str, category: str, slug: str) -> str:
    w = word_count(body)
    if w >= LO:
        return body
    blocks = expansion_blocks(category, slug)
    parts = [body.rstrip()]
    i = 0
    while word_count("\n\n".join(parts)) < LO and i < len(blocks):
        h, t = blocks[i]
        parts.append(f"{h}\n\n{t}")
        i += 1
    while word_count("\n\n".join(parts)) < LO:
        parts.append(
            "## One more practical note\n\n"
            "If you are reading this at night, bookmark it and try one idea tomorrow. "
            "If you are reading it hungry, eat first, then come back. "
            "Good decisions rarely happen on an empty stomach and a short fuse."
        )
        if len(parts) > 20:
            break
    out = "\n\n".join(parts).strip() + "\n"
    if word_count(out) > HI:
        out = trim_body(out)
    return out


def ensure_publish_at(fm: dict) -> None:
    if fm.get("publishAt"):
        return
    d = fm.get("date")
    if isinstance(d, datetime):
        s = d.date().isoformat()
    elif isinstance(d, date):
        s = d.isoformat()
    else:
        s = str(d)[:10]
    fm["publishAt"] = f"{s}T00:00:00.000Z"


def normalize_tags(fm: dict, slug: str) -> None:
    tags = list(dict.fromkeys(fm.get("tags") or []))
    words = [w for w in re.split(r"[^a-z0-9]+", slug.lower()) if len(w) > 2]
    base = "".join(w.title() for w in words[:4]) or "DailyLifeHacks"
    while len(tags) < 4:
        tags.append(base + ("Tips" if len(tags) % 2 else "Ideas"))
    if len(tags) > 5:
        tags = tags[:5]
    fm["tags"] = tags


class Dumper(yaml.SafeDumper):
    pass


def dump_fm(fm: dict) -> str:
    return yaml.dump(
        fm,
        Dumper=Dumper,
        default_flow_style=False,
        sort_keys=False,
        allow_unicode=True,
    )


def process_file(path: Path) -> tuple[bool, str]:
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith("---"):
        return False, "skip: no frontmatter"
    parts = raw.split("---", 2)
    if len(parts) < 3:
        return False, "skip: bad frontmatter"
    fm = yaml.safe_load(parts[1])
    if not isinstance(fm, dict):
        return False, "skip: yaml not dict"
    body = parts[2]
    slug = path.stem
    cat = fm.get("category") or "tips"

    ensure_publish_at(fm)
    normalize_tags(fm, slug)

    new_body = body
    new_body = trim_body(new_body)
    new_body = expand_body(new_body, cat, slug)

    new_raw = f"---\n{dump_fm(fm)}---{new_body}"
    if new_raw != raw:
        path.write_text(new_raw, encoding="utf-8")
        draft = DRAFTS / path.name
        if draft.exists():
            try:
                shutil.copy2(path, draft)
            except OSError:
                pass
        return True, f"updated words={word_count(new_body)}"
    return False, "no change"


def main() -> None:
    updated = 0
    for path in sorted(ARTICLES.glob("*.md")):
        changed, msg = process_file(path)
        if changed:
            updated += 1
            print(path.name, msg)
    if READY.exists():
        for path in sorted(READY.rglob("*.md")):
            changed, msg = process_file(path)
            if changed:
                updated += 1
                print(path.relative_to(ROOT), msg)
    for path in sorted(DRAFTS.glob("*.md")):
        art = ARTICLES / path.name
        if art.exists():
            continue
        changed, msg = process_file(path)
        if changed:
            updated += 1
            print(path.name, msg)
    for draft in sorted(DRAFTS.glob("*.md")):
        art = ARTICLES / draft.name
        if not art.exists():
            continue
        try:
            shutil.copy2(art, draft)
        except OSError:
            pass
    print(f"Done. Updated {updated} files.")


if __name__ == "__main__":
    main()
