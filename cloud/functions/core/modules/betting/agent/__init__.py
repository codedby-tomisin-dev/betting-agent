import os
from pathlib import Path
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel

from constants import OPEN_AI_API_KEY
from .tools import web_search
from ..models import BettingAgentResponse

# Set OpenAI API key
os.environ["OPENAI_API_KEY"] = OPEN_AI_API_KEY

model = OpenAIModel(
    model_name="gpt-4o",
)

# Get the absolute path to the prompt file
prompt_path = Path(__file__).parent / "prompt.md"

betting_agent = Agent(
    model=model,
    output_type=BettingAgentResponse,
    system_prompt=prompt_path.read_text(),
    tools=[web_search],
)
