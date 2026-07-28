import os
import random
import json
from pathlib import Path
import sys

# Add root to sys.path if not there so we can import scripts
sys.path.append(os.getcwd())

class ImageGenerationError(Exception):
    pass

class ImageEngine:
    """
    A dumb engine that just takes text inputs and calls the actual image generation APIs 
    via the existing scripts.
    """
    def __init__(self):
        self.scenes_path = Path("pipeline-data/image-scenes.json")
        self.scenes = []
        if self.scenes_path.exists():
            with open(self.scenes_path, "r", encoding="utf-8") as f:
                self.scenes = json.load(f)
                
    def _get_scene(self):
        return random.choice(self.scenes) if self.scenes else "Beautiful realistic setting"

    def generate_all_images(self, topic_id, slug, title, main_alt, pins_data):
        # We import the functions from the existing scripts dynamically
        # to ensure we don't break if they have heavy dependencies that fail on init
        try:
            import scripts.generate_site_media as site_media
            import scripts.generate_pinterest_pins as pin_media
        except ImportError as e:
            raise ImageGenerationError(f"Could not import existing image scripts: {e}")
            
        # Create directories if they don't exist
        os.makedirs("public/images", exist_ok=True)
        os.makedirs("public/images/video", exist_ok=True)
        os.makedirs("public/images/ingredients", exist_ok=True)
        os.makedirs("public/images/pins", exist_ok=True)

        # 1. Main image (16:9)
        scene = self._get_scene()
        main_prompt = f"{title}, {scene}. Realistic food photography, beautifully plated finished dish. No text, no words, no watermarks."
        main_path = f"public/images/{slug}-main.jpg"
        
        # Only generate if missing or wrong orientation
        if site_media.need_regen(main_path, want_landscape=True):
            status = site_media.call_api(main_prompt, main_path, "16:9")
            if status != "SUCCESS":
                raise ImageGenerationError(f"Failed to generate main image: {status}")
            
        # 2. Video background (9:16)
        video_scene = self._get_scene()
        video_prompt = f"{title}, {video_scene}. Vertical cinematic food photography for a short-form video background. Portrait orientation. No text, no words, no watermarks."
        video_path = f"public/images/video/{slug}-video.jpg"
        
        if site_media.need_regen(video_path, want_landscape=False):
            status = site_media.call_api(video_prompt, video_path, "9:16")
            if status != "SUCCESS":
                raise ImageGenerationError(f"Failed to generate video image: {status}")
            
        # 3. Ingredients (16:9)
        ing_prompt = f"Raw fresh ingredients for {title}, {scene}. Realistic food photography, overhead or slight-angle flat-lay, ingredients spread beautifully, no cooked food. No text, no words, no watermarks."
        ing_path = f"public/images/ingredients/{slug}-ingredients.jpg"
        
        if site_media.need_regen(ing_path, want_landscape=True):
            status = site_media.call_api(ing_prompt, ing_path, "16:9")
            if status != "SUCCESS":
                raise ImageGenerationError(f"Failed to generate ingredients image: {status}")
            
        # 4. Pinterest Pins (3:4)
        for i, pin in enumerate(pins_data, start=1):
            pin_title = pin.get("title", title)
            pin_alt = pin.get("alt", main_alt)
            pin_scene = self._get_scene()
            pin_path = f"public/images/pins/{slug}_v{i}.jpg"
            label = f"{slug}_v{i}"
            
            # Check if it needs regeneration (generate_pin handles retry logic)
            if not os.path.exists(pin_path) or not pin_media.is_portrait(pin_path):
                status = pin_media.generate_pin(pin_title, pin_alt, pin_scene, i, pin_path, label)
                if status != "SUCCESS":
                    raise ImageGenerationError(f"Failed to generate pin {i}: {status}")

        return True
