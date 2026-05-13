"""Single source of truth for all content rules.

Every banned term, pattern, and structural constraint lives here.
Consumers: lib.validator, lib.prompt_builder, lib.hero_brief, lib.pin_brief.
"""
from __future__ import annotations

EM_DASH = "—"

MEDICAL_TERMS_HARD_BAN: list[str] = [
    "insulin", "cortisol", "serotonin", "dopamine",
    "microbiome", "hormone", "glycemic", "endorphin",
    "melatonin", "estrogen", "testosterone", "thyroid",
    "adrenaline", "norepinephrine", "leptin", "ghrelin",
    "oxytocin", "prolactin", "cytokine", "antioxidant",
]

MEDICAL_TERMS_HEDGE_REQUIRED: list[str] = [
    "blood sugar", "gut health", "bone health",
    "gut bacteria", "blood clotting", "digestibility",
    "blood pressure", "cholesterol", "inflammation",
    "immune system", "metabolism", "digestion",
    "heart health", "brain health", "mental health",
    "anti-inflammatory",
]

HEDGING_WORDS: list[str] = [
    "may", "might", "could", "is thought to",
    "could help", "may support", "might improve",
]

SUPPLEMENT_PATTERNS: list[str] = [
    r"\bprotein\s+powder\b",
    r"\bcollagen\s+(?:powder|peptide)s?",
    r"\bgreens\s+powder\b",
    r"\bfiber\s+powder\b",
    r"\bashwagandha\b",
    r"\bsea\s+moss\b",
    r"\bprobiotic\s+capsules?\b",
    r"\bmultivitamins?\b",
    r"\bpre-?workout\b",
    r"\bfat\s+burners?\b",
    r"\bherbal\s+extracts?\b",
    r"\badaptogens?\b",
]

ABSOLUTE_HEALTH_PATTERNS: list[str] = [
    r"\bcures?\b",
    r"\bheals?\b",
    r"\btreats?\b(?!\s+(?:like|your|yourself))",
    r"\bprevents?\s+(?:cancer|disease|diabetes|illness)\b",
    r"\bfights?\s+(?:cancer|disease|infection)\b",
    r"\bcombats?\s+(?:cancer|disease)\b",
]

DETOX_PATTERNS: list[str] = [
    r"\bdetox(?:es|ing|ify)?\b",
    r"\bcleanse(?:s|d)?\b",
    r"\breset\s+your\s+(?:body|system|gut)\b",
    r"\bflush\s+(?:toxins|your\s+system)\b",
]

AI_WORDS_BANNED: list[str] = [
    "Furthermore", "Moreover", "In conclusion",
    "Delve into", "Dive into",
    "It's important to note", "It is important to note",
    "It's worth noting", "It is worth noting",
    "In today's world", "Unlock", "Elevate", "Navigating",
    "Game-changer", "Game changer", "Revolutionize",
    "Take it to the next level", "Mouthwatering",
]

SIGNOFF_PATTERNS: list[str] = [
    r"\bhappy\s+eating\s*[!.]?",
    r"\benjoy\s*!",
    r"\bbon\s+appetit\s*[!.]?",
    r"\byour\s+(?:gut|body|taste\s+buds|stomach)\s+will\s+thank\s+you",
    r"\byou\s+won'?t\s+regret\s+it",
    r"\bgive\s+it\s+a\s+try\s*!",
    r"\bdig\s+in\s*!",
]

ALLOWED_CATEGORIES: set[str] = {"nutrition", "recipes", "tips"}
ALLOWED_DIFFICULTIES: set[str] = {"Easy", "Medium", "Hard"}
ALLOWED_AUTHOR: str = "David Miller"

REQUIRED_FIELDS: tuple[str, ...] = (
    "title", "excerpt", "category", "tags",
    "image", "date", "author", "faq",
)

RECIPE_REQUIRED_FIELDS: tuple[str, ...] = (
    "ingredients", "steps", "servings", "calories", "difficulty",
    "prepTime", "cookTime", "totalTime",
)
