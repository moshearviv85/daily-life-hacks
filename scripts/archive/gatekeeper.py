import re
import os
from pathlib import Path

class GatekeeperRejection(Exception):
    pass

class Gatekeeper:
    def __init__(self, articles_dir="src/data/articles"):
        self.articles_dir = Path(articles_dir)
        
        # We define strict YMYL and medical keywords
        self.ymyl_keywords = [
            "cure", "heal", "medical", "medicine", "weight loss", "detox", 
            "migraine", "disease", "treatment", "therapy", "doctor"
        ]
        
    def slugify(self, text):
        """Very basic slugify for dedupe check."""
        text = text.lower()
        text = re.sub(r'[^a-z0-9\s-]', '', text)
        return re.sub(r'[\s-]+', '-', text).strip('-')

    def check_topic(self, topic):
        # 1. Length Check
        if len(topic) > 200:
            raise GatekeeperRejection(f"Topic is too long ({len(topic)} chars). Max is 200.")

        # 2. YMYL / Medical Check
        topic_lower = topic.lower()
        for kw in self.ymyl_keywords:
            if kw in topic_lower:
                raise GatekeeperRejection(f"Policy Violation: YMYL/Medical keyword '{kw}' found in topic.")

        # 3. Emoji Check (Simple heuristic: catch characters outside standard alphanumeric and basic punctuation)
        # We allow Hebrew and English letters, numbers, and standard punctuation.
        emoji_pattern = re.compile(r'[\U00010000-\U0010ffff\u2600-\u27BF]')
        if emoji_pattern.search(topic):
            raise GatekeeperRejection("Policy Violation: Emojis are not allowed.")

        # 4. Dedupe Check
        slug = self.slugify(topic)
        if self.articles_dir.exists():
            for file_path in self.articles_dir.glob("*.md"):
                if file_path.stem == slug:
                    raise GatekeeperRejection(f"Duplicate Error: Topic slug '{slug}' already exists.")

        return True
