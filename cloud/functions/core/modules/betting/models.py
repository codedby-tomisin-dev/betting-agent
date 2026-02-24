from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Sourcing Agent → Decision Agent contract
# ---------------------------------------------------------------------------

class TeamIntelligence(BaseModel):
    """All pre-sourced intelligence about one side of the match."""
    name: str = Field(..., description="Full team name")
    key_injuries: List[str] = Field(default_factory=list, description="Confirmed injured players")
    key_suspensions: List[str] = Field(default_factory=list, description="Confirmed suspended players")
    form_last_5: str = Field(default="Unknown", description="Last 5 results as a string, e.g. 'W W D L W'")
    goals_scored_last_5: int = Field(default=0, description="Total goals scored in last 5 matches")
    goals_conceded_last_5: int = Field(default=0, description="Total goals conceded in last 5 matches")
    recent_results: List[str] = Field(default_factory=list, description="Human-readable recent results, e.g. ['2-0 vs Chelsea (H)', '1-1 vs Arsenal (A)']")
    average_cards_per_game: Optional[float] = Field(None, description="Average yellow+red cards per game in recent form")
    is_rotating: bool = Field(default=False, description="True if rotation is confirmed or very likely")
    goalkeeper_is_backup: bool = Field(default=False, description="True if a backup/inexperienced keeper is playing")
    morale_notes: Optional[str] = Field(None, description="Short qualitative note on morale, managerial changes, etc.")
    league_position: Optional[int] = Field(None, description="Current league table position")


class MatchIntelligenceReport(BaseModel):
    """
    Structured intelligence report produced by the sourcing agent.
    This is the typed handoff contract consumed by the decision-making agent.
    """
    home_team: TeamIntelligence
    away_team: TeamIntelligence

    h2h_summary: str = Field(..., description="Plain-language summary of the head-to-head record")
    h2h_avg_goals: Optional[float] = Field(None, description="Average total goals per game in recent H2H meetings")
    h2h_btts_rate: Optional[float] = Field(None, description="Fraction of recent H2H meetings where BTTS Yes occurred, e.g. 0.6 = 60%")

    match_context: str = Field(..., description="e.g. 'Derby', 'Title decider', 'Dead rubber', 'Relegation 6-pointer', 'Standard league fixture'")
    referee_name: Optional[str] = Field(None, description="Confirmed match referee, if known")
    referee_cards_per_game: Optional[float] = Field(None, description="Referee's average cards per game, if known")

    weather_concern: Optional[str] = Field(None, description="Any notable weather condition, e.g. 'Heavy rain forecast', 'Wind > 40km/h'")
    competition_name: str = Field(..., description="Full competition name, e.g. 'English Premier League'")

    data_confidence: Literal["HIGH", "MEDIUM", "LOW"] = Field(
        ...,
        description=(
            "HIGH: rich news + standings + H2H data. "
            "MEDIUM: partial data, some sections missing. "
            "LOW: sparse or no meaningful data found."
        )
    )
    sourcing_notes: str = Field(..., description="Free-text summary of what data was found, what was missing, and any caveats.")



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
        reasoning: str = Field(..., max_length=240, description="Punchy, human-readable narrative explanation written for a football fan. No technical stats. (max 240 chars)")
        stake_justification: Optional[str] = Field(None, description="Full technical explanation including probability derivation and stake calculation.")

    recommendations: List[BetRecommendation]
    overall_reasoning: str = Field(..., description="A human-readable narrative explanation summarizing the overall approach and picks for the slip, written from a fan's perspective.")


class AnalyzeBetsRequest(BaseModel):
    """Request model for analyze_bets endpoint"""
    events: List[dict] = Field(..., min_length=1, description="List of betting events")
    risk_appetite: float = Field(..., ge=1.0, le=5.0, description="Risk level from 1 (safe) to 5 (aggressive)")
    budget: float = Field(..., gt=0, description="Total budget for betting")
    min_profit: float = Field(default=0.0, ge=0.0, description="Minimum profit required per selection")


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
        market_name: Optional[str] = Field(None, description="Name of the market (e.g. Over 2.5 Goals)")
        selection_name: Optional[str] = Field(None, description="Name of the selection (e.g. Under 4.5)")
        event: Optional[dict] = Field(None, description="Event information {name, time, competition: {name}}")
    
    bets: List[BetOrder] = Field(..., min_length=1, description="List of bets to place")
