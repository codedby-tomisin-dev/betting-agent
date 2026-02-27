import os
from pathlib import Path
from pydantic_ai import Agent
from pydantic_ai.models.gemini import GeminiModel
from pydantic_ai.common_tools.duckduckgo import duckduckgo_search_tool

from .tools import search_match_news
from ..models import MatchIntelligenceReport


prompt_path = Path(__file__).parent / "prompt.md"

model = GeminiModel('gemini-3-pro-preview')

sourcing_agent = Agent(
    model=model,
    output_type=MatchIntelligenceReport,
    system_prompt=prompt_path.read_text(),
    tools=[duckduckgo_search_tool()],
)
