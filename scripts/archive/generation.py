import json

class LLMTimeoutError(Exception):
    pass

class LLMFormatError(Exception):
    pass

class PartialAssetFailure(Exception):
    pass


class GenerationEngine:
    def _call_llm_api(self, topic_id, topic_text):
        """Internal method to call the LLM API. To be mocked in tests."""
        pass
        
    def _generate_image(self, pin_idx):
        """Internal method to call Image Generation API. To be mocked in tests."""
        pass
        
    def generate_content(self, topic_id, topic_text):
        try:
            response = self._call_llm_api(topic_id, topic_text)
            return json.loads(response)
        except TimeoutError as e:
            raise LLMTimeoutError(str(e))
        except json.JSONDecodeError as e:
            raise LLMFormatError(f"Invalid JSON: {e}")

    def generate_full_package(self, topic_id, topic_text):
        # 1. Generate text package
        data = self.generate_content(topic_id, topic_text)
        
        # 2. Generate required images
        for i in range(1, 6):
            try:
                self._generate_image(i)
            except Exception as e:
                # Catch image failure and raise as a partial failure
                # This ensures we don't treat it as a full catastrophic failure
                raise PartialAssetFailure(f"Failed on image {i}: {e}")
        
        return data
