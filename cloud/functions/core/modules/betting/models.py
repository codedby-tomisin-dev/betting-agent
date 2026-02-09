from typing import Optional, List
from pydantic import BaseModel, Field


class BettingAgentResponse(BaseModel):
    class BetRecommendation(BaseModel):
        class Pick(BaseModel):
            event_name: str = Field(..., description="Name of the event/match")
            market_name: str = Field(..., description="Name of the market type")
            option_name: str = Field(..., description="Name of the selection/option being bet on")
        
        pick: Pick
        market_id: str
        selection_id: int
        stake: float
        odds: float
        side: Optional[str] = Field(default="BACK", description="BACK or LAY")
        reasoning: str = Field(..., max_length=240, description="Brief analysis of the selection (max 240 chars)")

    recommendations: List[BetRecommendation]
    overall_reasoning: str


class AnalyzeBetsRequest(BaseModel):
    """Request model for analyze_bets endpoint"""
    events: List[dict] = Field(..., min_length=1, description="List of betting events")
    risk_appetite: float = Field(..., ge=1.0, le=5.0, description="Risk level from 1 (safe) to 5 (aggressive)")
    budget: float = Field(..., gt=0, description="Total budget for betting")


class GetOddsRequest(BaseModel):
    """Request model for get_odds endpoint"""
    sport: Optional[str] = Field(None, description="Sport type to filter by")
    competitions: Optional[List[str]] = Field(None, description="List of competition names to filter by")
    query: Optional[str] = Field(None, description="Text query to search for")


class PlaceBetRequest(BaseModel):
    """Request model for place_bet endpoint"""
    class BetOrder(BaseModel):
        """Individual bet order"""
        market_id: str = Field(..., description="Market ID")
        selection_id: int = Field(..., description="Selection ID")
        stake: float = Field(..., gte=1.0, description="Bet stake amount")
        odds: float = Field(..., gt=1.0, description="Bet odds")
        side: Optional[str] = Field("BACK", description="Bet side (BACK or LAY)")
    
    bets: List[BetOrder] = Field(..., min_length=1, description="List of bets to place")
