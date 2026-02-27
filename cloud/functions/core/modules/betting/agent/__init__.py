import os
from pathlib import Path
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel

from ..models import BettingAgentResponse


model = OpenAIModel(model_name="gpt-5.2")

# Get the absolute path to the prompt files
prompt_path = Path(__file__).parent / "prompt.md"
fallback_prompt_path = Path(__file__).parent / "fallback_prompt.md"

# Pure reasoning agent — receives pre-built intelligence from the sourcing agent.
betting_agent = Agent(
    model=model,
    output_type=BettingAgentResponse,
    system_prompt=prompt_path.read_text(),
)

# Fallback agent — evaluates goal ceiling odds for unrecognized leagues.
fallback_agent = Agent(
    model=model,
    output_type=BettingAgentResponse,
    system_prompt=fallback_prompt_path.read_text(),
)
