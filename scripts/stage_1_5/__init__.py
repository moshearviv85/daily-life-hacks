"""Stage 1.5 — multi-model article writer via OpenRouter.

Sends the same topic + system prompt to N models in parallel, stores each
result row with tokens/cost/latency for later judging by stage_1_75.
"""
