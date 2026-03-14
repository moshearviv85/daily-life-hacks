import json
import os
import sys
import datetime
import random

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRACKER_PATH = os.path.join(BASE_DIR, 'pipeline-data', 'content-tracker.json')
SITE_URL = "https://www.daily-life-hacks.com"

# In Kit (ConvertKit), you set up a visual Template with your logo and footer.
# You grab that Template ID. When you send a Broadcast via API, you send the `content` (HTML) 
# and tell Kit which `template_id` to wrap it in.
KIT_API_SECRET = os.environ.get('KIT_API_SECRET', '') 
KIT_TEMPLATE_ID = "" # e.g., '1234567'

# --- TONE-ACCURATE CONTENT BANKS (NO EM DASHES) ---
INTROS = [
    "Another day, another attempt to figure out what is for dinner without losing your mind.",
    "I survived another trip to the grocery store. Here is what we are actually cooking this week.",
    "You have to eat today. Might as well make it something that does not taste like cardboard.",
    "Welcome to today's edition of 'what is in the fridge and how do I make it edible'.",
    "Nobody wants to spend three hours cooking on a Tuesday. We fixed that.",
    "Good morning. Let us talk about food that does not require a spiritual journey to prepare.",
    "Cooking at home is already a project. We are keeping it extremely simple today.",
    "We skipped the five page backstory today. Here is what you need to know."
]

OUTROS = [
    "If you made it this far, you have more patience than I do. See you tomorrow.",
    "Go eat something good. Do not overthink it.",
    "That is all for today. Try not to burn the garlic.",
    "I am going to go clean the one pan I used for this. Talk tomorrow.",
    "Keep it simple, keep it sane. Have a decent day.",
    "Do not let anyone tell you that you need twenty ingredients for a good meal. Catch you tomorrow.",
    "Save the complicated stuff for a restaurant. Go make this instead."
]

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def clean_text(text):
    """Ensure no em dashes or weird characters make it into the email."""
    if not text:
        return ""
    text = text.replace("—", "-").replace("–", "-")
    return text

def build_email_content(today_art, tomorrow_art):
    """
    Builds the inner HTML content that will be injected into the Kit Template.
    Kit handles the header, logo, and footer. We just supply the body.
    """
    intro = random.choice(INTROS)
    outro = random.choice(OUTROS)
    
    # Today's data
    t_url = f"{SITE_URL}/{today_art['slug']}?utm_source=kit_newsletter&utm_medium=email&utm_campaign=daily_release"
    t_title = clean_text(today_art.get('title', today_art.get('pin_title', 'New Article')))
    t_teaser = clean_text(today_art.get('email_teaser', ''))
    t_img = today_art.get('image_web', '')
    t_img_url = f"{SITE_URL}{t_img}" if t_img.startswith('/') else f"{SITE_URL}/{t_img}"

    # Tomorrow's data
    tom_url = f"{SITE_URL}/{tomorrow_art['slug']}?utm_source=kit_newsletter&utm_medium=email&utm_campaign=early_access"
    tom_title = clean_text(tomorrow_art.get('title', tomorrow_art.get('pin_title', 'Upcoming Article')))
    tom_teaser = clean_text(tomorrow_art.get('email_teaser', ''))
    tom_img = tomorrow_art.get('image_web', '')
    tom_img_url = f"{SITE_URL}{tom_img}" if tom_img.startswith('/') else f"{SITE_URL}/{tom_img}"

    html = f"""
<p style="font-size: 16px; color: #374151; line-height: 1.6; font-family: sans-serif;">{intro}</p>

<h2 style="margin-top: 24px; margin-bottom: 12px; font-family: sans-serif;">
  <a href="{t_url}" style="color: #F29B30; text-decoration: none;">{t_title}</a>
</h2>

<a href="{t_url}" style="display: block; margin-bottom: 16px;">
  <img src="{t_img_url}" alt="{t_title}" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px; display: block;">
</a>

<p style="font-size: 16px; color: #374151; line-height: 1.6; font-family: sans-serif; margin-bottom: 16px;">
  {t_teaser}
</p>

<p style="margin-bottom: 40px; font-family: sans-serif;">
  <a href="{t_url}" style="font-weight: bold; color: #F29B30; text-decoration: none; font-size: 16px;">Read the full post &rarr;</a>
</p>

<!-- Divider -->
<hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;">

<!-- Tomorrow Section -->
<p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; font-family: sans-serif; margin-bottom: 8px;">
  Coming Tomorrow (Early Access):
</p>

<h3 style="margin-top: 0; margin-bottom: 12px; font-size: 18px; font-family: sans-serif;">
  <a href="{tom_url}" style="color: #111827; text-decoration: none;">{tom_title}</a>
</h3>

<a href="{tom_url}" style="display: block; margin-bottom: 12px;">
  <img src="{tom_img_url}" alt="{tom_title}" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px; display: block;">
</a>

<p style="font-size: 14px; color: #4b5563; line-height: 1.5; font-family: sans-serif; margin-bottom: 32px;">
  {tom_teaser}
</p>

<!-- Divider -->
<hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;">

<p style="font-size: 16px; color: #374151; font-style: italic; font-family: sans-serif;">{outro}</p>
"""
    return html

def schedule_broadcast_in_kit(subject, html_content, publish_date):
    """
    Sends the broadcast to Kit via API.
    """
    if not KIT_API_SECRET:
        print(f"[DRY RUN] Would schedule: '{subject}' for {publish_date.strftime('%Y-%m-%d 10:00')}")
        return

    import requests
    url = "https://api.convertkit.com/v3/broadcasts"
    
    payload = {
        "api_secret": KIT_API_SECRET,
        "content": html_content,
        "subject": subject,
        "published_at": publish_date.strftime("%Y-%m-%dT10:00:00Z")
    }
    
    # If using a specific visual template in Kit, add it to payload
    if KIT_TEMPLATE_ID:
        payload["template_id"] = KIT_TEMPLATE_ID
        
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        print(f"SUCCESS: Scheduled '{subject}' in Kit for {publish_date.strftime('%Y-%m-%d')}")
    except requests.exceptions.RequestException as e:
        print(f"FAILED: Could not schedule in Kit: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(e.response.text)

def main():
    tracker = load_json(TRACKER_PATH)
    
    # Filter for articles that have teasers and aren't published
    articles = [a for a in tracker if a.get('email_teaser') and a.get('slug')]
    
    if len(articles) < 2:
        print("Need at least 2 articles with teasers to generate a sequence.")
        return

    # Start scheduling for tomorrow
    start_date = datetime.datetime.now() + datetime.timedelta(days=1)
    
    print(f"Generating and scheduling {len(articles)-1} emails to Kit...")
    if not KIT_API_SECRET:
        print("DRY-RUN MODE: No KIT_API_SECRET found. (printing only).")
        print("Set KIT_API_SECRET environment variable to actually upload.\n")

    for i in range(len(articles) - 1):
        today_art = articles[i]
        tomorrow_art = articles[i+1]
        
        broadcast_date = start_date + datetime.timedelta(days=i)
        
        html_content = build_email_content(today_art, tomorrow_art)
        
        # Clean the subject line from any em dashes too
        subject = clean_text(f"New: {today_art.get('title', today_art.get('pin_title'))}")
        
        schedule_broadcast_in_kit(subject, html_content, broadcast_date)

if __name__ == "__main__":
    main()
