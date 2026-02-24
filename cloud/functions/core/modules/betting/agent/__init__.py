import os
from pathlib import Path
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel

from ..models import BettingAgentResponse


model = OpenAIModel(model_name="gpt-5.2")

# Get the absolute path to the prompt file
prompt_path = Path(__file__).parent / "prompt.md"

# Pure reasoning agent — receives pre-built intelligence from the sourcing agent.
# No data-gathering tools — those belong exclusively to the sourcing agent.
betting_agent = Agent(
    model=model,
    output_type=BettingAgentResponse,
    system_prompt=prompt_path.read_text(),
)
