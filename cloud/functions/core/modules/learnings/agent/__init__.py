from pathlib import Path
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel

from ..models import LearningsAgentResponse

model = OpenAIModel(
    model_name="gpt-5.2",
)

# Get the absolute path to the prompt file
prompt_path = Path(__file__).parent / "prompt.md"

learnings_agent = Agent(
    model=model,
    output_type=LearningsAgentResponse,
    system_prompt=prompt_path.read_text(),
)
