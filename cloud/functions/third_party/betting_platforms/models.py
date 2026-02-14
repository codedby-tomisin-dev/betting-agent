from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel


class Selection(BaseModel):
    name: str
    odds: Optional[float] = None
    selection_id: int


class Option(BaseModel):
    market_id: str
    name: str
    options: List[Selection]


class Competition(BaseModel):
    name: str


class Event(BaseModel):
    """Event with nested structure matching frontend EventInfo"""
    provider_event_id: str
    name: str
    time: datetime
    competition: Competition
    options: List[Option]

    # Legacy field accessors for backwards compatibility during migration
    @property
    def event_name(self) -> str:
        return self.name
    
    @property
    def event_time(self) -> datetime:
        return self.time
    
    @property
    def competition_name(self) -> str:
        return self.competition.name
