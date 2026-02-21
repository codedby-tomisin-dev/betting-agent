# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

from firebase_functions import https_fn, scheduler_fn, options, firestore_fn
from firebase_admin import initialize_app, firestore
from firebase_functions.options import set_global_options, CorsOptions, MemoryOption
from pydantic import ValidationError

import json
from core import logger
from core.migrations.migrate_bet_slips import run_migration, migrate_single_document
from core.modules.betting.manager import BettingManager
from core.modules.betting.models import AnalyzeBetsRequest, GetOddsRequest, PlaceBetRequest
from typing import Any
from core.modules.betting.repository import BetRepository
from core.modules.settings.manager import SettingsManager
from utils.responses import make_error_response, make_success_response
from constants import RELIABLE_TEAMS, RELIABLE_COMPETITIONS, RELIABLE_ALL_TEAMS
from core.modules.notifications import NotificationManager
from core.modules.learnings.manager import LearningsManager


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
        settings = SettingsManager().get_betting_settings()
        
        if not settings.automation_enabled:
            logger.info("Automation is disabled in settings. Skipping execution.")
            return

        result = BettingManager().execute_automated_betting(
            competitions=RELIABLE_COMPETITIONS,
            bankroll_percent=settings.bankroll_percent,
            max_bankroll=settings.max_bankroll,
            reliable_teams=RELIABLE_ALL_TEAMS if settings.use_reliable_teams else None,
            risk_appetite=settings.risk_appetite,
        )
        logger.info(f"Automated betting intent created: {result}")
    except Exception as e:
        logger.error(f"Error in automated daily betting scheduler: {e}", exc_info=True)


@scheduler_fn.on_schedule(
    schedule='55 * * * *',
    memory=MemoryOption.GB_1,
    timeout_sec=300
)
def hourly_automated_betting(event: scheduler_fn.ScheduledEvent) -> None:
    """
    Automated betting scheduler that runs hourly.
    Sources games starting in the next hour from ALL leagues, analyzes them, and places bets.
    """
    try:
        logger.info("Hourly automated betting scheduler triggered")
        settings = SettingsManager().get_betting_settings()
        
        if not settings.automation_enabled:
            logger.info("Automation is disabled in settings. Skipping execution.")
            return

        result = BettingManager().execute_hourly_automated_betting(
            bankroll_percent=settings.bankroll_percent,
            max_bankroll=settings.max_bankroll,
            risk_appetite=settings.risk_appetite,
        )
        logger.info(f"Hourly automated betting result: {result}")
    except Exception as e:
        logger.error(f"Error in hourly automated betting scheduler: {e}", exc_info=True)


@https_fn.on_request(
    timeout_sec=300,
    memory=MemoryOption.GB_1,
    cors=cors_options
)
def hourly_automated_betting_http(req: https_fn.Request) -> https_fn.Response:
    """
    HTTP endpoint for hourly automated betting.
    Sources games starting in the next hour from ALL leagues, analyzes them, and places bets.
    """
    try:
        logger.info("Hourly automated betting HTTP endpoint triggered")
        settings = SettingsManager().get_betting_settings()
        result = BettingManager().execute_hourly_automated_betting(
            bankroll_percent=settings.bankroll_percent,
            max_bankroll=settings.max_bankroll,
            risk_appetite=settings.risk_appetite,
        )
        return make_success_response(result)
    except Exception as e:
        logger.error(f"Error in hourly automated betting HTTP endpoint: {e}", exc_info=True)
        return make_error_response(str(e))


@scheduler_fn.on_schedule(
    schedule='0 12 * * *',
    memory=MemoryOption.GB_1,
    timeout_sec=300,
)
def automated_suggestion_promotion(event: scheduler_fn.ScheduledEvent) -> None:
    """
    Automated scheduler to promote suggestions to bet slips.
    Runs daily at 12:00 London time.
    """
    try:
        logger.info("Automated suggestion promotion scheduler triggered")
        manager = BettingManager()
        result = manager.promote_suggestions_to_bets()
        logger.info(f"Suggestion promotion result: {result}")
    except Exception as e:
        logger.error(f"Error in automated suggestion promotion: {e}", exc_info=True)


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
        target_date = req.args.get('date', None)
        settings = SettingsManager().get_betting_settings()
        result = BettingManager().execute_automated_betting(
            competitions=RELIABLE_COMPETITIONS,
            bankroll_percent=settings.bankroll_percent,
            max_bankroll=settings.max_bankroll,
            reliable_teams=RELIABLE_ALL_TEAMS if settings.use_reliable_teams else None,
            risk_appetite=settings.risk_appetite,
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
        
        settings = SettingsManager().get_betting_settings()
        min_profit = preferences.get("min_profit", settings.min_profit)
        
        # Create AnalyzeBetsRequest object
        analysis_request = AnalyzeBetsRequest(
            events=data.get("events", []),
            risk_appetite=risk_appetite,
            budget=budget,
            min_profit=min_profit
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


@firestore_fn.on_document_created(document="suggestions/{suggestionId}", timeout_sec=540, memory=options.MemoryOption.GB_1)
def analyze_suggestion(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    """
    Triggered when a new suggestion is created in Firestore.
    Performs AI analysis on the events and updates the suggestion with selections.
    """
    try:
        snapshot = event.data
        if not snapshot:
            return

        data = snapshot.to_dict()
        suggestion_id = event.params["suggestionId"]
        
        # Only analyze if status is 'intent' (initial state)
        if data.get("status") != "intent":
             logger.info(f"Skipping suggestion analysis for {suggestion_id}: status is {data.get('status')}")
             return

        logger.info(f"Starting analysis for suggestion {suggestion_id}")
        
        preferences = data.get("preferences", {})
        budget = preferences.get("budget", 10.0)
        risk_appetite = preferences.get("risk_appetite", 3.0)
        
        settings = SettingsManager().get_betting_settings()
        min_profit = preferences.get("min_profit", settings.min_profit)
        
        # Create AnalyzeBetsRequest object
        analysis_request = AnalyzeBetsRequest(
            events=data.get("events", []),
            risk_appetite=risk_appetite,
            budget=budget,
            min_profit=min_profit
        )
        
        manager = BettingManager()
        recommendations = manager.analyze_betting_opportunities(analysis_request)
        manager.update_suggestion_analysis(suggestion_id, recommendations)

        logger.info(f"Analysis completed for suggestion {suggestion_id}")
        
    except Exception as e:
        logger.error(f"Error analyzing suggestion {event.params['suggestionId']}: {e}", exc_info=True)
        # We don't mark suggestions as failed in the same way, or maybe we should?
        # For now just log errors.


@firestore_fn.on_document_written(document="bet_slips/{betId}", timeout_sec=60, memory=options.MemoryOption.GB_1)
def place_bet_on_ready(event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot]]) -> None:
    """Triggered when a bet document is created or updated to 'ready' status. Places the bets on Betfair."""
    try:
        if not event.data.after.exists:
            # Document deleted
            return

        after = event.data.after.to_dict()
        bet_id = event.params["betId"]
        status = after.get("status")

        # Check if we should place the bet:
        # 1. Status is 'ready'
        # 2. It's either a new document OR the status wasn't 'ready' before
        
        is_ready = status == "ready"
        was_ready = False
        
        if event.data.before and event.data.before.exists:
            before = event.data.before.to_dict()
            was_ready = before.get("status") == "ready"

        if is_ready and not was_ready:
            logger.info(f"Placing bets for ready intent {bet_id}")
            
            db = firestore.client()
            transaction = db.transaction()
            doc_ref = db.collection("bet_slips").document(bet_id)
            
            @firestore.transactional
            def proceed_with_placement(transaction, doc_ref):
                snapshot = doc_ref.get(transaction=transaction)
                if not snapshot.exists:
                    return None
                    
                current_data = snapshot.to_dict()
                if current_data.get("status") != "ready":
                    return None
                    
                transaction.update(doc_ref, {"status": "processing"})
                return current_data
                
            transaction_data = proceed_with_placement(transaction, doc_ref)
            
            if transaction_data:
                manager = BettingManager()
                manager.prepare_and_place_bets_from_ready_doc(bet_id, transaction_data)
                logger.info(f"Bets placed for {bet_id}")
            else:
                logger.info(f"Bet {bet_id} is no longer 'ready'. Skipping to avoid duplicate placement.")
            
    except Exception as e:
        logger.error(f"Error placing bets for {event.params['betId']}: {e}", exc_info=True)
        try:
            BettingManager().mark_bet_failed(event.params['betId'], f"Placement failed: {str(e)}")
        except:
            pass


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
def get_event_markets(req: https_fn.Request) -> https_fn.Response:
    """
    Get all available markets for a specific event.
    Query parameters:
        event_id (required): Betfair event ID
        market_types (optional): Comma-separated list of market type codes
    """
    try:
        event_id = req.args.get('event_id')
        if not event_id:
            return make_error_response("event_id is required", status=400)
        
        market_types_param = req.args.get('market_types')
        market_type_codes = market_types_param.split(',') if market_types_param else None
        
        from third_party.betting_platforms.betfair_exchange import BetfairExchange
        betfair = BetfairExchange()
        betfair.login()
        
        result = betfair.get_event_markets(event_id, market_type_codes)
        return make_success_response(data=result)
    except Exception as e:
        logger.error(f"Get event markets error: {e}", exc_info=True)
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
        
        result = BettingManager().create_and_place_bet(request=request_data)
        return make_success_response(result)
    except ValidationError as e:
        logger.error(f"Place bet validation error: {e}")
        return https_fn.Response(str(e), status=400)
    except Exception as e:
        logger.error(f"Place bet error: {e}")
        return make_error_response(str(e))


@https_fn.on_request(timeout_sec=60, memory=options.MemoryOption.MB_256, cors=cors_options)
def refresh_balance(req: https_fn.Request) -> https_fn.Response:
    """Force sync the wallet balance with Betfair and update Firestore."""
    try:
        from core.modules.wallet.service import WalletService
        wallet = WalletService().sync_balance()
        if wallet:
            return make_success_response({"status": "success", "balance": wallet.amount, "currency": wallet.currency})
        else:
            return make_error_response("Failed to sync wallet")
    except Exception as e:
        logger.error(f"Refresh balance error: {e}")
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

    settings_manager = SettingsManager()

    data.setdefault('risk_appetite', settings_manager.get_setting('RISK_APPETITE', 3))
    data.setdefault('budget', settings_manager.get_setting('BUDGET', settings_manager.get_setting('DEFAULT_BUDGET', 100)))
    data.setdefault('min_profit', settings_manager.get_setting('MIN_PROFIT', 0.0))

    analysis_request = AnalyzeBetsRequest(**data)
    
    try:
        result = BettingManager().analyze_betting_opportunities(analysis_request)
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


@scheduler_fn.on_schedule(schedule='*/15 * * * *', timeout_sec=300, memory=options.MemoryOption.GB_1)
def automated_check_bet_results(event: scheduler_fn.ScheduledEvent) -> None:
    """
    Automated scheduler to check bet results every 30 minutes.
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


@https_fn.on_request(timeout_sec=300, cors=cors_options)
# @https_fn.on_call(timeout_sec=60, memory=options.MemoryOption.GB_1)
def get_upcoming_games(req: https_fn.CallableRequest) -> Any:
    """
    Get all upcoming games based on user settings.
    Optional query parameter 'date' (YYYY-MM-DD) to filter by specific date.
    """
    manager = BettingManager()
    result = []
    
    try:
        date = req.args.get('date')
        competitions = req.args.get('competitions', None)
        if competitions != None:
            competitions = competitions.split(',')
            
        result = manager.get_all_upcoming_games(sport="Soccer", date=date, competitions=competitions)
    except Exception as e:
        logger.error(f"Error fetching upcoming games: {e}", exc_info=True)
        return make_error_response(str(e), as_dict=True)

    return make_success_response(result, as_dict=True)


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


@https_fn.on_request(cors=cors_options)
def migrate_bet_slips(req: https_fn.Request) -> https_fn.Response:
    """
    Run migration on bet_slips documents to convert from legacy to new format.
    
    Query params:
        dry_run: If 'false', actually update documents (default: 'true')
        doc_id: If provided, migrate only this single document
    """
    try:
        
        # Parse params from query string or JSON body
        if req.method == "POST" and req.is_json:
            data = req.get_json() or {}
        else:
            data = {}
        
        # Query params override body
        dry_run_param = req.args.get("dry_run", data.get("dry_run", "true"))
        dry_run = dry_run_param.lower() != "false" if isinstance(dry_run_param, str) else dry_run_param
        doc_id = req.args.get("doc_id", data.get("doc_id"))
        
        if doc_id:
            result = migrate_single_document(doc_id, dry_run=dry_run)
        else:
            result = run_migration(dry_run=dry_run)
        
        return https_fn.Response(
            json.dumps(result, default=str),
            status=200,
            content_type="application/json"
        )
    except Exception as e:
        logger.error(f"Error running migration: {e}", exc_info=True)
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            content_type="application/json"
        )


@firestore_fn.on_document_updated(document="bet_slips/{betId}", timeout_sec=540, memory=options.MemoryOption.GB_1)
def analyze_finished_hourly_bet(event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot]]) -> None:
    """
    Triggered when a bet slip document is updated.
    Checks if a bet slip from 'hourly_automated' just transitioned to 'finished'.
    If so, sends it to the Learning Agent to extract insights and update learnings.
    """
    try:
        before_data = event.data.before.to_dict() if event.data.before else {}
        after_data = event.data.after.to_dict() if event.data.after else {}

        if not after_data:
            return

        bet_id = event.params["betId"]
        source = after_data.get("source")
        target_status = after_data.get("status")
        previous_status = before_data.get("status")

        # Only process hourly automated bets that JUST finished
        if source != "hourly_automated" or target_status != "finished" or previous_status == "finished":
            return

        logger.info(f"Hourly automated bet {bet_id} finished. Passing to Learnings Agent.")
        
        manager = LearningsManager()
        manager.analyze_finished_bet(after_data)

    except Exception as e:
        logger.error(f"Error analyzing finished bet {event.params['betId']} for learnings: {e}", exc_info=True)


@https_fn.on_request(timeout_sec=540, memory=options.MemoryOption.GB_1)
def learn_from_all_bets(req: https_fn.Request) -> https_fn.Response:
    """
    HTTP Callable to manually trigger a bulk learning analysis 
    on all currently finished bets in parallel.
    """
    try:
        from core.modules.learnings.manager import LearningsManager
        
        # We can extract a limit parameter from data if provided, else default to 100
        limit = req.data.get("limit", 100) if isinstance(req.data, dict) else 100
        
        manager = LearningsManager()
        count = manager.analyze_all_finished_bets(limit=limit)
        
        return make_success_response({
            "status": "success",
            "message": f"Successfully analyzed {count} finished bets and updated the learning document."
        })
    except Exception as e:
        logger.error(f"Error in learn_from_all_bets callable: {e}", exc_info=True)
        return make_error_response(str(e), as_dict=True)



@https_fn.on_request(cors=cors_options)
def test_learnings_http(req: https_fn.Request) -> https_fn.Response:
    """Manual trigger to test LearningsManager via HTTP."""
    try:
        data = req.get_json() if req.is_json else {}
        manager = LearningsManager()
        manager.analyze_finished_bet(data)
        return make_success_response({"status": "success"})
    except Exception as e:
        logger.error(f"Error in test_learnings_http: {e}", exc_info=True)
        return make_error_response(str(e))
