from pydantic import BaseModel, Field
from constants import AUTOMATED_BETTING_OPTIONS


class BettingSettings(BaseModel):
    """Typed, validated representation of the automated betting configuration.

    Values are loaded from Firestore (settings/betting), falling back to
    AUTOMATED_BETTING_OPTIONS constants when a key is absent.
    """

    bankroll_percent: float = Field(default_factory=lambda: AUTOMATED_BETTING_OPTIONS["BANKROLL_PERCENT"])
    max_bankroll: float = Field(default_factory=lambda: AUTOMATED_BETTING_OPTIONS["MAX_BANKROLL"])
    risk_appetite: float = Field(default_factory=lambda: AUTOMATED_BETTING_OPTIONS["RISK_APPETITE"])
    use_reliable_teams: bool = Field(default_factory=lambda: AUTOMATED_BETTING_OPTIONS["USE_RELIABLE_TEAMS"])
    min_stake: float = Field(default_factory=lambda: AUTOMATED_BETTING_OPTIONS["MIN_STAKE"])
    min_profit: float = Field(default_factory=lambda: AUTOMATED_BETTING_OPTIONS["MIN_PROFIT"])
    default_budget: float = Field(default_factory=lambda: AUTOMATED_BETTING_OPTIONS["DEFAULT_BUDGET"])
