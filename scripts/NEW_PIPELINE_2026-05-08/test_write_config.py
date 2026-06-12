"""Tests for article writer runtime defaults."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import write  # noqa: E402


class TestWriteConfig(unittest.TestCase):

    def test_default_max_tokens_allows_long_articles(self):
        self.assertGreaterEqual(write.DEFAULT_MAX_TOKENS, 10000)


if __name__ == "__main__":
    unittest.main()
