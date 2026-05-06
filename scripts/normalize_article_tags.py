"""
Normalize article tags for SEO tag pages.

Replaces CamelCase junk tags and generates short, searchable keyword tags.
Uses keyword-clusters.json when available, otherwise derives from slug.

Algorithm:
  1. Generate candidate bigrams from slug words (preserving real adjacency)
  2. Merge with existing natural tags and keyword cluster data
  3. Build global frequency map - only assign tags found in 2+ articles
  4. Cap at 7 tags per article

Dry run by default. Use --apply to write changes to article files.
"""

import os
import re
import json
import argparse
from collections import Counter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTICLES_DIR = os.path.join(BASE_DIR, "src", "data", "articles")
CLUSTERS_FILE = os.path.join(BASE_DIR, "pipeline-data", "keyword-clusters.json")

STOP_WORDS = frozenset({
    "a", "an", "the", "for", "to", "of", "in", "on", "with", "and", "or",
    "but", "is", "are", "was", "were", "be", "been", "your", "you", "that",
    "this", "it", "its", "by", "at", "from", "as", "how", "what", "why",
    "when", "which", "do", "does", "can", "could", "should", "would", "will",
    "just", "about", "not", "no", "so", "than", "them", "their", "they",
    "we", "our", "us", "has", "have", "had", "much", "many", "also", "very",
    "more", "most", "some", "any", "all", "into", "out", "up", "down", "if",
    "my", "me", "i", "he", "she", "who", "whom", "his", "her", "am",
    "there", "here", "then", "now", "over", "after", "before",
})

# Words that are valid in multi-word tags but useless alone.
# A tag is valid only if it contains at least one word NOT in this set.
WEAK_WORDS = frozenset({
    # Superlatives / qualifiers
    "best", "top", "good", "great", "easy", "simple", "quick", "fast",
    "real", "right", "well", "even", "still", "every", "daily",
    "actually", "really",
    # Adjectives / modifiers (fine in "high fiber", useless alone)
    "high", "low", "large", "small", "big", "long", "short",
    "white", "whole", "raw", "fresh", "cold", "hot", "warm",
    "natural", "super", "extra", "regular", "cheap", "slow",
    "picky", "balanced", "complete", "plain", "rich", "healthy",
    "homemade", "crispy", "creamy", "savory", "sweet",
    # Parts that only make sense in compound tags
    "health", "hacks", "store", "discard", "alternatives", "dressing",
    "sheet", "recipe", "recipes", "based", "packed", "loaded",
    # Meta words
    "tips", "guide", "ideas", "ways", "things", "list",
    "make", "get", "need", "help", "keep", "know", "use", "try", "new",
    "without", "vs", "way",
})

CATEGORIES = frozenset({"nutrition", "recipes", "tips"})


def split_camel(text):
    text = re.sub(r'(\d)([A-Z])', r'\1 \2', text)
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    return [w.lower() for w in text.split()]


def is_camel(text):
    return bool(re.search(r'[a-z][A-Z]', text))


def is_content_word(w):
    return w not in STOP_WORDS and len(w) >= 2


def adjacent_content_bigrams(words):
    """Generate bigrams from original word sequence, keeping only pairs
    where both words are content words AND were truly adjacent (no stop
    words removed between them)."""
    results = set()
    for i in range(len(words) - 1):
        a, b = words[i].lower(), words[i + 1].lower()
        if is_content_word(a) and is_content_word(b):
            results.add(f"{a} {b}")
    return results


def adjacent_content_trigrams(words):
    results = set()
    for i in range(len(words) - 2):
        a, b, c = words[i].lower(), words[i + 1].lower(), words[i + 2].lower()
        if is_content_word(a) and is_content_word(b) and is_content_word(c):
            results.add(f"{a} {b} {c}")
    return results


def read_article(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    m = re.match(r'^---\s*\n(.*?)\n---\s*\n?(.*)', content, re.DOTALL)
    if not m:
        return None

    fm_raw = m.group(1)
    body = m.group(2)

    title_m = re.search(r'^title:\s*(.+)$', fm_raw, re.MULTILINE)
    title = title_m.group(1).strip().strip('"').strip("'") if title_m else ""

    cat_m = re.search(r'^category:\s*(\w+)', fm_raw, re.MULTILINE)
    category = cat_m.group(1) if cat_m else "nutrition"

    tags = []
    tags_m = re.search(r'^tags:\s*\n((?:\s*-\s*.+\n)*)', fm_raw, re.MULTILINE)
    if tags_m:
        for line in tags_m.group(1).strip().split("\n"):
            tag = re.sub(r'^\s*-\s*', '', line).strip().strip('"').strip("'")
            if tag:
                tags.append(tag)

    return {
        "fm_raw": fm_raw,
        "body": body,
        "tags": tags,
        "title": title,
        "category": category,
    }


def write_article(filepath, article_data, new_tags):
    fm_raw = article_data["fm_raw"]
    body = article_data["body"]

    new_tags_lines = "\n".join(f"- {t}" for t in new_tags)
    new_tags_block = f"tags:\n{new_tags_lines}\n"

    new_fm = re.sub(
        r'^tags:\s*\n(?:\s*-\s*.+\n)*',
        new_tags_block,
        fm_raw,
        flags=re.MULTILINE,
    )

    with open(filepath, "w", encoding="utf-8", newline="\n") as f:
        f.write(f"---\n{new_fm}\n---\n{body}")


def is_valid_tag(tag):
    words = tag.split()
    if tag in CATEGORIES:
        return False
    if len(words) > 3:
        return False
    if len(tag) < 4:
        return False
    # At least one word must be a "strong" word (not weak and not stop)
    strong = [w for w in words if w not in WEAK_WORDS and w not in STOP_WORDS]
    if not strong:
        return False
    # No purely numeric words
    if any(w.isdigit() for w in words):
        return False
    return True


def generate_candidates(slug, article_data, clusters):
    candidates = set()
    preserved = set()  # natural tags to always keep
    old_tags = article_data["tags"]

    # Source 1: existing natural tags (human-curated, preserve them)
    for tag in old_tags:
        if not is_camel(tag):
            normalized = tag.lower().strip()
            if normalized not in CATEGORIES and 1 <= len(normalized.split()) <= 3 and len(normalized) >= 4:
                preserved.add(normalized)
                candidates.add(normalized)

    # Source 2: CamelCase tags → split and extract adjacent bigrams
    for tag in old_tags:
        if is_camel(tag):
            words = split_camel(tag)
            for bg in adjacent_content_bigrams(words):
                if is_valid_tag(bg):
                    candidates.add(bg)
            for tg in adjacent_content_trigrams(words):
                if is_valid_tag(tg):
                    candidates.add(tg)

    # Source 3: slug → adjacent content bigrams (preserves real word order)
    slug_words = slug.split("-")
    for bg in adjacent_content_bigrams(slug_words):
        if is_valid_tag(bg):
            candidates.add(bg)
    for tg in adjacent_content_trigrams(slug_words):
        if is_valid_tag(tg):
            candidates.add(tg)

    # Source 4: keyword clusters
    if slug in clusters:
        for item in clusters[slug].get("cluster", []):
            kw = item.get("keyword", "")
            words = kw.lower().split()
            for bg in adjacent_content_bigrams(words):
                if is_valid_tag(bg):
                    candidates.add(bg)
            for tg in adjacent_content_trigrams(words):
                if is_valid_tag(tg):
                    candidates.add(tg)

    # Source 5: single strong words from slug (common domain terms)
    for w in slug_words:
        w = w.lower()
        if len(w) >= 5 and w not in STOP_WORDS and w not in WEAK_WORDS:
            candidates.add(w)

    return candidates, preserved


def select_tags(candidates, global_freq, preserved, max_tags=7, min_freq=2):
    # Start with preserved natural tags (human-curated, always kept)
    selected = list(preserved)

    # Add shared generated tags (freq >= 2) to fill remaining slots
    shared = []
    for tag in candidates:
        if tag in preserved:
            continue
        freq = global_freq.get(tag, 0)
        if freq < min_freq:
            continue
        word_count = len(tag.split())
        length_bonus = {2: 3, 3: 1}.get(word_count, 0)
        score = freq * 2 + length_bonus
        shared.append((tag, score))

    shared.sort(key=lambda x: (-x[1], x[0]))
    for tag, _ in shared:
        if len(selected) >= max_tags:
            break
        if tag not in selected:
            selected.append(tag)

    return selected[:max_tags]


def main():
    parser = argparse.ArgumentParser(description="Normalize article tags for SEO tag pages")
    parser.add_argument("--apply", action="store_true", help="Write changes to files (default: dry run)")
    parser.add_argument("--verbose", action="store_true", help="Show all changes")
    parser.add_argument("--min-freq", type=int, default=2, help="Minimum tag frequency (default: 2)")
    args = parser.parse_args()

    clusters = {}
    if os.path.exists(CLUSTERS_FILE):
        with open(CLUSTERS_FILE, "r", encoding="utf-8") as f:
            clusters = json.load(f)
        print(f"Loaded keyword clusters for {len(clusters)} articles")

    # Phase 1: Read all articles and generate candidates
    articles = {}
    all_candidates = {}
    all_preserved = {}

    for filename in sorted(os.listdir(ARTICLES_DIR)):
        if not filename.endswith(".md"):
            continue
        slug = filename[:-3]
        filepath = os.path.join(ARTICLES_DIR, filename)
        data = read_article(filepath)
        if not data:
            continue
        articles[slug] = data
        candidates, preserved = generate_candidates(slug, data, clusters)
        all_candidates[slug] = candidates
        all_preserved[slug] = preserved

    print(f"Processed {len(articles)} articles")

    # Phase 2: Global frequency map (from candidates, not yet selected)
    global_freq = Counter()
    for candidates in all_candidates.values():
        for tag in candidates:
            global_freq[tag] += 1

    # Phase 3: Select final tags per article
    results = {}
    changed = 0
    unchanged = 0
    tag_counts = []

    for slug in sorted(articles.keys()):
        candidates = all_candidates[slug]
        preserved = all_preserved[slug]
        new_tags = select_tags(candidates, global_freq, preserved, max_tags=7, min_freq=args.min_freq)
        old_tags = [t.lower().strip() for t in articles[slug]["tags"]]
        tag_counts.append(len(new_tags))

        if set(new_tags) != set(old_tags):
            changed += 1
            results[slug] = new_tags
            if args.verbose:
                print(f"\n{slug}:")
                print(f"  OLD: {articles[slug]['tags']}")
                print(f"  NEW: {new_tags}")
        else:
            unchanged += 1

    # Stats
    all_final_tags = Counter()
    for slug, tags in results.items():
        for t in tags:
            all_final_tags[t] += 1
    for slug in articles:
        if slug not in results:
            for t in articles[slug]["tags"]:
                all_final_tags[t.lower().strip()] += 1

    total_unique = len(all_final_tags)
    multi_article = sum(1 for c in all_final_tags.values() if c >= 2)
    single_article = sum(1 for c in all_final_tags.values() if c == 1)

    zero_tags = sum(1 for c in tag_counts if c == 0)
    one_to_three = sum(1 for c in tag_counts if 1 <= c <= 3)
    four_plus = sum(1 for c in tag_counts if c >= 4)

    print(f"\n{'='*50}")
    print(f"SUMMARY (min frequency = {args.min_freq})")
    print(f"{'='*50}")
    print(f"Articles changed:    {changed}")
    print(f"Articles unchanged:  {unchanged}")
    print(f"Total unique tags:   {total_unique}")
    print(f"Tags on 2+ articles: {multi_article}")
    print(f"Tags on 1 article:   {single_article}")
    print(f"\nArticles with 0 tags:   {zero_tags}")
    print(f"Articles with 1-3 tags: {one_to_three}")
    print(f"Articles with 4+ tags:  {four_plus}")

    print(f"\nTop 50 tags by article count:")
    for tag, count in all_final_tags.most_common(50):
        print(f"  {count:3d}x  {tag}")

    if not args.apply:
        print(f"\nDRY RUN. Use --apply to write changes.")
        return

    written = 0
    for slug, new_tags in results.items():
        filepath = os.path.join(ARTICLES_DIR, f"{slug}.md")
        write_article(filepath, articles[slug], new_tags)
        written += 1

    print(f"\nWrote {written} files.")


if __name__ == "__main__":
    main()
