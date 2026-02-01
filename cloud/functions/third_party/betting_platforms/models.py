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


class Event(BaseModel):
    event_name: str
    event_time: datetime
    competition_name: Optional[str] = None
    options: List[Option]
