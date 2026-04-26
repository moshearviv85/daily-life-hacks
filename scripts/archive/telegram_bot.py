import os
import requests
import html
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(override=True)

class TelegramDeliveryError(Exception):
    pass

class TelegramInterface:
    def __init__(self, topic_manager):
        self.topic_manager = topic_manager

    def _send_message_api(self, payload):
        """Send data to the actual Telegram API using credentials from .env."""
        token = os.getenv("TELEGRAM_BOT_TOKEN")
        chat_id = os.getenv("TELEGRAM_CHAT_ID")
        
        if not token or not chat_id:
            raise TelegramDeliveryError("Telegram credentials missing from .env")

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        
        # Build the Telegram message with inline keyboard buttons
        topic_id = payload.get("topic_id")
        text = payload.get("text")
        
        # Add inline buttons to the message
        # We encode the topic_id and the action in the callback_data
        keyboard = {
            "inline_keyboard": [
                [
                    {"text": "✅ Approve All", "callback_data": f"approve_all|{topic_id}"},
                    {"text": "❌ Reject Topic", "callback_data": f"reject_topic|{topic_id}"}
                ],
                [
                    {"text": "Fix Pin 1", "callback_data": f"fix_image|{topic_id}|pin_1"},
                    {"text": "Fix Pin 2", "callback_data": f"fix_image|{topic_id}|pin_2"},
                    {"text": "Fix Pin 3", "callback_data": f"fix_image|{topic_id}|pin_3"}
                ],
                [
                    {"text": "Fix Pin 4", "callback_data": f"fix_image|{topic_id}|pin_4"},
                    {"text": "Fix Pin 5", "callback_data": f"fix_image|{topic_id}|pin_5"}
                ]
            ]
        }

        api_payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "reply_markup": keyboard
        }
        
        response = requests.post(url, json=api_payload, timeout=10)
        if not response.ok:
            raise TelegramDeliveryError(f"Telegram API returned {response.status_code}: {response.text}")

        return response.json()

    def _send_document_api(self, file_path: str, caption: str | None = None, reply_markup=None):
        token = os.getenv("TELEGRAM_BOT_TOKEN")
        chat_id = os.getenv("TELEGRAM_CHAT_ID")
        if not token or not chat_id:
            raise TelegramDeliveryError("Telegram credentials missing from .env")

        url = f"https://api.telegram.org/bot{token}/sendDocument"
        with open(file_path, "rb") as f:
            data = {"chat_id": chat_id}
            if caption:
                data["caption"] = caption
            if reply_markup:
                data["reply_markup"] = reply_markup
            r = requests.post(url, data=data, files={"document": f}, timeout=30)
        if not r.ok:
            raise TelegramDeliveryError(f"Telegram API returned {r.status_code}: {r.text}")
        return r.json()

    def _send_photo_api(self, file_path: str, caption: str | None = None):
        token = os.getenv("TELEGRAM_BOT_TOKEN")
        chat_id = os.getenv("TELEGRAM_CHAT_ID")
        if not token or not chat_id:
            raise TelegramDeliveryError("Telegram credentials missing from .env")

        url = f"https://api.telegram.org/bot{token}/sendPhoto"
        with open(file_path, "rb") as f:
            data = {"chat_id": chat_id}
            if caption:
                data["caption"] = caption
            r = requests.post(url, data=data, files={"photo": f}, timeout=30)
        if not r.ok:
            raise TelegramDeliveryError(f"Telegram API returned {r.status_code}: {r.text}")
        return r.json()

    def send_preview(self, topic_id):
        # Send preview when content is ready for review.
        # We allow both:
        # - qa_passed (normal first send)
        # - telegram_pending (idempotent resend)
        topic = self.topic_manager.load_topic(topic_id)
        if topic["status"] not in {"qa_passed", "telegram_pending"}:
            return
            
        try:
            title = topic.get('topic', 'N/A')
            message_text = f"<b>New Article Ready For Review</b>\n\n"
            message_text += f"<b>Topic ID:</b> <code>{html.escape(topic_id)}</code>\n"
            message_text += f"<b>Title:</b> {html.escape(title)}\n\n"

            # Try to include a short excerpt + attach the draft markdown
            slug = (topic.get("publish") or {}).get("article_slug")
            md_path = (topic.get("generation") or {}).get("article_markdown_path")
            if not md_path and slug:
                md_path = str(Path("pipeline-data/drafts") / f"{slug}.md")

            excerpt = None
            if md_path and Path(md_path).exists():
                raw = Path(md_path).read_text(encoding="utf-8", errors="ignore")
                # crude: grab first ~1200 chars after frontmatter
                parts = raw.split("---", 2)
                body = parts[2] if len(parts) >= 3 else raw
                excerpt = body.strip().replace("\n", " ")[:600]

            if excerpt:
                message_text += f"<b>Preview:</b> {html.escape(excerpt)}...\n\n"

            message_text += "<i>Select an action below.</i>"
            
            resp = self._send_message_api({"text": message_text, "topic_id": topic_id})

            # Attach markdown draft if available
            if md_path and Path(md_path).exists():
                try:
                    self._send_document_api(md_path, caption=f"Draft: {slug or topic_id}.md")
                except Exception as e:
                    # Non-fatal
                    print(f"Telegram: could not send draft document: {e}")

            # Attach main image if exists
            if slug:
                main_img = Path("public/images") / f"{slug}-main.jpg"
                if main_img.exists():
                    try:
                        self._send_photo_api(str(main_img), caption="Main image")
                    except Exception as e:
                        print(f"Telegram: could not send main image: {e}")

            # If successful, move to telegram_pending (only if not already there)
            if topic["status"] == "qa_passed":
                self.topic_manager.transition_state(topic_id, "telegram_pending")

            return resp
        except Exception as e:
            raise TelegramDeliveryError(f"Failed to send Telegram message: {e}")

    def handle_webhook(self, payload):
        topic_id = payload.get("topic_id")
        action = payload.get("action")
        
        topic = self.topic_manager.load_topic(topic_id)
        current_status = topic["status"]

        # Idempotency check: if already approved or published, ignore
        if current_status in ["approved_for_publish", "published"]:
            return {"status": "ignored"}

        if current_status != "telegram_pending":
            return {"status": "ignored"}

        if action == "approve_all":
            self.topic_manager.transition_state(topic_id, "approved_for_publish")
            
        elif action == "reject_topic":
            self.topic_manager.transition_state(topic_id, "rejected")
            
        elif action == "fix_image":
            target = payload.get("target")
            # First, transition state to changes_requested
            self.topic_manager.transition_state(topic_id, "telegram_changes_requested")
            # Then immediately to image_fix_in_progress
            self.topic_manager.transition_state(topic_id, "image_fix_in_progress")
            # Then we'd need to save the fix target in the DB/JSON. We'll do a partial update here.
            topic = self.topic_manager.load_topic(topic_id)
            topic["fix_target"] = target
            self.topic_manager._save_topic(topic_id, topic)

        return {"status": "success"}
