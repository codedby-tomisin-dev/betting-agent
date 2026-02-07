# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

from firebase_functions import https_fn, scheduler_fn, options, firestore_fn
from firebase_admin import initialize_app, firestore
from firebase_functions.options import set_global_options, CorsOptions, MemoryOption
from pydantic import ValidationError

from core import logger
from core.firestore import get_document
from core.modules.betting.manager import BettingManager
from core.modules.betting.models import AnalyzeBetsRequest, GetOddsRequest, PlaceBetRequest
from typing import Any
from core.modules.betting.repository import BetRepository
from core.modules.settings.manager import SettingsManager
from utils.responses import make_error_response, make_success_response
from constants import AUTOMATED_BETTING_OPTIONS, RELIABLE_TEAMS
from core.modules.notifications import NotificationManager


# For cost control, you can set the maximum number of containers that can be
# running at the same time. This helps mitigate the impact of unexpected
# traffic spikes by instead downgrading performance. This limit is a per-function
# limit. You can override the limit for each function using the max_instances
# parameter in the decorator, e.g. @https_fn.on_request(max_instances=5).
set_global_options(max_instances=10, region="europe-west2")

initialize_app()

cors_options = CorsOptions(
    cors_origins=["*"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    # cors_allow_headers=["Content-Type", "Authorization"]
)


@scheduler_fn.on_schedule(
    schedule='0 10 * * *',
    memory=MemoryOption.GB_1,
    timeout_sec=300
)
def automated_daily_betting(event: scheduler_fn.ScheduledEvent) -> None:
    """
    Automated betting scheduler that runs daily at 10AM UTC.
    Searches top competitions, filters today's matches, and creates a bet intent in Firestore.
    """
    try:
        logger.info("Automated daily betting scheduler triggered")
        
        manager = BettingManager()
        
        competitions = list(RELIABLE_TEAMS.keys())
        all_teams = [team for teams in RELIABLE_TEAMS.values() for team in teams]

        settings_doc = get_document("settings", "betting")
        settings = settings_doc.to_dict() if settings_doc.exists else {}

        bankroll_percent = settings.get("BANKROLL_PERCENT", AUTOMATED_BETTING_OPTIONS["BANKROLL_PERCENT"])
        max_bankroll = settings.get("MAX_BANKROLL", AUTOMATED_BETTING_OPTIONS["MAX_BANKROLL"])
        risk_appetite = settings.get("RISK_APPETITE", AUTOMATED_BETTING_OPTIONS["RISK_APPETITE"])
        use_reliable_teams = settings.get("USE_RELIABLE_TEAMS", AUTOMATED_BETTING_OPTIONS["USE_RELIABLE_TEAMS"])
        
        result = manager.execute_automated_betting(
            competitions=competitions,
            bankroll_percent=bankroll_percent,
            max_bankroll=max_bankroll,
            reliable_teams=all_teams if use_reliable_teams else None,
            risk_appetite=risk_appetite,
        )
        
        logger.info(f"Automated betting intent created: {result}")
        
    except Exception as e:
        logger.error(f"Error in automated daily betting scheduler: {e}", exc_info=True)


@https_fn.on_request(
    timeout_sec=300,
    memory=MemoryOption.GB_1,
    cors=cors_options
)
def automated_daily_betting_http(req: https_fn.Request) -> https_fn.Response:
    """
    HTTP endpoint for automated betting with custom date.
    Searches top competitions, filters matches, and creates a bet intent in Firestore.
    Returns the created intent document.
    """
    try:
        logger.info("Automated daily betting HTTP endpoint triggered")
        
        manager = BettingManager()
        
        # Derive competitions and teams from RELIABLE_TEAMS
        competitions = list(RELIABLE_TEAMS.keys())
        all_teams = [team for teams in RELIABLE_TEAMS.values() for team in teams]

        target_date = req.args.get('date', None)
        
        # Fetch settings from Firestore or use defaults
        settings_doc = get_document("settings", "betting")
        settings = settings_doc.to_dict() if settings_doc.exists else {}

        bankroll_percent = settings.get("BANKROLL_PERCENT", AUTOMATED_BETTING_OPTIONS["BANKROLL_PERCENT"])
        max_bankroll = settings.get("MAX_BANKROLL", AUTOMATED_BETTING_OPTIONS["MAX_BANKROLL"])
        risk_appetite = settings.get("RISK_APPETITE", AUTOMATED_BETTING_OPTIONS["RISK_APPETITE"])
        use_reliable_teams = settings.get("USE_RELIABLE_TEAMS", AUTOMATED_BETTING_OPTIONS["USE_RELIABLE_TEAMS"])
        
        result = manager.execute_automated_betting(
            competitions=competitions,
            bankroll_percent=bankroll_percent,
            max_bankroll=max_bankroll,
            reliable_teams=all_teams if use_reliable_teams else None,
            risk_appetite=risk_appetite,
            target_date=target_date,
        )

        return make_success_response(result)

        
    except Exception as e:
        logger.error(f"Error in automated daily betting HTTP endpoint: {e}", exc_info=True)
        return make_error_response(str(e))


@https_fn.on_request(cors=cors_options)
def approve_bet_intent(req: https_fn.Request) -> https_fn.Response:
    """
    Approve a bet intent with optional modifications.
    Expects JSON body:
    {
        "bet_id": "document_id",
        "modifications": {
            "items": [
                {"event": "...", "market": "...", "odds": 1.5, "stake": 10.0, ...}
            ]
        } (optional)
    }
    """
    data = req.get_json()['data']
    bet_id = data.get("bet_id")
    selections = data.get("selections")

    if not bet_id:
        return make_error_response("bet_id is required", status=400)

    try:
        manager = BettingManager()
        manager.approve_bet_intent(bet_id, selections)
        return make_success_response({"status": "approved", "bet_id": bet_id})
    except Exception as e:
        logger.error(f"Error approving bet intent: {e}", exc_info=True)
        return make_error_response(str(e))


@firestore_fn.on_document_created(document="bet_slips/{betId}", timeout_sec=540, memory=options.MemoryOption.GB_1)
def analyze_bet_intent(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    """
    Triggered when a new bet intent is created in Firestore.
    Performs AI analysis on the events and updates the document with selections.
    """
    try:
        snapshot = event.data
        if not snapshot:
            return

        data = snapshot.to_dict()
        bet_id = event.params["betId"]
        
        if data.get("status") != "intent":
            logger.info(f"Skipping bet analysis for {bet_id}: status is {data.get('status')}")
            return

        logger.info(f"Starting analysis for bet intent {bet_id}")
        
        preferences = data.get("preferences", {})
        budget = preferences.get("budget", 10.0)
        risk_appetite = preferences.get("risk_appetite", 3.0)
        
        # Create AnalyzeBetsRequest object
        analysis_request = AnalyzeBetsRequest(
            events=data.get("events", []),
            risk_appetite=risk_appetite,
            budget=budget
        )
        
        manager = BettingManager()
        recommendations = manager.analyze_betting_opportunities(analysis_request)
        manager.update_analysis_result(bet_id, recommendations)

        logger.info(f"Analysis completed for {bet_id}")
        
    except Exception as e:
        logger.error(f"Error analyzing bet intent {event.params['betId']}: {e}", exc_info=True)
        try:
            manager = BettingManager()
            manager.mark_bet_failed(event.params['betId'], str(e))
        except:
            pass


@firestore_fn.on_document_updated(document="bet_slips/{betId}", timeout_sec=60, memory=options.MemoryOption.GB_1)
def place_bet_on_ready(event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot]]) -> None:
    """
    Triggered when a bet document status changes to 'ready'.
    Places the bets on Betfair.
    """
    
    try:
        before = event.data.before.to_dict()
        after = event.data.after.to_dict()
        bet_id = event.params["betId"]

        if before.get("status") == "ready" or after.get("status") != "ready":
            return
            
        logger.info(f"Placing bets for ready intent {bet_id}")
        
        # Use selections_full which has all the required betting details
        selections_data = after.get("selections", [])
        
        # Handle both list and dictionary (new) formats for selections
        if isinstance(selections_data, dict):
            selections = selections_data.get("items", [])
        else:
            selections = selections_data
        
        if not selections:
            logger.warning(f"No selections found for ready bet {bet_id}")
            return

        bets_to_place = []
        for item in selections:
            stake = item.get("stake")
            odds = item.get("odds")
            
            if stake and odds:
                # Calculate potential profit
                potential_profit = stake * (odds - 1)
                
                min_stake = AUTOMATED_BETTING_OPTIONS.get("MIN_STAKE", 1.0)
                min_profit = AUTOMATED_BETTING_OPTIONS.get("MIN_PROFIT", 0.01)
                
                # Validate minimum requirements
                if stake >= min_stake and potential_profit >= min_profit:
                    bets_to_place.append({
                        "market_id": item.get("market_id"),
                        "selection_id": item.get("selection_id"),
                        "stake": stake,
                        "odds": odds,
                        "side": item.get("side", "BACK")
                    })
                else:
                    logger.warning(
                        f"Skipping bet - stake: {stake} (min: {min_stake}), "
                        f"profit: {potential_profit:.3f} (min: {min_profit})"
                    )
            
        if not bets_to_place:
             logger.warning(f"No valid bets to place for {bet_id}")
             return

        manager = BettingManager()
        place_bet_request = PlaceBetRequest(bets=bets_to_place)
        result = manager.place_bet(request=place_bet_request)
        
        manager.update_placement_result(bet_id, result)
        
        logger.info(f"Bets placed for {bet_id}")
        
    except Exception as e:
        logger.error(f"Error placing bets for {event.params['betId']}: {e}", exc_info=True)
        try:
            manager = BettingManager()
            manager.mark_bet_failed(event.params['betId'], f"Placement failed: {str(e)}")
        except:
            pass


@scheduler_fn.on_schedule(schedule='*/2 * * * *')
def on_schedule_example(event: scheduler_fn.ScheduledEvent) -> None:
    print(f"This will be run every hour using {event}")


@https_fn.on_request(cors=cors_options)
def on_request_example(req: https_fn.Request) -> https_fn.Response:
    return https_fn.Response("Hello world!")


@https_fn.on_request(cors=cors_options)
def get_odds(req: https_fn.Request) -> https_fn.Response:
    """Get odds from betting markets."""
    try:
        competitions = req.args.getlist('competitions')
        if not competitions and req.args.get('competition'):
            competitions = [req.args.get('competition')]
        
        request_data = GetOddsRequest(
            sport=req.args.get('sport'),
            competitions=competitions if competitions else None,
            query=req.args.get('query')
        )
        
        result = BettingManager().get_odds(request=request_data)
        return make_success_response(data=result)
    except Exception as e:
        logger.error(f"Get odds error: {e}")
        return make_error_response(str(e))


@https_fn.on_request(cors=cors_options)
def place_bet(req: https_fn.Request) -> https_fn.Response:
    """
    Place multiple bets on Betfair Exchange.
    Expects JSON body with an array of bets:
    [
        {
            "market_id": "1.251640613",
            "selection_id": 5368712,
            "stake": 2.0,
            "odds": 1.61,
            "side": "BACK"
        },
        ...
    ]
    """
    data = req.get_json()
    
    try:
        # Validate and parse request into Pydantic model
        # Handle both array format and object format
        if isinstance(data, list):
            request_data = PlaceBetRequest(bets=data)
        elif isinstance(data, dict) and 'bets' in data:
            request_data = PlaceBetRequest(**data)
        else:
            return https_fn.Response(
                "Request body must be an array of bets or an object with 'bets' field", 
                status=400
            )
        
        result = BettingManager().place_bet(request=request_data)
        return make_success_response(result)
    except ValidationError as e:
        logger.error(f"Place bet validation error: {e}")
        return https_fn.Response(str(e), status=400)
    except Exception as e:
        logger.error(f"Place bet error: {e}")
        return make_error_response(str(e))


@https_fn.on_request(cors=cors_options)
def get_balance(req: https_fn.Request) -> https_fn.Response:
    """Get wallet balance from Betfair Exchange."""
    try:
        result = BettingManager().get_balance()
        return make_success_response(data=result)
    except Exception as e:
        logger.error(f"Get balance error: {e}")
        return make_error_response(str(e))


@https_fn.on_request(timeout_sec=300, memory=options.MemoryOption.GB_1, cors=cors_options)
def analyze_bets(req: https_fn.Request) -> https_fn.Response:
    """
    Analyze betting opportunities using AI agent with web research.
    Expects JSON body:
    {
        "events": [
            {
                "event_name": "Manchester United vs Liverpool",
                "event_time": "2025-12-20T15:00:00Z",
                "competition_name": "English Premier League",
                "options": [
                    {
                        "market_id": "1.251640613",
                        "name": "Match Odds",
                        "options": [
                            {"name": "Manchester United", "odds": 2.5, "selection_id": 123},
                            {"name": "Draw", "odds": 3.2, "selection_id": 456},
                            {"name": "Liverpool", "odds": 2.8, "selection_id": 789}
                        ]
                    }
                ]
            }
        ],
        "risk_appetite": 2.5,
        "budget": 100.0
    }
    """
    
    data = req.get_json()
    
    try:
        result = BettingManager().analyze_betting_opportunities(data)
        return make_success_response(result)
    except Exception as e:
        logger.error(f"Betting agent error: {e}")
        return make_error_response(str(e))


@https_fn.on_request(cors=cors_options)
def get_bet(req: https_fn.Request) -> https_fn.Response:
    """
    Get bet details by ID.
    Expects 'id' as a query parameter.
    """
    try:
        bet_id = req.args.get('id')
        if not bet_id:
            return make_error_response("id is required", status=400)
            
        result = BettingManager().get_bet(bet_id)
        if not result:
            return make_error_response("Bet not found", status=404)
            
        return make_success_response(result)
    except Exception as e:
        logger.error(f"Get bet error: {e}")
        return make_error_response(str(e))


@https_fn.on_request(timeout_sec=300, cors=cors_options)
def check_bet_results(req: https_fn.Request) -> https_fn.Response:
    """
    Check status of placed bets and update repository.
    """
    try:
        result = BettingManager().check_bet_results()
        return make_success_response(result)
    except Exception as e:
        logger.error(f"Check bet results error: {e}", exc_info=True)
        return make_error_response(str(e))


@scheduler_fn.on_schedule(schedule='0 */2 * * *', timeout_sec=300, memory=options.MemoryOption.GB_1)
def automated_check_bet_results(event: scheduler_fn.ScheduledEvent) -> None:
    """
    Automated scheduler to check bet results every 2 hours.
    """
    try:
        logger.info("Automated bet results check triggered")
        manager = BettingManager()
        manager.check_bet_results()
        logger.info("Automated bet results check completed")
    except Exception as e:
        logger.error(f"Error in automated bet results check: {e}", exc_info=True)


@https_fn.on_call(timeout_sec=60, memory=options.MemoryOption.GB_1)
def save_settings(req: https_fn.CallableRequest) -> Any:
    """
    Save application settings.
    Expects data in the request.data dictionary.
    """
    try:
        settings = req.data
        if not settings:
             raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT, message="Settings data is required")

        manager = SettingsManager()
        result = manager.save_settings(settings)
        return {"status": "success", "settings": result}
    except Exception as e:
        logger.error(f"Error saving settings: {e}", exc_info=True)
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.INTERNAL, message=str(e))


@https_fn.on_call(cors=cors_options)
def user_notifications(req: https_fn.CallableRequest) -> Any:
    """
    Get user notifications.
    """
    try:
        manager = NotificationManager()
        return manager.get_user_notifications()
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}", exc_info=True)
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.INTERNAL, message=str(e))
@https_fn.on_call(cors=cors_options)
def get_bet_history(req: https_fn.CallableRequest) -> Any:
    """
    Get paginated bet history.
    """
    try:
        data = req.data
        limit = data.get("limit", 20)
        start_after_id = data.get("start_after_id")
        status = data.get("status")
        date_range = data.get("date_range")
        
        manager = BettingManager()
        return manager.get_bet_history(limit, start_after_id, status, date_range)
    except Exception as e:
        logger.error(f"Error fetching bet history: {e}", exc_info=True)
        raise https_fn.HttpsError(code=https_fn.FunctionsErrorCode.INTERNAL, message=str(e))

