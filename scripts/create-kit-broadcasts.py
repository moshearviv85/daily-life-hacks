import json
import os
import sys
import datetime
import random
from dotenv import load_dotenv

# Load env variables from .env file
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRACKER_PATH = os.path.join(BASE_DIR, 'pipeline-data', 'content-tracker.json')
SITE_URL = "https://www.daily-life-hacks.com"

# In Kit (ConvertKit), you set up a visual Template with your logo and footer.
# You grab that Template ID. When you send a Broadcast via API, you send the `content` (HTML) 
# and tell Kit which `template_id` to wrap it in.
KIT_API_SECRET = os.environ.get('KIT_API_SECRET', '') 
KIT_TEMPLATE_ID = "5055804"

# --- TONE-ACCURATE CONTENT BANKS (NO EM DASHES) ---
INTROS = [
    "Hey, it is David.<br><br>You have to eat today anyway, so we might as well make it slightly less annoying. Below is what just went live on the site, and what is waiting for you tomorrow before it shows up for everyone else.",
    "Hey, it is David from Daily Life Hacks.<br><br>Consider this your little nudge to figure out what is for dinner before you are already starving. I pulled together today’s post and tomorrow’s early access for you in one place.",
    "Hi, it is David.<br><br>If your brain is already tired, the food situation does not need to be. Here is the new thing on the site right now, plus what is coming tomorrow if you want to be ahead of the crowd.",
    "Hey, it is David checking in from the land of people who do not have three free hours to cook on a Tuesday.<br><br>Below you have today’s recipe and a sneak peek at tomorrow’s post so you can decide what actually fits your week.",
    "Hi, it is David.<br><br>Think of this as the useful part of food content, without the five page backstory. One thing you can make today, and one thing waiting for you tomorrow.",
    "Hey, it is David.<br><br>You do not need a spiritual journey, you just need something decent on a plate. Start with what is live now, bookmark what is coming tomorrow, and keep the whole thing low drama.",
    "Hi from Daily Life Hacks.<br><br>No detoxes, no food guilt, just ideas that actually work on weeknights. I put today’s post and tomorrow’s early access together so you do not have to go digging.",
    "Hey, it is David.<br><br>Let us keep dinner simple enough that you do not need a spreadsheet to pull it off. Here is what is up on the site, and what is waiting for you a day early."
]

OUTROS = [
    "That is enough food talk for today. I will send you the next round tomorrow.",
    "Alright, that is what I have for you today. We will keep building this out one small, useful thing at a time.",
    "That is it from me for now. Tomorrow’s post is already waiting for you up there.",
    "Okay, I will let you get back to your day. The rest is between you and your stove."
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

    # Tomorrow's data (shown first in the email)
    tom_url = f"{SITE_URL}/{tomorrow_art['slug']}?utm_source=kit_newsletter&utm_medium=email&utm_campaign=early_access"
    tom_title = clean_text(tomorrow_art.get('title', tomorrow_art.get('pin_title', 'Upcoming Article')))
    tom_teaser = clean_text(tomorrow_art.get('email_teaser', ''))
    tom_img = tomorrow_art.get('image_web', '')
    tom_img_url = f"{SITE_URL}{tom_img}" if tom_img.startswith('/') else f"{SITE_URL}/{tom_img}"

    html = f"""
<p style="font-size: 17px; color: #374151; line-height: 1.7; font-family: sans-serif;">{intro}</p>

<!-- Tomorrow Section FIRST -->
<p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; font-family: sans-serif; margin: 28px 0 8px 0;">
  Coming Tomorrow (Early Access):
  </p>

<h2 style="margin-top: 0; margin-bottom: 10px; font-size: 20px; font-family: sans-serif;">
  <a href="{tom_url}" style="color: #111827; text-decoration: none;">{tom_title}</a>
</h2>

<a href="{tom_url}" style="display: block; margin-bottom: 12px;">
  <img src="{tom_img_url}" alt="{tom_title}" style="width: 100%; max-width: 480px; height: auto; border-radius: 8px; display: block; margin: 0 auto;">
</a>

<p style="font-size: 15px; color: #4b5563; line-height: 1.6; font-family: sans-serif; margin-bottom: 16px;">
  {tom_teaser}
</p>

<p style="margin-bottom: 28px; font-family: sans-serif;">
  <a href="{tom_url}" style="font-weight: bold; color: #F29B30; text-decoration: none; font-size: 16px;">Read the full post &rarr;</a>
</p>

<!-- Divider -->
<hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 28px 0;">

<p style="font-size: 16px; color: #6b7280; line-height: 1.6; font-family: sans-serif; margin: 0 0 12px 0;">
  If you just want something to cook right now, this is what is already live on the site:
</p>

<!-- Today's post SECOND -->
<p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; font-family: sans-serif; margin-bottom: 8px;">
  Live on the site today:
</p>

<h3 style="margin-top: 0; margin-bottom: 10px; font-size: 19px; font-family: sans-serif;">
  <a href="{t_url}" style="color: #F29B30; text-decoration: none;">{t_title}</a>
</h3>

<a href="{t_url}" style="display: block; margin-bottom: 12px;">
  <img src="{t_img_url}" alt="{t_title}" style="width: 100%; max-width: 480px; height: auto; border-radius: 8px; display: block; margin: 0 auto;">
</a>

<p style="font-size: 15px; color: #374151; line-height: 1.6; font-family: sans-serif; margin-bottom: 18px;">
  {t_teaser}
</p>

<p style="margin-bottom: 24px; font-family: sans-serif;">
  <a href="{t_url}" style="font-weight: bold; color: #F29B30; text-decoration: none; font-size: 16px;">Read the full post &rarr;</a>
</p>

<p style="font-size: 16px; color: #374151; line-height: 1.6; font-family: sans-serif; margin: 16px 0 4px 0;">
  {outro}
</p>
<p style="font-size: 16px; color: #374151; font-family: sans-serif; margin-top: 0;">
  David Miller
</p>
"""
    return html

def schedule_broadcast_in_kit(subject, html_content, publish_date):
    """
    Sends the broadcast to Kit via API.
    """
    if not KIT_API_SECRET:
        print(f"[DRY RUN] Would schedule: '{subject}' for {publish_date.strftime('%Y-%m-%d 06:00')}")
        return

    import requests
    url = "https://api.convertkit.com/v3/broadcasts"
    
    payload = {
        "api_secret": KIT_API_SECRET,
        "content": html_content,
        "subject": subject,
        "email_layout_template": "daily_mail_v1"
    }
    
    # In API v3, Kit requires a slightly specific format for send_at. 
    # 04:00 UTC = 06:00 Israel (UTC+2). Adjust if your timezone differs.
    payload["send_at"] = publish_date.strftime("%Y-%m-%dT04:00:00Z")
    
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
    
    total_emails = len(articles) - 1
    # Allow limiting the number of emails via env var (for testing a single email)
    max_emails_env = os.environ.get("KIT_MAX_EMAILS")
    if max_emails_env:
        try:
            total_emails = min(total_emails, int(max_emails_env))
        except ValueError:
            pass

    print(f"Generating and scheduling {total_emails} emails to Kit...")
    if not KIT_API_SECRET:
        print("DRY-RUN MODE: No KIT_API_SECRET found. (printing only).")
        print("Set KIT_API_SECRET environment variable to actually upload.\n")

    for i in range(total_emails):
        today_art = articles[i]
        tomorrow_art = articles[i+1]
        
        broadcast_date = start_date + datetime.timedelta(days=i)
        
        html_content = build_email_content(today_art, tomorrow_art)
        
        # Clean the subject line from any em dashes too
        subject = clean_text(f"New: {today_art.get('title', today_art.get('pin_title'))}")
        
        schedule_broadcast_in_kit(subject, html_content, broadcast_date)

if __name__ == "__main__":
    main()
