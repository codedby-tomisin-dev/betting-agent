import json
import datetime
from google.cloud.firestore_v1.transforms import Sentinel
import datetime
from google.cloud.firestore_v1.transforms import Sentinel
from typing import Dict, Any
from core import logger

from .repository import LearningsRepository
from .agent import learnings_agent
from .models import LearningsAgentResponse


class LearningsManager:
    """Manager for automated betting learnings and insights."""

    def __init__(self, repository=None):
        self.repo = repository or LearningsRepository()

    def get_current_learnings(self) -> str:
        """Retrieves the current learnings markdown."""
        try:
            current_learnings_doc = self.repo.get_main_learnings()
            if not current_learnings_doc or "content" not in current_learnings_doc:
                return ""
            return current_learnings_doc.get("content", "")
        except Exception as e:
            logger.error(f"Error fetching current learnings: {e}", exc_info=True)
            return ""

    def analyze_finished_bet(self, bet_data: Dict[str, Any]) -> None:
        """
        Takes a finished hourly_automated bet slip, sends it to the Learning Agent 
        along with the current learnings document, and saves the updated teachings.
        """
        bet_id = bet_data.get("id", "unknown")
        logger.info(f"Starting learnings analysis for finished bet {bet_id}")
        
        try:
            # 1. Fetch current learnings
            current_learnings_doc = self.repo.get_main_learnings()
            
            # If no document exists yet, initialize with a simple template
            if not current_learnings_doc or "content" not in current_learnings_doc:
                current_markdown = "# Betting Learnings & Insights\n\nNo learnings recorded yet."
            else:
                current_markdown = current_learnings_doc.get("content", "")

            # 2. Extract key bet data for the AI
            # We don't need to send the entire raw document, just what matters
            extracted_bet_data = {
                "id": bet_id,
                "target_date": bet_data.get("target_date"),
                "events": bet_data.get("events", []),
                "ai_reasoning": bet_data.get("ai_reasoning", ""),
                "selections": bet_data.get("selections", {}).get("items", []),
                "placement_results": bet_data.get("placement_results", {}),
                "settlement_results": bet_data.get("settlement_results", []),
                "balance_impact": bet_data.get("balance", {})
            }

            # 3. Build prompt for the Learning Agent
            prompt_input = f"""
            === CURRENT LEARNINGS DOCUMENT ===
            {current_markdown}
            
            === RECENTLY FINISHED BET DATA ===
            {json.dumps(extracted_bet_data, indent=2)}
            
            Please analyze this and return the completely rewritten CURRENT LEARNINGS DOCUMENT markdown incorporating any new insights.
            """

            # 4. Run the agent
            result = learnings_agent.run_sync(prompt_input)
            response_data: LearningsAgentResponse = result.output

            new_markdown = response_data.updated_learnings_markdown

            # 5. Save the updated learnings
            self.repo.update_main_learnings(new_markdown)
            
            logger.info(f"Learnings document successfully updated from bet {bet_id}")

        except Exception as e:
            logger.error(f"Error analyzing finished bet {bet_id} for learnings: {e}", exc_info=True)
            raise e

    def analyze_all_finished_bets(self, limit: int = 50) -> int:
        """
        Fetches multiple finished bets and sends them to the Learning Agent in bulk.
        Returns the number of bets analyzed.
        """
        logger.info(f"Starting bulk learnings analysis for up to {limit} finished bets")
        
        try:
            from core.modules.betting.repository import BetRepository
            
            # 1. Fetch finished bets
            finished_bets = BetRepository().get_all_finished_bets(limit=limit)
            
            if not finished_bets:
                logger.info("No finished bets found to learn from.")
                return 0

            # 2. Fetch current learnings
            current_learnings_doc = self.repo.get_main_learnings()
            if not current_learnings_doc or "content" not in current_learnings_doc:
                current_markdown = "# Betting Learnings & Insights\n\nNo learnings recorded yet."
            else:
                current_markdown = current_learnings_doc.get("content", "")

            # 3. Extract key bet data for the AI
            extracted_bets_data = []
            for bet_data in finished_bets:
                extracted_bets_data.append({
                    "id": bet_data.get("id", "unknown"),
                    "target_date": bet_data.get("target_date"),
                    "events": bet_data.get("events", []),
                    "ai_reasoning": bet_data.get("ai_reasoning", ""),
                    "selections": bet_data.get("selections", {}).get("items", []),
                    "placement_results": bet_data.get("placement_results", {}),
                    "settlement_results": bet_data.get("settlement_results", []),
                    "balance_impact": bet_data.get("balance", {})
                })

            class FirestoreEncoder(json.JSONEncoder):
                def default(self, obj):
                    if isinstance(obj, datetime.datetime):
                        return obj.isoformat()
                    if isinstance(obj, Sentinel):
                        return str(obj)
                    return super().default(obj)

            # 4. Build prompt
            prompt_input = f"""
            === CURRENT LEARNINGS DOCUMENT ===
            {current_markdown}
            
            === FINISHED BETS DATA (BATCH OF {len(extracted_bets_data)}) ===
            {json.dumps(extracted_bets_data, indent=2, cls=FirestoreEncoder)}
            
            Please analyze these past bets and return the completely rewritten CURRENT LEARNINGS DOCUMENT markdown incorporating all insights.
            """

            # 5. Run the agent
            result = learnings_agent.run_sync(prompt_input)
            response_data: LearningsAgentResponse = result.output

            new_markdown = response_data.updated_learnings_markdown

            # 6. Save the updated learnings
            self.repo.update_main_learnings(new_markdown)
            
            logger.info(f"Learnings document successfully updated from {len(finished_bets)} bets")
            return len(finished_bets)
            
        except Exception as e:
            logger.error(f"Error analyzing bulk bets: {e}", exc_info=True)
            raise e
