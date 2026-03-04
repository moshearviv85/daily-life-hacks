import os
import sys
import json
import time
import argparse
import requests
import re
from urllib.parse import quote_plus
try:
    from pytrends.request import TrendReq
except ImportError:
    TrendReq = None

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "pipeline-data")
CONTENT_TRACKER_FILE = os.path.join(DATA_DIR, "content-tracker.json")
TOPICS_QUEUE_FILE = os.path.join(DATA_DIR, "topics-queue.json")
CLUSTERS_FILE = os.path.join(DATA_DIR, "keyword-clusters.json")
ROUTER_MAPPING_FILE = os.path.join(DATA_DIR, "router-mapping.json")
KV_UPLOAD_FILE = os.path.join(DATA_DIR, "kv-upload.json")
PINS_FILE = os.path.join(DATA_DIR, "pins.json")
ARTICLES_DIR = os.path.join(BASE_DIR, "src", "data", "articles")

BANNED_WORDS = ["cure", "treat", "heal", "disease", "disorder", "syndrome", "cancer", "diabetes", "ibs", "crohn", "detox", "cleanse", "reset", "flush"]

def load_json(filepath, default_val):
    if not os.path.exists(filepath):
        return default_val
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Failed to load {filepath} - {e}")
        return default_val

def save_json(filepath, data):
    tmp = filepath + ".tmp"
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp, filepath)
    except Exception as e:
        print(f"Error writing {filepath}: {e}")

def get_base_query(slug):
    return slug.replace("-", " ")

def get_autocomplete(query):
    encoded = quote_plus(query)
    url = f"https://suggestqueries.google.com/complete/search?client=firefox&q={encoded}&hl=en&gl=us"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if len(data) > 1 and isinstance(data[1], list):
            return data[1]
    except Exception as e:
        print(f"Warning: Autocomplete failed for {query} - {e}")
    return []

def filter_candidates(candidates, base_query):
    filtered = []
    base_clean = base_query.lower()
    for c in candidates:
        c_clean = c.lower()
        if len(c_clean) < 25 or len(c_clean) > 70:
            continue
        if c_clean == base_clean:
            continue
        has_banned = any(b in c_clean.split() for b in BANNED_WORDS)
        for b in ["ibs", "crohns"]:
             if b in c_clean:
                 has_banned = True
        for b in ["cure", "treat", "heal", "disease", "cancer", "diabetes", "detox", "cleanse", "flush"]:
             if b in c_clean:
                 has_banned = True
        if has_banned:
            continue
        filtered.append(c)
    
    # Deduplicate while preserving order
    seen = set()
    result = []
    for c in filtered:
        if c not in seen:
            seen.add(c)
            result.append(c)
    return result[:10]

def score_candidates_pytrends(candidates):
    if not TrendReq:
        print("PyTrends not installed, assigning fallback scores")
        return list(zip(candidates, range(60, 60 - len(candidates) * 10, -10)))
        
    pytrends = TrendReq(hl='en-US', tz=360)
    scores = {}
    
    # Pytrends allows max 5 keywords per request
    batches = [candidates[i:i + 5] for i in range(0, len(candidates), 5)]
    
    for batch in batches:
        try:
            pytrends.build_payload(batch, timeframe='today 12-m', geo='US')
            data = pytrends.interest_over_time()
            if not data.empty:
                for kw in batch:
                    if kw in data.columns:
                        scores[kw] = data[kw].mean()
                    else:
                        scores[kw] = 0
            else:
                for kw in batch:
                    scores[kw] = 0
            time.sleep(2)
        except Exception as e:
            if "429" in str(e):
                print("PyTrends 429 quota hit, waiting 60s...")
                time.sleep(60)
                try:
                    pytrends.build_payload(batch, timeframe='today 12-m', geo='US')
                    data = pytrends.interest_over_time()
                    if not data.empty:
                        for kw in batch:
                            if kw in data.columns:
                                scores[kw] = data[kw].mean()
                            else:
                                scores[kw] = 0
                except Exception as e2:
                    print(f"PyTrends failed again on {batch}, using 0 score.")
                    for kw in batch:
                        scores[kw] = 0
            else:
                print(f"PyTrends error: {e}")
                for kw in batch:
                    scores[kw] = 0

    results = []
    for i, kw in enumerate(candidates):
        # Tie break with original order if score is 0
        score = scores.get(kw, 0)
        if score == 0:
            score = 10 - i # give slight edge to earlier autocomplete results
        results.append((kw, score))
        
    results.sort(key=lambda x: x[1], reverse=True)
    return results

def make_slug(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9 ]', '', text)
    return re.sub(r'\s+', '-', text.strip())

def make_title_case(text):
    lower_words = {"for", "to", "the", "a", "an", "of", "in", "on", "with", "and", "but", "or"}
    words = text.split()
    capitalized = []
    for i, w in enumerate(words):
        if i == 0 or i == len(words) - 1 or w.lower() not in lower_words:
            capitalized.append(w.capitalize())
        else:
            capitalized.append(w.lower())
    title = " ".join(capitalized)
    
    # Truncate to 60 chars at word boundary
    if len(title) > 60:
        words = title.split()
        short_title = ""
        for w in words:
            if len(short_title) + len(w) + 1 > 60:
                break
            short_title += w + " "
        title = short_title.strip()
    return title

def determine_category(slug, tracker_data, pins_data, base_query):
    # Check tracker
    for item in tracker_data:
        if item.get("slug") == slug and "category" in item:
            return item["category"]
    
    # Check pins
    for item in pins_data:
        if item.get("slug") == slug and "category" in item:
            return item["category"]
            
    # Infer
    recipe_words = ["recipe", "meal", "cook", "bake", "smoothie", "bowl", "dinner", "lunch", "breakfast", "snack"]
    base_lower = base_query.lower()
    if any(w in base_lower for w in recipe_words):
        return "recipes"
    return "nutrition"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Reprocess all slugs")
    parser.add_argument("--existing-only", action="store_true", help="Skip topics-queue.json, only existing articles")
    args = parser.parse_args()

    # Load data
    tracker_data = load_json(CONTENT_TRACKER_FILE, [])
    pins_data = load_json(PINS_FILE, [])
    clusters = load_json(CLUSTERS_FILE, {})
    router_map = load_json(ROUTER_MAPPING_FILE, {})
    topics_queue = load_json(TOPICS_QUEUE_FILE, []) if not args.existing_only else []
    
    # Collect slugs to process
    slugs_to_process = []
    
    # 1. Existing articles
    for item in tracker_data:
        slug = item.get("slug")
        if not slug: continue
        article_path = os.path.join(ARTICLES_DIR, f"{slug}.md")
        if os.path.exists(article_path):
            slugs_to_process.append({"slug": slug, "existing": True})
            
    # 2. New Topics
    for topic in topics_queue:
        slug = make_slug(topic)
        # Avoid duplicates
        if not any(s["slug"] == slug for s in slugs_to_process):
            slugs_to_process.append({"slug": slug, "existing": False})
            
    total = len(slugs_to_process)
    
    kv_upload_data = []

    for idx, item in enumerate(slugs_to_process, 1):
        slug = item["slug"]
        existing = item["existing"]
        
        print(f"\n[{idx}/{total}] {slug}")
        
        # Check if already researched
        if not args.force and slug in clusters and clusters[slug].get("status") == "researched":
            print("  Already researched. Skipping.")
            continue
            
        base_query = get_base_query(slug)
        
        # B: Autocomplete
        cands = set()
        for variant in [base_query, base_query + " for", base_query + " to"]:
            cands.update(get_autocomplete(variant))
            time.sleep(1)
            
        cands_list = list(cands)
        print(f"  Autocomplete: {len(cands_list)} candidates found")
        
        # C: Filter
        filtered = filter_candidates(cands_list, base_query)
        print(f"  After filter: {len(filtered)} remain")
        
        if not filtered:
            print("  No candidates left. Skipping.")
            continue
            
        # D: PyTrends
        if len(filtered) < 4:
            scores = [(c, 60 - i*10) for i, c in enumerate(filtered)]
        else:
            scores = score_candidates_pytrends(filtered)
            
        top_4 = scores[:4]
        print("  PyTrends: scored and sorted")
        top_info = " | ".join([f'"{c[0]}" ({c[1]:.1f})' for c in top_4])
        print(f"  Top: {top_info}")
        
        # Build cluster output
        category = determine_category(slug, tracker_data, pins_data, base_query)
        
        cluster_list = []
        variant_mapping = {}
        
        for i, (kw, score) in enumerate(top_4, 1):
            v_num = f"v{i}"
            url_slug = make_slug(kw)
            title = make_title_case(kw)
            
            cluster_list.append({
                "keyword": kw,
                "url_slug": url_slug,
                "trend_score": round(score, 1),
                "variant": v_num
            })
            
            variant_mapping[v_num] = {
                "url_slug": url_slug,
                "title": title
            }
            
        clusters[slug] = {
            "base_query": base_query,
            "category": category,
            "cluster": cluster_list,
            "existing_article": existing,
            "status": "researched",
            "researched_at": time.strftime("%Y-%m-%dT%H:%M:%S")
        }
        
        router_map[slug] = variant_mapping
        
        # Save incrementally
        save_json(CLUSTERS_FILE, clusters)
        save_json(ROUTER_MAPPING_FILE, router_map)
        print("  Saved.")
        
    # Rebuild full kv_upload array based on the COMPLETE router_map
    for map_slug, variants in router_map.items():
        for v_num, v_data in variants.items():
            kv_upload_data.append({
                "key": v_data["url_slug"],
                "value": json.dumps({"type": "internal", "base_slug": map_slug})
            })
            
    save_json(KV_UPLOAD_FILE, kv_upload_data)
    print("\nAll done. Created/Updated kv-upload.json")

if __name__ == "__main__":
    main()
