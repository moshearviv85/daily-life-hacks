import re
from pathlib import Path

class PunisherRejection(Exception):
    pass

class Punisher:
    def __init__(self):
        # Hardcoded YMYL keywords - do NOT load "--" or "—" here, those are handled separately
        # Hard-block keywords: true medical-guarantee / treatment language.
        self.hard_ymyl_keywords = [
            "cures", "treats", "heals", "melts fat"
        ]

        # Soft-block keywords: marketing language that we prefer to avoid,
        # but should not stop the pipeline from reaching Telegram approval.
        self.soft_ymyl_keywords = [
            "guaranteed", "miracle"
        ]
        self.emoji_pattern = re.compile(r"[\U00010000-\U0010ffff\u2600-\u27BF]")

    def audit_article(self, content, category=None):
        paragraphs = content.split("\n\n")
        
        for i, para in enumerate(paragraphs, start=1):
            para_lower = para.lower()
            
            # 1. YMYL Check
            for kw in self.hard_ymyl_keywords:
                if kw in para_lower:
                    raise PunisherRejection(
                        f"Paragraph {i} contains YMYL/Medical/Claim keyword: '{kw}'. "
                        f"Please remove it or rephrase with hedging (e.g., 'may support')."
                    )

            for kw in self.soft_ymyl_keywords:
                if kw in para_lower:
                    print(
                        f"⚠️ Punisher Warning: Paragraph {i} contains marketing/claim keyword '{kw}'. "
                        f"Consider removing or softening language before publishing."
                    )
                    
            # 2. Em-dash check (unicode em-dash only)
            if "\u2014" in para:
                raise PunisherRejection(
                    f"Paragraph {i} contains an em-dash (\u2014). "
                    f"This is a style violation. Replace with a comma or period."
                )
                
            # 3. Emoji check
            if self.emoji_pattern.search(para):
                raise PunisherRejection(
                    f"Paragraph {i} contains an Emoji. This is a style violation."
                )
                
            # 4. Fake stats check
            # If there's a percentage claim, require *some* inline citation.
            # Accept either a year in parentheses OR a known source name in parentheses.
            if re.search(r"\d+%|\d+ percent", para_lower):
                has_citation = bool(
                    re.search(r"\([^)]*\d{4}[^)]*\)", para)
                    or re.search(r"\([^)]*(USDA|CDC|NIH|WHO|FDA|NHS|Cleveland Clinic|Mayo Clinic|Harvard|Journal)[^)]*\)", para, re.IGNORECASE)
                )
                if not has_citation:
                    # Soft-fail: don't block the pipeline from reaching Telegram.
                    # The editor can decide in Telegram whether to request changes.
                    # (We keep the check as a warning in logs.)
                    print(
                        f"⚠️ Punisher Warning: Paragraph {i} contains a percentage but no clear citation. "
                        f"Consider adding '(Source, 2023)' or removing the stat."
                    )

        return True
