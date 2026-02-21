from pydantic import BaseModel, Field


class LearningsAgentResponse(BaseModel):
    """
    Response model for the Learnings Agent.
    """
    updated_learnings_markdown: str = Field(
        ..., 
        description="The completely rewritten and updated markdown content for the central learnings document, incorporating insights from the recently finished bet."
    )
