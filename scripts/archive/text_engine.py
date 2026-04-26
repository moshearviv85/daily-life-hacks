import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv
import time # Add time for backoff
import random # Add random for jitter

load_dotenv(override=True)

class TextGenerationError(Exception):
    pass

class TextEngine:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = "gemini-2.5-pro"
        
        # We use the correct v1beta endpoint for Gemini
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        
        self.voice_path = Path(".cursor/skills/david-miller-voice/SKILL.md")
        
    def _build_system_instruction(self, category):
        instructions_path = Path(f"pipeline-data/instructions-{category}.md")
        inst = instructions_path.read_text(encoding="utf-8") if instructions_path.exists() else ""
        voice = self.voice_path.read_text(encoding="utf-8") if self.voice_path.exists() else ""
        
        return f"""You are an expert content writer for Daily Life Hacks. 
Follow these instructions strictly.

{inst}

VOICE AND TONE INSTRUCTIONS:
{voice}

You must return ONLY a raw JSON object with the following structure. Do not use markdown wrappers like ```json.
{{
  "article_markdown": "The full article text including YAML frontmatter as required",
  "main_image_alt": "A descriptive alt text for the main article image",
  "pins": [
    {{"title": "Catchy short title for pin 1", "alt": "Alt text describing the pin 1 image"}},
    {{"title": "Catchy short title for pin 2", "alt": "Alt text describing the pin 2 image"}},
    {{"title": "Catchy short title for pin 3", "alt": "Alt text describing the pin 3 image"}},
    {{"title": "Catchy short title for pin 4", "alt": "Alt text describing the pin 4 image"}},
    {{"title": "Catchy short title for pin 5", "alt": "Alt text describing the pin 5 image"}}
  ]
}}
"""

    def generate_text_package(self, topic_id, topic, category):
        if not self.api_key:
            raise TextGenerationError("GEMINI_API_KEY is missing from .env or environment variables.")
            
        system_instruction = self._build_system_instruction(category)
        
        prompt = f"Write a full article for the topic: '{topic}'. Category is: '{category}'. Topic ID: {topic_id}.\nCRITICAL: The article MUST be between 750 and 850 words long. Do not aim for an exact number, but stay strictly within this natural range."
        
        payload = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": [
                {"role": "user", "parts": [{"text": prompt}]}
            ],
            "generationConfig": {
                "temperature": 0.7,
                "responseMimeType": "application/json"
            }
        }
        # Implement Retry logic with Exponential Backoff
        max_retries = 3
        initial_delay = 5  # seconds

        for attempt in range(max_retries):
            try:
                response = requests.post(self.api_url, json=payload, timeout=180)
                response.raise_for_status() # Raise an exception for HTTP errors
                data = response.json()
                
                # Attempt to parse the JSON, handling common LLM formatting issues
                content_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                if content_text.startswith("```json"):
                    content_text = content_text.split("```json", 1)[1]
                if content_text.endswith("```"):
                    content_text = content_text.rsplit("```", 1)[0]
                content_text = content_text.strip()

                try:
                    return json.loads(content_text)
                except json.JSONDecodeError as e:
                    if "Extra data" in str(e) and content_text.endswith("}"):
                        # Gemini sometimes hallucinates an extra closing brace
                        content_text = content_text[:-1].strip()
                        return json.loads(content_text)
                    raise e

            except requests.exceptions.Timeout:
                print(f"Attempt {attempt+1}/{max_retries}: Gemini API timed out.")
                if attempt < max_retries - 1:
                    time.sleep(initial_delay * (2 ** attempt) + random.uniform(0, 1))
                else:
                    raise TextGenerationError("Gemini API timed out after multiple retries.")
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 429:
                    print(f"Attempt {attempt+1}/{max_retries}: Rate limit hit (429). Retrying...")
                    if attempt < max_retries - 1:
                        time.sleep(initial_delay * (2 ** attempt) + random.uniform(0, 1))
                    else:
                        raise TextGenerationError("Gemini API rate limit exceeded after multiple retries.")
                else:
                    raise TextGenerationError(f"API Error {e.response.status_code}: {e.response.text}")
            except (KeyError, IndexError, json.JSONDecodeError) as e:
                print(f"Attempt {attempt+1}/{max_retries}: Failed to parse LLM response into JSON: {e}")
                if attempt < max_retries - 1:
                    time.sleep(initial_delay * (2 ** attempt) + random.uniform(0, 1))
                else:
                    raise TextGenerationError(f"Failed to parse LLM response into JSON after multiple retries: {e}. Raw response: {data}")
            except Exception as e:
                raise TextGenerationError(f"Network or unexpected error calling Gemini: {e}")
        return None # Should not be reached
