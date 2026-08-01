#!/usr/bin/env python3
"""
audit_extraction_surfaces.py
============================

Sitewide detector for EXTRACTION-SURFACE DRIFT on daily-life-hacks.com.

WHAT IT LOOKS FOR
-----------------
Two surfaces on every article get lifted verbatim by AI assistants and shipped
inside FAQPage JSON-LD:

  1. the `quickAnswer` frontmatter field
  2. the first FAQ entry, `faq[0].answer`

When a number on one of those surfaces contradicts the article's own body text
or table, the least accurate sentence on the page becomes the most quoted one.
This script reads every `src/data/articles/*.md` (non-recursive, matching the
Astro content glob in src/content.config.ts) and reports two defect kinds:

  UNSUPPORTED  a quantity appears on an extraction surface with no equal value
               anywhere in the body (prose, list, or table cell).

  PERMISSIVE   the body contains a STRICTER value of the same unit than the
               extraction surface admits. This is the dangerous direction:
               "keeps 3 days to 2 weeks" on the surface while the body table
               says one variant is a same-day job. The surface reads as the
               permission slip.

MATCHING RULES (deliberately conservative: under-report over over-report)
------------------------------------------------------------------------
Number parsing
  * Recognised units only: g / gram(s), mg / milligram(s), day(s), week(s),
    month(s), hour(s)/hr, minute(s)/min, degrees Fahrenheit (`350F`, `165 degrees F`,
    `40 deg F`), percent (`%`, `percent`), dollars (`$1.50`).
    Anything without one of those units is ignored outright.
  * Ranges are parsed as one object, not two loose numbers:
    `3 to 4 days`, `3-4 days`, `2 or 3 weeks`, `between 25 and 30 grams`,
    and two-sided forms where the unit repeats (`105 degrees F to 115 degrees F`).
  * `400F` / `425 F` with no degree symbol are rewritten to `400 degrees F`
    before matching, so recipe steps written that way still count as body support.
  * Unicode fractions, simple `1/2` fractions, and spelled-out numbers
    (`ten minutes`, `forty-five minutes`, `three to four days`) are understood.
    Words and digits normalise identically, so `ten minutes` in a quickAnswer is
    supported by `10 minutes` in a step.
  * The phrases `same day` / `same-day` / `within a day` are normalised to a
    1-day quantity so a body table cell reading "Same day" can contradict a
    surface that promises days or weeks.
  * `1,200` style thousands separators are handled.

Unit families and normalisation (so equivalent phrasings do NOT get flagged)
  * TIME  -> canonical minutes. `2 weeks` == `14 days` == `336 hours`.
  * MASS  -> canonical grams. `1500 mg` == `1.5 g`.
  * TEMP_F, PERCENT, MONEY -> compared as-is.
  Cross-family comparison never happens.

Support test (drives UNSUPPORTED)
  A surface quantity counts as SUPPORTED when any of these hold:
    - the body has the same family with an equal canonical value
      (tolerance: 0.5% relative, or exact for small integers);
    - the surface value falls inside a body range of the same family;
    - the surface is itself a range and any body value of that family falls
      inside it (so "25 to 30 g" is satisfied by a table showing 28 g).
  Only quantities failing all three are reported.

Supporting corpus
  Body support is looked for in the Markdown body AND in the recipe fields that
  live in frontmatter but print inside the recipe card: `ingredients`, `steps`,
  `prepTime`, `cookTime`, `totalTime`. Without this, every sheet-pan recipe
  false-positives, because the oven temperature only ever appears in `steps`.

Table handling
  Markdown tables are parsed column-wise. If a header cell carries a unit
  ("Fiber (g)", "Keeps for (days)"), bare numeric cells in that column inherit
  it. This is what lets a `| 1.0 |` cell contradict a surface promising grams.

Permissive-drift test (drives PERMISSIVE)
  Restricted to the two families where "stricter" is meaningful and where the
  failure mode is a safety failure. Everything else is support-checked only.
    * TIME, storage scale only. Both sides must be >= 1 day (1440 minutes), so
      prep-time noise ("simmer 10 minutes") can never trigger it. The surface
      text must contain a storage keyword somewhere, and the body candidate's
      own line or sentence must contain one too (fridge, refrigerat, freeze,
      keeps, lasts, store, storage, shelf, discard, toss, use within, ...).
      Drift = body minimum strictly below the surface minimum.
    * TEMP_F, internal-temperature scale only. Both sides must sit in 130-185F
      and appear near an internal-temperature keyword (internal, thermometer,
      cook to, cooked to, reaches, doneness, until it hits). This keeps oven
      temperatures (350F) and freezer temps out. Temperatures in a REHEATING
      context are excluded on both sides: USDA's 165F reheat-leftovers rule is a
      different measurement from a 145F cook-to target, and comparing them was
      the single largest false-positive source in the first run.
      Drift = body maximum strictly above the surface maximum.

Severity
  Base points: PERMISSIVE 5 (quickAnswer) / 4 (faq[0]);
               UNSUPPORTED 2 (quickAnswer) / 1.5 (faq[0]).
  Food-safety weighting on the article total: +3 when the body carries 2+
  distinct safety markers (danger zone, internal temperature, refrigerate,
  botulism, raw egg, thaw, storage window, 40F, foodborne, food poisoning,
  bacteria, spoil, discard), +1 when it carries exactly 1.

WHAT IT CANNOT SEE
------------------
  * Contradictions with no number in them ("keeps indefinitely" vs a 4-day row).
  * Wrong-subject headings, e.g. an H2 about "crust" sitting over a table of
    finished slices. Both numbers can be individually true.
  * Whether a number is right in the real world. This is an internal-consistency
    checker, not a fact checker. It never touches the network.
  * Drift living in faq[1..n] rather than faq[0].
  * Units outside the recognised list (cups, ounces, servings, calories).

USAGE
  python scripts/audit_extraction_surfaces.py [--articles DIR] [--json PATH]
                                              [--top N] [--min-score F]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from typing import Any, Dict, Iterable, List, Optional, Tuple

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_ARTICLES = os.path.join(REPO_ROOT, "src", "data", "articles")
DEFAULT_JSON = os.path.join(REPO_ROOT, "reports", "gauntlet", "extraction-surface-audit.json")


# --------------------------------------------------------------------------
# Minimal YAML-subset frontmatter reader (standard library only).
# Handles: top level scalars, quoted scalars spanning lines, block scalars
# (>, >-, |, |-), and a list of {question, answer} maps at any indent.
# --------------------------------------------------------------------------

FM_RE = re.compile(r"^---\r?\n(.*?)\r?\n---\r?\n?", re.S)


def split_frontmatter(text: str) -> Tuple[str, str]:
    m = FM_RE.match(text)
    if not m:
        return "", text
    return m.group(1), text[m.end():]


def _dequote(raw: str) -> str:
    raw = raw.strip()
    if len(raw) >= 2 and raw[0] == '"' and raw[-1] == '"':
        return raw[1:-1].replace('\\"', '"').replace("\\n", " ")
    if len(raw) >= 2 and raw[0] == "'" and raw[-1] == "'":
        return raw[1:-1].replace("''", "'")
    return raw


def _read_scalar(lines: List[str], idx: int, key_indent: int, inline: str) -> Tuple[str, int]:
    """Read the value of a key whose inline part is `inline`, starting after line idx."""
    inline = inline.strip()
    n = len(lines)

    # Block scalar
    if inline in (">", ">-", ">+", "|", "|-", "|+"):
        folded = inline.startswith(">")
        buf: List[str] = []
        j = idx + 1
        while j < n:
            ln = lines[j]
            if ln.strip() == "":
                buf.append("")
                j += 1
                continue
            ind = len(ln) - len(ln.lstrip(" "))
            if ind <= key_indent:
                break
            buf.append(ln.strip())
            j += 1
        return ((" ".join(x for x in buf if x) if folded else "\n".join(buf)).strip(), j)

    # Quoted scalar, possibly unterminated on this line
    if inline[:1] in ('"', "'"):
        q = inline[0]
        acc = inline
        j = idx + 1
        while not _quote_closed(acc, q) and j < n:
            acc += " " + lines[j].strip()
            j += 1
        return (_dequote(acc), j)

    # Plain scalar, possibly continued on deeper-indented lines
    acc = inline
    j = idx + 1
    while j < n:
        ln = lines[j]
        if ln.strip() == "":
            break
        ind = len(ln) - len(ln.lstrip(" "))
        if ind <= key_indent:
            break
        if re.match(r"^\s*[A-Za-z0-9_]+:\s", ln) or ln.lstrip().startswith("- "):
            break
        acc += " " + ln.strip()
        j += 1
    return (_dequote(acc), j)


def _quote_closed(s: str, q: str) -> bool:
    if len(s) < 2 or s[0] != q:
        return False
    i = 1
    while i < len(s):
        c = s[i]
        if q == '"' and c == "\\":
            i += 2
            continue
        if c == q:
            if q == "'" and i + 1 < len(s) and s[i + 1] == "'":
                i += 2
                continue
            return i == len(s) - 1 or s[i + 1:].strip() == ""
        i += 1
    return False


def parse_frontmatter(fm: str) -> Dict[str, Any]:
    lines = fm.split("\n")
    out: Dict[str, Any] = {}
    i, n = 0, len(lines)
    while i < n:
        ln = lines[i]
        m = re.match(r"^([A-Za-z0-9_]+):(.*)$", ln)
        if not m:
            i += 1
            continue
        key, rest = m.group(1), m.group(2)
        if key == "faq":
            block, i = _collect_block(lines, i + 1)
            out["faq"] = _parse_faq(block)
            continue
        if rest.strip() == "":
            block, i = _collect_block(lines, i + 1)
            seq = _parse_scalar_sequence(block)
            if seq is not None:
                out[key] = seq
            continue
        val, i = _read_scalar(lines, i, 0, rest)
        out[key] = val
    return out


def _collect_block(lines: List[str], start: int) -> Tuple[List[str], int]:
    block: List[str] = []
    j, n = start, len(lines)
    while j < n:
        ln = lines[j]
        if ln.strip() == "":
            block.append(ln)
            j += 1
            continue
        ind = len(ln) - len(ln.lstrip(" "))
        if ind == 0 and not ln.lstrip().startswith("- "):
            break
        block.append(ln)
        j += 1
    return block, j


def _parse_scalar_sequence(block: List[str]) -> Optional[List[str]]:
    """A plain `- value` list of scalars (ingredients, steps, tags). None if not that shape."""
    items: List[str] = []
    for ln in block:
        s = ln.strip()
        if not s:
            continue
        if s.startswith("- "):
            val = s[2:].strip()
            if re.match(r"^[A-Za-z0-9_]+:", val):
                return None  # list of mappings, not scalars
            items.append(val)
        elif items:
            items[-1] += " " + s  # wrapped continuation of the previous item
        else:
            return None
    return [_dequote(x) for x in items] or None


def _parse_faq(block: List[str]) -> List[Dict[str, str]]:
    items: List[Dict[str, str]] = []
    marker_indents = [len(l) - len(l.lstrip(" ")) for l in block if l.lstrip().startswith("- ")]
    if not marker_indents:
        return items
    dash_indent = min(marker_indents)
    # Split into item chunks
    chunks: List[List[str]] = []
    cur: Optional[List[str]] = None
    for ln in block:
        ind = len(ln) - len(ln.lstrip(" "))
        if ln.lstrip().startswith("- ") and ind == dash_indent:
            if cur is not None:
                chunks.append(cur)
            cur = [" " * (ind + 2) + ln.lstrip()[2:]]
        elif cur is not None:
            cur.append(ln)
    if cur is not None:
        chunks.append(cur)

    for chunk in chunks:
        entry: Dict[str, str] = {}
        i, n = 0, len(chunk)
        while i < n:
            m = re.match(r"^(\s*)(question|answer):(.*)$", chunk[i])
            if not m:
                i += 1
                continue
            ind = len(m.group(1))
            key = m.group(2)
            val, i = _read_scalar(chunk, i, ind, m.group(3))
            entry[key] = val
        if entry:
            items.append(entry)
    return items


# --------------------------------------------------------------------------
# Quantity extraction
# --------------------------------------------------------------------------

FRACTIONS = {"½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125}

UNIT_PATTERNS: List[Tuple[str, str]] = [
    # (regex fragment, canonical unit key) - order matters, longest first
    (r"milligrams?\b", "mg"),
    (r"mg\b", "mg"),
    (r"grams?\b", "g"),
    (r"g\b", "g"),
    (r"minutes?\b", "minute"),
    (r"mins?\b", "minute"),
    (r"hours?\b", "hour"),
    (r"hrs?\b", "hour"),
    (r"days?\b", "day"),
    (r"weeks?\b", "week"),
    (r"months?\b", "month"),
    (r"(?:°|º|℉)\s*F\b", "F"),
    (r"degrees?\s*F(?:ahrenheit)?\b", "F"),
    (r"deg\s*F\b", "F"),
    (r"percent\b", "pct"),
    (r"%", "pct"),
]
UNIT_ALT = "|".join("(?:%s)" % p for p, _ in UNIT_PATTERNS)

FAMILY = {
    "mg": "MASS", "g": "MASS",
    "minute": "TIME", "hour": "TIME", "day": "TIME", "week": "TIME", "month": "TIME",
    "F": "TEMP_F",
    "pct": "PERCENT",
    "usd": "MONEY",
}
TO_CANON = {
    "mg": 0.001, "g": 1.0,
    "minute": 1.0, "hour": 60.0, "day": 1440.0, "week": 10080.0, "month": 43200.0,
    "F": 1.0, "pct": 1.0, "usd": 1.0,
}

WORD_NUMS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
    "nineteen": 19, "twenty": 20, "twenty-five": 25, "thirty": 30, "thirty-five": 35,
    "forty": 40, "forty-five": 45, "fifty": 50, "sixty": 60, "seventy": 70,
    "seventy-five": 75, "eighty": 80, "ninety": 90, "half": 0.5,
}
WORD_ALT = "|".join(sorted((re.escape(w) for w in WORD_NUMS), key=len, reverse=True))
NUM = r"(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?|\d*\s*[½¼¾⅓⅔⅛]|\d+/\d+|(?:%s))" % WORD_ALT
# en dash and em dash are written as escapes so no literal dash character lands in source
RANGE_SEP = r"\s*(?:to|through|[-\u2013\u2014]|or|and)\s*"
# A unit may be glued to its number with a hyphen: "14.5-gram", "100-gram", "30-minute".
UNIT_GAP = r"\s*-?\s*"
DAY_MIN = 1440.0


def _num(tok: str) -> Optional[float]:
    tok = tok.strip().replace(",", "")
    if not tok:
        return None
    low = tok.lower()
    if low in WORD_NUMS:
        return float(WORD_NUMS[low])
    for ch, v in FRACTIONS.items():
        if ch in tok:
            base = tok.replace(ch, "").strip()
            return (float(base) if base else 0.0) + v
    if "/" in tok:
        a, b = tok.split("/", 1)
        try:
            return float(a) / float(b)
        except (ValueError, ZeroDivisionError):
            return None
    try:
        return float(tok)
    except ValueError:
        return None


def _unit_of(token: str) -> Optional[str]:
    t = token.strip()
    for pat, key in UNIT_PATTERNS:
        if re.fullmatch(pat, t, re.I):
            return key
    for pat, key in UNIT_PATTERNS:
        if re.match(pat + r"$", t, re.I):
            return key
    return None


class Qty:
    __slots__ = ("lo", "hi", "unit", "family", "canon_lo", "canon_hi", "text", "ctx", "src")

    def __init__(self, lo: float, hi: float, unit: str, text: str, ctx: str, src: str):
        self.lo, self.hi, self.unit = lo, hi, unit
        self.family = FAMILY[unit]
        f = TO_CANON[unit]
        self.canon_lo, self.canon_hi = lo * f, hi * f
        self.text, self.ctx, self.src = text, ctx, src

    def is_range(self) -> bool:
        return self.canon_hi > self.canon_lo

    def as_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "unit": self.unit,
            "family": self.family,
            "low": round(self.lo, 4),
            "high": round(self.hi, 4),
            "canonical_low": round(self.canon_lo, 4),
            "canonical_high": round(self.canon_hi, 4),
            "context": self.ctx.strip()[:220],
            "source": self.src,
        }


TWO_SIDED_RANGE_RE = re.compile(
    r"(?<![\w.])(%s)%s(%s)%s(%s)%s(%s)" % (NUM, UNIT_GAP, UNIT_ALT, RANGE_SEP, NUM, UNIT_GAP, UNIT_ALT), re.I)
RANGE_RE = re.compile(
    r"(?<![\w.])(%s)%s(%s)%s(%s)" % (NUM, RANGE_SEP, NUM, UNIT_GAP, UNIT_ALT), re.I)
# "400F" and "425 F" carry no degree symbol; rewrite them so every later pass sees a unit.
ATTACHED_F_RE = re.compile(r"(?<![\w.])(\d{2,3}(?:\.\d+)?)\s?F\b(?!ahrenheit)")
SINGLE_RE = re.compile(r"(?<![\w.])(%s)%s(%s)" % (NUM, UNIT_GAP, UNIT_ALT), re.I)
MONEY_RANGE_RE = re.compile(r"\$\s*(%s)%s\$?\s*(%s)" % (NUM, RANGE_SEP, NUM), re.I)
MONEY_RE = re.compile(r"\$\s*(%s)" % NUM)
SAME_DAY_RE = re.compile(r"\bsame[\s-]day\b|\bwithin (?:a|one|1) day\b|\bthat same day\b", re.I)


def _ctx(text: str, start: int, end: int, width: int = 110) -> str:
    return re.sub(r"\s+", " ", text[max(0, start - width): min(len(text), end + width)])


def extract_quantities(text: str, src: str) -> List[Qty]:
    """Pull every recognised number-with-unit out of a chunk of text."""
    if not text:
        return []
    text = ATTACHED_F_RE.sub(r"\1 degrees F", text)
    out: List[Qty] = []
    consumed: List[Tuple[int, int]] = []

    def overlaps(a: int, b: int) -> bool:
        return any(not (b <= s or a >= e) for s, e in consumed)

    # "105 degrees F to 115 degrees F" / "3 g to 5 g": one range, not two singles.
    for m in TWO_SIDED_RANGE_RE.finditer(text):
        u1, u2 = _unit_of(m.group(2)), _unit_of(m.group(4))
        if u1 is None or u1 != u2:
            continue
        lo, hi = _num(m.group(1)), _num(m.group(3))
        if lo is None or hi is None:
            continue
        out.append(Qty(min(lo, hi), max(lo, hi), u1, m.group(0), _ctx(text, *m.span()), src))
        consumed.append(m.span())

    for m in MONEY_RANGE_RE.finditer(text):
        lo, hi = _num(m.group(1)), _num(m.group(2))
        if lo is None or hi is None:
            continue
        out.append(Qty(min(lo, hi), max(lo, hi), "usd", m.group(0), _ctx(text, *m.span()), src))
        consumed.append(m.span())

    for m in RANGE_RE.finditer(text):
        if overlaps(*m.span()):
            continue
        lo, hi, unit = _num(m.group(1)), _num(m.group(2)), _unit_of(m.group(3))
        if lo is None or hi is None or unit is None:
            continue
        out.append(Qty(min(lo, hi), max(lo, hi), unit, m.group(0), _ctx(text, *m.span()), src))
        consumed.append(m.span())

    for m in SINGLE_RE.finditer(text):
        if overlaps(*m.span()):
            continue
        v, unit = _num(m.group(1)), _unit_of(m.group(2))
        if v is None or unit is None:
            continue
        out.append(Qty(v, v, unit, m.group(0), _ctx(text, *m.span()), src))
        consumed.append(m.span())

    for m in MONEY_RE.finditer(text):
        if overlaps(*m.span()):
            continue
        v = _num(m.group(1))
        if v is None:
            continue
        out.append(Qty(v, v, "usd", m.group(0), _ctx(text, *m.span()), src))
        consumed.append(m.span())

    for m in SAME_DAY_RE.finditer(text):
        if overlaps(*m.span()):
            continue
        out.append(Qty(1.0, 1.0, "day", m.group(0), _ctx(text, *m.span()), src))
        consumed.append(m.span())

    return out


# --------------------------------------------------------------------------
# Body preparation, including table-column unit inheritance
# --------------------------------------------------------------------------

CODE_FENCE_RE = re.compile(r"```.*?```", re.S)
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
MD_LINK_RE = re.compile(r"\[([^\]]*)\]\((?:[^)]*)\)")
BARE_URL_RE = re.compile(r"https?://\S+")
HEADER_UNIT_RE = re.compile(r"\(?\b(g|grams?|mg|milligrams?|days?|weeks?|months?|hours?|minutes?|%|percent)\b\)?", re.I)
BARE_CELL_RE = re.compile(r"^\s*(%s)(?:%s(%s))?\s*$" % (NUM, RANGE_SEP, NUM))


def clean_body(body: str) -> str:
    b = CODE_FENCE_RE.sub(" ", body)
    b = HTML_COMMENT_RE.sub(" ", b)
    b = MD_LINK_RE.sub(r"\1", b)        # keep link text, drop the URL target
    b = BARE_URL_RE.sub(" ", b)
    return b


def table_inherited_quantities(body: str) -> List[Qty]:
    """Bare numeric table cells inherit the unit named in their column header."""
    out: List[Qty] = []
    lines = body.split("\n")
    i = 0
    while i < len(lines) - 1:
        if lines[i].lstrip().startswith("|") and re.match(r"^\s*\|[\s:|-]+\|\s*$", lines[i + 1]):
            header = [c.strip() for c in lines[i].strip().strip("|").split("|")]
            units: List[Optional[str]] = []
            for h in header:
                m = HEADER_UNIT_RE.search(h)
                units.append(_unit_of(m.group(1)) if m else None)
            j = i + 2
            while j < len(lines) and lines[j].lstrip().startswith("|"):
                cells = [c.strip() for c in lines[j].strip().strip("|").split("|")]
                for k, cell in enumerate(cells):
                    if k >= len(units) or units[k] is None:
                        continue
                    cm = BARE_CELL_RE.match(cell)
                    if not cm:
                        continue
                    lo = _num(cm.group(1))
                    hi = _num(cm.group(2)) if cm.group(2) else lo
                    if lo is None or hi is None:
                        continue
                    label = cells[0] if cells else ""
                    out.append(Qty(min(lo, hi), max(lo, hi), units[k],
                                   "%s %s (table col '%s')" % (cell, units[k], header[k]),
                                   "table row: %s | %s" % (label, cell), "body:table"))
                j += 1
            i = j
        else:
            i += 1
    return out


# --------------------------------------------------------------------------
# Context keyword sets
# --------------------------------------------------------------------------

STORAGE_WORDS = re.compile(
    r"\b(fridge|refrigerat\w*|freezer|freeze\w*|frozen|keeps?\b|kept|lasts?\b|last\b|"
    r"stor\w+|shelf|pantry|discard|toss\b|throw out|use within|eat within|good for|"
    r"holds? up|leftover\w*|spoil\w*|safe to eat|before it|expire\w*|window)\b", re.I)

# USDA's 165F reheating rule is a different measurement from a cook-to target, so a
# 145F cook temp beside a 165F reheat temp is not drift. Temps in a reheat context are
# excluded from the temperature-drift comparison entirely.
REHEAT_WORDS = re.compile(
    r"\b(reheat\w*|leftover\w*|re-?warm\w*|warm(?:ing)? (?:it|them|a|the)\b|"
    r"microwav\w*|next day|second day|from the fridge)\b", re.I)

INTERNAL_TEMP_WORDS = re.compile(
    r"\b(internal|thermometer|cook(?:ed)? (?:it )?to|cook to|reach\w*|doneness|done\b|"
    r"pull it|until it hits|instant-read|carryover)\b", re.I)

SAFETY_MARKERS = [
    r"danger zone", r"internal temperature", r"refrigerat", r"botulism", r"raw egg",
    r"\bthaw", r"storage window", r"40\s*°?\s*F", r"foodborne", r"food poisoning",
    r"\bbacteria", r"spoil", r"discard", r"listeria", r"salmonella", r"cross-contaminat",
]


def safety_markers(text: str) -> List[str]:
    found = []
    for pat in SAFETY_MARKERS:
        if re.search(pat, text, re.I):
            found.append(pat.replace("\\b", "").replace("\\s*", " ").replace("°?", ""))
    return found


# --------------------------------------------------------------------------
# Support / drift logic
# --------------------------------------------------------------------------

def _close(a: float, b: float) -> bool:
    if a == b:
        return True
    scale = max(abs(a), abs(b), 1e-9)
    return abs(a - b) / scale <= 0.005


def is_supported(sq: Qty, body: List[Qty]) -> Tuple[bool, Optional[Qty]]:
    """Return (supported, nearest_body_qty_of_same_family)."""
    same = [b for b in body if b.family == sq.family]
    if not same:
        return False, None
    nearest = min(same, key=lambda b: min(abs(b.canon_lo - sq.canon_lo), abs(b.canon_hi - sq.canon_hi)))
    for b in same:
        # exact endpoint agreement
        if _close(b.canon_lo, sq.canon_lo) or _close(b.canon_hi, sq.canon_hi):
            return True, b
        if _close(b.canon_lo, sq.canon_hi) or _close(b.canon_hi, sq.canon_lo):
            return True, b
        # surface value sits inside a body range
        if b.canon_lo <= sq.canon_lo <= b.canon_hi or b.canon_lo <= sq.canon_hi <= b.canon_hi:
            return True, b
        # body value sits inside the surface range
        if sq.is_range() and (sq.canon_lo <= b.canon_lo <= sq.canon_hi or sq.canon_lo <= b.canon_hi <= sq.canon_hi):
            return True, b
    return False, nearest


def time_drift(surface: List[Qty], surface_text: str, body: List[Qty]) -> Optional[Dict[str, Any]]:
    if not STORAGE_WORDS.search(surface_text or ""):
        return None
    s = [q for q in surface
         if q.family == "TIME" and q.canon_lo >= DAY_MIN and STORAGE_WORDS.search(q.ctx)]
    if not s:
        return None
    b = [q for q in body
         if q.family == "TIME" and q.canon_lo >= DAY_MIN and STORAGE_WORDS.search(q.ctx)]
    if not b:
        return None
    smin = min(s, key=lambda q: q.canon_lo)
    bmin = min(b, key=lambda q: q.canon_lo)
    if bmin.canon_lo < smin.canon_lo and not _close(bmin.canon_lo, smin.canon_lo):
        return {
            "surface_floor": smin.as_dict(),
            "body_floor": bmin.as_dict(),
            "ratio": round(smin.canon_lo / max(bmin.canon_lo, 1.0), 2),
        }
    return None


def temp_drift(surface: List[Qty], body: List[Qty]) -> Optional[Dict[str, Any]]:
    def ok(q: Qty) -> bool:
        return (q.family == "TEMP_F" and 130 <= q.canon_hi <= 185
                and bool(INTERNAL_TEMP_WORDS.search(q.ctx))
                and not REHEAT_WORDS.search(q.ctx))
    s = [q for q in surface if ok(q)]
    b = [q for q in body if ok(q)]
    if not s or not b:
        return None
    smax = max(s, key=lambda q: q.canon_hi)
    bmax = max(b, key=lambda q: q.canon_hi)
    if bmax.canon_hi > smax.canon_hi and not _close(bmax.canon_hi, smax.canon_hi):
        return {
            "surface_ceiling": smax.as_dict(),
            "body_ceiling": bmax.as_dict(),
            "gap_f": round(bmax.canon_hi - smax.canon_hi, 1),
        }
    return None


# --------------------------------------------------------------------------
# Per-article audit
# --------------------------------------------------------------------------

def audit_article(path: str) -> Optional[Dict[str, Any]]:
    with open(path, encoding="utf-8") as fh:
        raw = fh.read()
    fm_text, body_raw = split_frontmatter(raw)
    if not fm_text:
        return None
    fm = parse_frontmatter(fm_text)

    quick = (fm.get("quickAnswer") or "").strip()
    faq = fm.get("faq") or []
    faq0 = (faq[0].get("answer") if faq else "") or ""
    faq0_q = (faq[0].get("question") if faq else "") or ""

    # The supporting corpus is everything else that renders on the page: the
    # Markdown body plus the recipe fields (ingredients, steps, prep/cook/total
    # time) that live in frontmatter but are printed in the recipe card.
    body = clean_body(body_raw)
    body_qs = extract_quantities(body, "body:prose") + table_inherited_quantities(body_raw)

    recipe_bits: List[str] = []
    for key in ("ingredients", "steps"):
        val = fm.get(key)
        if isinstance(val, list):
            recipe_bits.extend(str(v) for v in val)
    for key in ("prepTime", "cookTime", "totalTime"):
        val = fm.get(key)
        if isinstance(val, str) and val.strip():
            recipe_bits.append(val)
    if recipe_bits:
        body_qs += extract_quantities("\n".join(recipe_bits), "body:recipe-card")
        body += "\n" + "\n".join(recipe_bits)

    surfaces = []
    if quick:
        surfaces.append(("quickAnswer", quick, extract_quantities(quick, "quickAnswer")))
    if faq0.strip():
        surfaces.append(("faq[0].answer", faq0, extract_quantities(faq0, "faq[0].answer")))

    markers = safety_markers(body + " " + quick + " " + faq0)
    safety_bonus = 3.0 if len(markers) >= 2 else (1.0 if markers else 0.0)

    findings: List[Dict[str, Any]] = []
    score = 0.0

    for name, text, qs in surfaces:
        weight_unsup = 2.0 if name == "quickAnswer" else 1.5
        weight_drift = 5.0 if name == "quickAnswer" else 4.0

        for sq in qs:
            ok, nearest = is_supported(sq, body_qs)
            if ok:
                continue
            findings.append({
                "kind": "UNSUPPORTED",
                "surface": name,
                "quantity": sq.as_dict(),
                "nearest_body_value": nearest.as_dict() if nearest else None,
                "points": weight_unsup,
            })
            score += weight_unsup

        td = time_drift(qs, text, body_qs)
        if td:
            findings.append({"kind": "PERMISSIVE_TIME", "surface": name, "detail": td,
                             "points": weight_drift})
            score += weight_drift

        pd = temp_drift(qs, body_qs)
        if pd:
            findings.append({"kind": "PERMISSIVE_TEMP", "surface": name, "detail": pd,
                             "points": weight_drift})
            score += weight_drift

    if not findings:
        return {"slug": os.path.basename(path)[:-3], "score": 0.0, "findings": [],
                "has_quick_answer": bool(quick), "faq_count": len(faq),
                "safety_markers": markers}

    score += safety_bonus
    return {
        "slug": os.path.basename(path)[:-3],
        "path": os.path.relpath(path, REPO_ROOT).replace("\\", "/"),
        "title": fm.get("title", ""),
        "category": fm.get("category", ""),
        "score": round(score, 2),
        "safety_bonus": safety_bonus,
        "safety_markers": markers,
        "has_quick_answer": bool(quick),
        "faq_count": len(faq),
        "faq0_question": faq0_q[:160],
        "findings": findings,
        "counts": {
            "unsupported": sum(1 for f in findings if f["kind"] == "UNSUPPORTED"),
            "permissive": sum(1 for f in findings if f["kind"].startswith("PERMISSIVE")),
        },
    }


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Audit extraction-surface drift across all articles.")
    ap.add_argument("--articles", default=DEFAULT_ARTICLES)
    ap.add_argument("--json", dest="json_path", default=DEFAULT_JSON)
    ap.add_argument("--top", type=int, default=25)
    ap.add_argument("--min-score", type=float, default=0.0)
    args = ap.parse_args(argv)

    files = sorted(f for f in os.listdir(args.articles) if f.endswith(".md"))
    results = []
    for f in files:
        r = audit_article(os.path.join(args.articles, f))
        if r:
            results.append(r)

    flagged = [r for r in results if r["findings"] and r["score"] >= args.min_score]
    flagged.sort(key=lambda r: (-r["score"], -r["counts"]["permissive"], r["slug"]))

    total_perm = sum(r["counts"]["permissive"] for r in flagged)
    total_unsup = sum(r["counts"]["unsupported"] for r in flagged)

    print("=" * 100)
    print("EXTRACTION-SURFACE DRIFT AUDIT")
    print("=" * 100)
    print("articles scanned          : %d" % len(results))
    print("with quickAnswer          : %d" % sum(1 for r in results if r["has_quick_answer"]))
    print("with at least one FAQ     : %d" % sum(1 for r in results if r["faq_count"]))
    print("articles flagged          : %d" % len(flagged))
    print("permissive-drift findings : %d" % total_perm)
    print("unsupported findings      : %d" % total_unsup)
    print()
    print("%-4s %-6s %-4s %-4s %s" % ("#", "SCORE", "PRM", "UNS", "SLUG"))
    print("-" * 100)
    for i, r in enumerate(flagged[:args.top], 1):
        print("%-4d %-6.1f %-4d %-4d %s" % (
            i, r["score"], r["counts"]["permissive"], r["counts"]["unsupported"], r["slug"]))
        for f in r["findings"][:4]:
            if f["kind"] == "UNSUPPORTED":
                q = f["quantity"]
                nb = f.get("nearest_body_value")
                print("        UNSUPPORTED  %-14s %-14s  nearest body: %s" % (
                    f["surface"], q["text"], nb["text"] if nb else "(no %s in body)" % q["family"]))
            elif f["kind"] == "PERMISSIVE_TIME":
                d = f["detail"]
                print("        PERMISSIVE   %-14s surface floor %s  vs  body floor %s (%sx)" % (
                    f["surface"], d["surface_floor"]["text"], d["body_floor"]["text"], d["ratio"]))
            else:
                d = f["detail"]
                print("        PERMISSIVE   %-14s surface max %s  vs  body max %s (+%s F)" % (
                    f["surface"], d["surface_ceiling"]["text"], d["body_ceiling"]["text"], d["gap_f"]))
    print("-" * 100)

    os.makedirs(os.path.dirname(args.json_path), exist_ok=True)
    payload = {
        "generated_by": "scripts/audit_extraction_surfaces.py",
        "articles_dir": os.path.relpath(args.articles, REPO_ROOT).replace("\\", "/"),
        "articles_scanned": len(results),
        "articles_with_quick_answer": sum(1 for r in results if r["has_quick_answer"]),
        "articles_flagged": len(flagged),
        "permissive_findings": total_perm,
        "unsupported_findings": total_unsup,
        "flagged": flagged,
        "clean": [r["slug"] for r in results if not r["findings"]],
    }
    with open(args.json_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)
    print("JSON written to %s" % os.path.relpath(args.json_path, REPO_ROOT).replace("\\", "/"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
