import sys
import os
import json
import random
from pathlib import Path

sys.path.append(os.getcwd())
from scripts.live_registry_sync import LiveRegistrySync

class Orchestrator:
    def __init__(self):
        self.topics_file = Path("pipeline-data/topics-to-write.md")
        self.registry_file = Path("pipeline-data/live-registry.json")
        self.queue_dir = Path("pipeline-data/topics-queue")
        self.queue_dir.mkdir(parents=True, exist_ok=True)
        
    def _get_category_priority(self):
        """Return categories sorted by count (lowest first) to maintain balance."""
        if not self.registry_file.exists():
            print("Registry missing. Running sync first...")
            LiveRegistrySync().sync()
            
        with open(self.registry_file, "r", encoding="utf-8") as f:
            registry = json.load(f)
            
        counts = registry.get("counts", {})
        valid_counts = {k: v for k, v in counts.items() if k in ["recipes", "nutrition", "tips"]}
        
        if not valid_counts:
            return ["tips", "nutrition", "recipes"]
            
        # Sort categories by their count (ascending)
        sorted_categories = sorted(valid_counts.keys(), key=lambda k: valid_counts[k])
        print(f"Load Balancing Priority: {valid_counts} -> {sorted_categories}")
        return sorted_categories

    def _parse_topics_markdown(self):
        """Parse the markdown file to extract topic data."""
        if not self.topics_file.exists():
            return []
            
        topics = []
        with open(self.topics_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        # Very simple table parser for standard markdown tables.
        # Supports multiple tables in the same markdown file.
        # Supports an optional trailing "Status" column even when the header doesn't include it.
        headers = []
        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Skip markdown separator rows like |----|---|
            if line.startswith("|-") or set(line.replace("|", "").strip()) <= {"-", ":", " "}:
                continue

            # Detect (and reset) headers for each table
            if line.startswith("|"):
                cols = [c.strip() for c in line.strip("|").split("|")]
                cols_l = [c.lower() for c in cols]

                # Header row heuristic
                if "id" in cols_l and "category" in cols_l and "slug" in cols_l:
                    headers = cols_l
                    continue

                if not headers:
                    continue

                values = cols
                if len(values) < len(headers):
                    continue

                base_values = values[: len(headers)]
                extra_values = values[len(headers):]

                topic_data = dict(zip(headers, base_values))

                # If a status column exists but isn't in headers, treat the last extra column as status.
                if "status" not in topic_data and extra_values:
                    topic_data["status"] = extra_values[-1]

                # Normalize/alias common fields
                if "keyword" in topic_data and "topic" not in topic_data:
                    topic_data["topic"] = topic_data["keyword"]

                topics.append(topic_data)
                    
        return topics

    def pick_next_topic(self):
        """Finds the next unwritten topic prioritizing the most needed categories."""
        priority_list = self._get_category_priority()
        topics = self._parse_topics_markdown()
        
        # Load live registry to skip already published articles
        live_registry_file = Path("pipeline-data/live-registry.json")
        live_articles = {}
        if live_registry_file.exists():
            with open(live_registry_file, "r", encoding="utf-8") as f:
                reg_data = json.load(f)
                live_articles = reg_data.get("live_articles", {})
                
        for target_category in priority_list:
            for t in topics:
                if t.get("category", "").lower() == target_category:
                    # Skip completed rows if a status column exists
                    status = (t.get("status") or "").strip().lower()
                    if status in {"completed", "done", "written", "skip", "skipped", "rejected"}:
                        continue

                    slug = t.get('slug', 'missing')
                    
                    # Check 1: Already published?
                    if slug in live_articles:
                        continue
                        
                    # Check 2: Already in processing queue?
                    # Queue is keyed by topic_id (topic_<id>). Match by id if present.
                    raw_id = t.get("id") or t.get("topic_id")
                    if raw_id:
                        queue_file = self.queue_dir / f"topic_{raw_id}.json"
                        if queue_file.exists():
                            continue
                        
                    # Check 3: Already exists locally as markdown?
                    local_file = Path("src/data/articles") / f"{slug}.md"
                    if local_file.exists():
                        continue
                        
                    print(f"Found available topic in category '{target_category}'")
                    return t
                    
            print(f"No available topics found for category '{target_category}'. Trying next.")
            
        return None

if __name__ == "__main__":
    o = Orchestrator()
    next_topic = o.pick_next_topic()
    if next_topic:
        print(f"\nNext Topic Selected:\n{json.dumps(next_topic, indent=2)}")
