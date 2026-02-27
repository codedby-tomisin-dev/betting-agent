import os
from pathlib import Path
from dataclasses import dataclass
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.openai import OpenAIModel

from ..models import BettingAgentResponse
from core.modules.wallet.service import WalletService
from core.modules.betting.repository import BetRepository


@dataclass
class AgentDeps:
    wallet_service: WalletService
    bet_repo: BetRepository


model = OpenAIModel(model_name="gpt-5.2")

# Get the absolute path to the prompt files
prompt_path = Path(__file__).parent / "prompt.md"
fallback_prompt_path = Path(__file__).parent / "fallback_prompt.md"

# Pure reasoning agent — receives pre-built intelligence from the sourcing agent.
betting_agent = Agent(
    model=model,
    deps_type=AgentDeps,
    output_type=BettingAgentResponse,
    system_prompt=prompt_path.read_text(),
)

# Fallback agent — evaluates goal ceiling odds for unrecognized leagues.
fallback_agent = Agent(
    model=model,
    deps_type=AgentDeps,
    output_type=BettingAgentResponse,
    system_prompt=fallback_prompt_path.read_text(),
)

@betting_agent.tool
def get_wallet_balance_main(ctx: RunContext[AgentDeps]) -> float:
    """Returns the available balance in the wallet (in GBP)."""
    return ctx.deps.wallet_service.get_available_balance()

@betting_agent.tool
def get_recent_bet_results_main(ctx: RunContext[AgentDeps], limit: int = 5) -> str:
    """Returns a formatted string of recent finished betting results."""
    bets = ctx.deps.bet_repo.get_all_finished_bets(limit=limit)
    if not bets:
        return "No recent finished bets found."
    lines = []
    for idx, bet in enumerate(bets, 1):
        profit = bet.get("balance", {}).get("ending", 0) - bet.get("balance", {}).get("starting", 0)
        if profit > 0:
            status = "WON"
        elif profit < 0:
            status = "LOST"
        else:
            status = "BREAK-EVEN"
        odds = bet.get("selections", {}).get("wager", {}).get("odds", 1.0)
        lines.append(f"- Bet {idx} (Odds {odds}): {status} (Profit: ${profit:.2f})")
    return "\n".join(lines)

@fallback_agent.tool
def get_wallet_balance_fallback(ctx: RunContext[AgentDeps]) -> float:
    """Returns the available balance in the wallet (in GBP)."""
    return ctx.deps.wallet_service.get_available_balance()

@fallback_agent.tool
def get_recent_bet_results_fallback(ctx: RunContext[AgentDeps], limit: int = 5) -> str:
    """Returns a formatted string of recent finished betting results."""
    bets = ctx.deps.bet_repo.get_all_finished_bets(limit=limit)
    if not bets:
        return "No recent finished bets found."
    lines = []
    for idx, bet in enumerate(bets, 1):
        profit = bet.get("balance", {}).get("ending", 0) - bet.get("balance", {}).get("starting", 0)
        if profit > 0:
            status = "WON"
        elif profit < 0:
            status = "LOST"
        else:
            status = "BREAK-EVEN"
        odds = bet.get("selections", {}).get("wager", {}).get("odds", 1.0)
        lines.append(f"- Bet {idx} (Odds {odds}): {status} (Profit: ${profit:.2f})")
    return "\n".join(lines)
