import json
import os
from datetime import datetime, timezone
from pathlib import Path

from jsonschema import validate, ValidationError
from filelock import FileLock, Timeout


class InvalidStateTransitionError(Exception):
    """Raised when an illegal state transition is attempted."""
    pass


class TopicManager:
    VALID_TRANSITIONS = {
        "discovered": ["dedupe_review", "rejected"],
        "dedupe_review": ["approved_for_generation", "rejected"],
        "approved_for_generation": ["generation_in_progress", "rejected"], # Start generation or reject topic
        "generation_in_progress": ["generated", "generation_failed"], # Generation completed or failed
        "generation_failed": ["generation_in_progress", "rejected"], # Retry generation or reject
        "generated": ["qa_in_progress"], # Content generated, move to QA
        "qa_in_progress": ["qa_failed", "qa_passed"], # QA completed (failed or passed)
        "qa_failed": ["generation_in_progress", "rejected", "image_fix_in_progress"], # Retry gen, fix images, or reject
        "qa_passed": ["telegram_pending"], # Content clean, ready for Telegram approval
        "telegram_pending": ["telegram_changes_requested", "approved_for_publish", "rejected"], # User action from Telegram
        "telegram_changes_requested": ["generation_in_progress", "image_fix_in_progress"], # Text needs regen, or only image fix
        "image_fix_in_progress": ["image_fix_failed", "telegram_pending"], # Image fix completed (failed or new telegram pending)
        "image_fix_failed": ["image_fix_in_progress", "rejected"], # Retry image fix or reject
        "approved_for_publish": ["publish_in_progress"], # Ready for final publishing
        "publish_in_progress": ["published", "publish_failed"], # Publishing done or failed
        "publish_failed": ["publish_in_progress", "rejected"], # Retry publish or reject
        "published": [], # Terminal state
        "rejected": [] # Terminal state
    }

    def __init__(self, schema_path, storage_dir):
        self.schema_path = Path(schema_path)
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        with open(self.schema_path, "r", encoding="utf-8") as f:
            self.schema = json.load(f)

    def _get_file_path(self, topic_id):
        return self.storage_dir / f"{topic_id}.json"

    def _get_lock(self, topic_file):
        return FileLock(str(topic_file) + ".lock", timeout=1)

    def create_topic(self, topic_id, topic="", category="tips", status="discovered"):
        now = datetime.now(timezone.utc).isoformat()
        
        data = {
            "topic_id": topic_id,
            "topic": topic if topic else "Placeholder topic text",
            "category": category,
            "status": status,
            "created_at": now,
            "updated_at": now,
            "attempts": {
                "generation": 0,
                "qa": 0,
                "image_fix": 0,
                "publish": 0
            }
        }
        
        validate(instance=data, schema=self.schema)
        self._save_topic(topic_id, data)
        return data

    def _force_create_topic_with_state(self, topic_id, status):
        """Helper for testing terminal states."""
        return self.create_topic(topic_id, topic="Valid test topic length", category="tips", status=status)

    def load_topic(self, topic_id):
        topic_file = self._get_file_path(topic_id)
        if not topic_file.exists():
            raise FileNotFoundError(f"Topic {topic_id} not found.")

        lock = self._get_lock(topic_file)
        with lock.acquire():
            try:
                with open(topic_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return data
            except json.JSONDecodeError as e:
                raise ValueError(f"Corrupted JSON: {e}")

    def _save_topic(self, topic_id, data):
        topic_file = self._get_file_path(topic_id)
        lock = self._get_lock(topic_file)
        
        with lock.acquire():
            with open(topic_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

    def transition_state(self, topic_id, new_status):
        data = self.load_topic(topic_id)
        current_status = data.get("status")

        if new_status not in self.VALID_TRANSITIONS.get(current_status, []):
            raise InvalidStateTransitionError(
                f"Invalid transition from '{current_status}' to '{new_status}'"
            )

        data["status"] = new_status
        data["updated_at"] = datetime.now(timezone.utc).isoformat()

        validate(instance=data, schema=self.schema)
        self._save_topic(topic_id, data)
        return data
