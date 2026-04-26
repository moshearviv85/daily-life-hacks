import os
import json
import xml.etree.ElementTree as ET
import requests
from pathlib import Path

class LiveRegistrySync:
    def __init__(self, sitemap_url="https://www.daily-life-hacks.com/sitemap-0.xml"):
        self.sitemap_url = sitemap_url
        self.articles_dir = Path("src/data/articles")
        self.registry_file = Path("pipeline-data/live-registry.json")
        
    def _get_local_article_category(self, slug):
        """Parse the frontmatter of a local markdown file to find its category."""
        file_path = self.articles_dir / f"{slug}.md"
        if not file_path.exists():
            return "unknown"
            
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                # Very basic YAML frontmatter extraction
                if "category:" in content:
                    for line in content.splitlines():
                        if line.startswith("category:"):
                            return line.split(":")[1].strip().strip('"').strip("'")
        except Exception:
            pass
        return "unknown"

    def fetch_live_slugs(self):
        """Fetch the sitemap and extract all slugs."""
        print(f"Fetching sitemap from {self.sitemap_url}...")
        try:
            response = requests.get(self.sitemap_url, timeout=30)
            if response.status_code == 404:
                # Try fallback to standard sitemap.xml
                print("sitemap-0.xml not found. Trying sitemap.xml...")
                self.sitemap_url = "https://www.daily-life-hacks.com/sitemap.xml"
                response = requests.get(self.sitemap_url, timeout=30)
                
            response.raise_for_status()
            
            # Parse XML
            root = ET.fromstring(response.content)
            # Handle XML namespaces: {http://www.sitemaps.org/schemas/sitemap/0.9}url
            namespaces = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
            
            urls = []
            for url_node in root.findall('sm:url/sm:loc', namespaces):
                urls.append(url_node.text)
                
            # If namespaces fail, try without
            if not urls:
                for loc in root.iter('loc'):
                    urls.append(loc.text)
                    
            # Extract slugs from URLs (assuming standard URL structure)
            slugs = []
            for url in urls:
                # Remove trailing slash
                url = url.rstrip('/')
                slug = url.split('/')[-1]
                # Filter out standard pages like /about, /contact, etc.
                if slug not in ['about', 'contact', 'disclaimer', 'privacy-policy', 'terms']:
                    slugs.append(slug)
                    
            print(f"Found {len(slugs)} live URLs in sitemap.")
            return slugs
            
        except Exception as e:
            print(f"Failed to fetch sitemap: {e}")
            return []

    def sync(self):
        live_slugs = self.fetch_live_slugs()
        
        registry = {
            "last_sync": "never",
            "counts": {
                "recipes": 0,
                "nutrition": 0,
                "tips": 0,
                "unknown": 0
            },
            "live_articles": {}
        }
        
        if not live_slugs:
            print("Warning: No live slugs found. Registry will be empty.")
            return registry
            
        # Map categories
        for slug in live_slugs:
            category = self._get_local_article_category(slug)
            
            registry["live_articles"][slug] = {
                "category": category,
                "status": "published"
            }
            
            if category in registry["counts"]:
                registry["counts"][category] += 1
            else:
                registry["counts"]["unknown"] += 1
                
        # Add metadata
        from datetime import datetime, timezone
        registry["last_sync"] = datetime.now(timezone.utc).isoformat()
        
        # Save registry
        self.registry_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.registry_file, "w", encoding="utf-8") as f:
            json.dump(registry, f, indent=2)
            
        print(f"Sync complete. Registry saved to {self.registry_file}")
        print(f"Current Live Balances: {registry['counts']}")
        return registry

if __name__ == "__main__":
    sync = LiveRegistrySync()
    sync.sync()
