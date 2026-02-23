import os
import requests
import json

from dotenv import load_dotenv
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = "gemini-2.5-flash"

SYSTEM_PROMPT = """You are a food and nutrition blogger writing for Daily Life Hacks (daily-life-hacks.com), a site for healthy American adults interested in high-fiber eating.

EXTREME ANTI-AI DETECTION RULES (CRITICAL):
Your output is being tested by GPTZero. To pass as human, you must NOT write like a typical LLM. 
1. BAN LIST - You are FORBIDDEN from using these words/phrases: 
   "game-changer", "powerhouse", "let's be real", "enter the", "whether you", "look no further", "the secret to", "it's no secret", "delve into", "moreover", "furthermore", "in conclusion", "it's important to note", "crucial", "testament", "tapestry", "symphony", "unlock", "elevate", "bursting with", "game changing", "superfood", "guilt-free", "a staple", "I was skeptical at first".
2. STRUCTURE: Do not use the typical "Hook -> My experience -> 3 Reasons Why -> The Recipe -> Conclusion" structure. AI always uses this. Start directly with a weird or highly specific thought. 
3. SENTENCE FLOW (BURSTINESS): Force yourself to write terribly disjointed sentences. Put a 1-word sentence. Then a 30-word run-on sentence that feels a bit rambling. Then a normal sentence. 
4. TONE: Write as if you are slightly distracted and just talking out loud to a friend while cooking. Be a little messy. Use parentheses to interrupt yourself abruptly. Use some 90s/2000s slang or Gen-Z slang ironically.
5. NEVER do a "wrapping up" paragraph. Just end the post abruptly after the last tip. No "Enjoy!" or "Happy cooking!".

RECIPE ARTICLES must include:
- Exact ingredient measurements (cups, tablespoons, etc.)
- Exact temperatures and cooking times
- Realistic calorie counts and fiber grams per serving
- Step-by-step instructions

OUTPUT FORMAT:
- Start with YAML frontmatter between --- markers
- Then the article body in Markdown (## for H2, ### for H3)
- Frontmatter must follow this exact schema (see below)"""

PROMPT_1 = """Article 1: Recipe - Crispy Roasted Chickpeas (Pin #14)

Frontmatter Template:
---
title: "Crispy Roasted Chickpeas High Fiber Snack"
excerpt: "[Write 1-2 sentences, engaging, include keyword]"
category: "recipes"
tags: ["Chickpeas", "HighFiberSnack", "PlantProtein", "HealthyChips", "VeganSnack"]
image: "/images/crispy-roasted-chickpeas-high-fiber-snack_v1.jpg"
imageAlt: "Crispy Roasted Chickpeas High Fiber Snack - golden crunchy chickpeas in a bowl with seasoning"
date: 2026-02-22
featured: false
editorsPick: false
whatsHot: false
mustRead: false
prepTime: "5 minutes"
cookTime: "25 minutes"
totalTime: "30 minutes"
servings: 4
calories: 130
difficulty: "Easy"
ingredients:
  - "[fill: exact measurements for base recipe]"
steps:
  - "[fill: step-by-step instructions]"
---

Content Brief:
Write a recipe article for crispy roasted chickpeas as a high-fiber snack. ONE main recipe with exact measurements: canned chickpeas, olive oil, salt, smoked paprika, garlic powder. 400°F for 25-30 min. Add 5 seasoning variations: Ranch, BBQ, Cinnamon Sugar, Everything Bagel, Chili Lime. Include tips for getting them truly crispy (dry thoroughly, single layer, don't overcrowd). Nutrition per serving (~130 cal, 6g fiber). Storage tips (stay crispy 3 days in open container).

Key Points to Cover:
- One base recipe with exact quantities
- 5 seasoning variations with measurements
- Crispiness tips (this is what people struggle with)
- Nutrition per serving
- Storage advice

Minimum: 800 words. Write as much as the topic genuinely needs - don't pad, don't cut short."""

PROMPT_2 = """Article 2: Nutrition - Popcorn vs Potato Chips (Pin #45)

Frontmatter Template:
---
title: "Popcorn vs Potato Chips Fiber Comparison"
excerpt: "[Write 1-2 sentences, engaging, include keyword]"
category: "nutrition"
tags: ["HealthySwaps", "SnackSmart", "HighFiber", "WeightLossHacks", "JunkFoodAlternative"]
image: "/images/popcorn-vs-potato-chips-fiber-comparison_v1.jpg"
imageAlt: "Popcorn vs Potato Chips Fiber Comparison - side by side bowls of popcorn and chips"
date: 2026-02-22
featured: false
editorsPick: false
whatsHot: false
mustRead: false
---

Content Brief:
Write a fun nutrition comparison: Popcorn vs Potato Chips. Compare per standard serving: popcorn (3 cups air-popped: 93 cal, 3.5g fiber, 1g fat) vs chips (1 oz/15 chips: 152 cal, 1g fiber, 10g fat). Cover: fiber, calories, fat, sodium, volume (you get way more popcorn). Include a comparison table in markdown. Why popcorn is a whole grain. Best and worst ways to eat popcorn (air-popped best, movie theater worst). The volume advantage: 3 cups vs 15 chips for similar satisfaction.

Key Points to Cover:
- Side-by-side comparison table (markdown table format)
- Volume advantage (this is the killer argument)
- Popcorn as a whole grain (most people don't know this)
- Best vs worst popcorn preparation methods
- Fun, non-judgmental tone

Minimum: 800 words. Write as much as the topic genuinely needs - don't pad, don't cut short."""

def call_gemini(prompt):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={API_KEY}"
    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.85,
            "topP": 0.95
        }
    }
    
    try:
        res = requests.post(url, json=payload)
        res.raise_for_status()
        text = res.json().get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', "")
        
        # Clean up markdown
        text = text.strip()
        if text.startswith("```markdown"): text = text[11:]
        elif text.startswith("```yaml"): text = text[7:]
        elif text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
            
        return text.strip()
    except Exception as e:
        print(f"Error: {e}")
        if hasattr(e, 'response') and e.response:
            print(e.response.text)
        return None

print("Generating Article 1: Crispy Roasted Chickpeas...")
art1 = call_gemini(PROMPT_1)
if art1:
    with open("src/data/articles/crispy-roasted-chickpeas-high-fiber-snack.md", "w", encoding="utf-8") as f:
        f.write(art1)
    print("Saved Article 1.")

print("\nGenerating Article 2: Popcorn vs Potato Chips...")
art2 = call_gemini(PROMPT_2)
if art2:
    with open("src/data/articles/popcorn-vs-potato-chips-fiber-comparison.md", "w", encoding="utf-8") as f:
        f.write(art2)
    print("Saved Article 2.")
