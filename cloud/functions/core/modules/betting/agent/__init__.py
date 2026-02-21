import os
from pathlib import Path
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel

from .tools import get_event_analysis
from ..models import BettingAgentResponse


model = OpenAIModel(
    model_name="gpt-5.2",
)

# Get the absolute path to the prompt file
prompt_path = Path(__file__).parent / "prompt.md"

betting_agent = Agent(
    model=model,
    output_type=BettingAgentResponse,
    system_prompt=prompt_path.read_text(),
    tools=[get_event_analysis],
)
