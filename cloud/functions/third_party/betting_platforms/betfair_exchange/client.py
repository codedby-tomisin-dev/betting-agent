from collections import defaultdict
from datetime import datetime
from typing import List, Dict, Any, Optional
import os
import uuid

import betfairlightweight

from .constants import APP_KEY, CERTS_PATH, PASSWORD, USERNAME
from ..base import BaseBettingPlatform
from core import logger


class BetfairExchange(BaseBettingPlatform):
    def __init__(self, username: Optional[str] = None, password: Optional[str] = None, app_key: Optional[str] = None, certs_path: Optional[str] = None):
        super().__init__()
        self.username = username or USERNAME
        self.password = password or PASSWORD
        self.app_key = app_key or APP_KEY
        self.certs_path = certs_path or CERTS_PATH

        if not all([self.username, self.password, self.app_key, self.certs_path]):
            logger.warning("Betfair credentials not fully set in environment variables.")

        self.client = betfairlightweight.APIClient(
            username=self.username,
            password=self.password,
            app_key=self.app_key,
            certs=self.certs_path,
        )

    def login(self):
        """Log in to Betfair."""
        self.client.login()

    def get_balance(self) -> Dict[str, Any]:
        """
        Get account wallet balance from Betfair.
        
        Returns:
            Dictionary containing balance information:
                - available_balance: Available funds to bet
                - exposure: Current exposure (pending bets)
                - retained_commission: Commission retained
                - exposure_limit: Exposure limit
        """
        account_funds = self.client.account.get_account_funds()
        
        return {
            "available_balance": account_funds.available_to_bet_balance,
            "exposure": account_funds.exposure,
            "retained_commission": account_funds.retained_commission,
            "exposure_limit": account_funds.exposure_limit,
            "discount_rate": account_funds.discount_rate,
            "points_balance": account_funds.points_balance
        }

    def search_market(self, sport: str, competitions: List[str] = [], market_type_codes: Optional[List[str]] = None, text_query: Optional[str] = None, date: Optional[str] = None, all_markets: Optional[bool] = False) -> List[Dict[str, Any]]:
        """
        Search for markets given a sport.
        This implementation looks for default markets if market_type_codes is None.
        Optional text_query allows filtering for specific matches (e.g. 'Man Utd').
        Optional date filters events to a specific date (format: YYYY-MM-DD).
        """
        if market_type_codes is None:
            market_type_codes = ['MATCH_ODDS']
            if all_markets:
                market_type_codes += [
                    'DOUBLE_CHANCE', 'OVER_UNDER', 'OVER_UNDER_05', 'OVER_UNDER_15',
                    'OVER_UNDER_25', 'OVER_UNDER_35', 'OVER_UNDER_45', 'OVER_UNDER_55', 'OVER_UNDER_65',
                    'TOTAL_CARDS', 'OVER_UNDER_05_CARDS', 'OVER_UNDER_15_CARDS',
                    'OVER_UNDER_25_CARDS', 'OVER_UNDER_35_CARDS', 'OVER_UNDER_45_CARDS',
                    'BOTH_TEAMS_TO_SCORE'
                ]

        event_types = self.client.betting.list_event_types(
            filter=betfairlightweight.filters.market_filter(text_query=sport)
        )
        if not event_types:
            logger.info(f"Sport '{sport}' not found.")
            return []

        event_type_id = event_types[0].event_type.id
        
        competition_ids = []
        if competitions:
            for comp_name in competitions:
                comps = self.client.betting.list_competitions(
                    filter=betfairlightweight.filters.market_filter(
                        text_query=comp_name,
                        event_type_ids=[event_type_id]
                    )
                )
                if comps:
                    # First try to find exact match (case-insensitive)
                    exact_matches = [c for c in comps if c.competition.name.lower() == comp_name.lower()]
                    
                    if exact_matches:
                        # Use exact match
                        ids = [c.competition.id for c in exact_matches]
                        competition_ids.extend(ids)
                        logger.info(f"Found exact match for '{comp_name}': {exact_matches[0].competition.name} (IDs: {ids})")
                    else:
                        # Fall back to all matches (log them for user awareness)
                        ids = [c.competition.id for c in comps]
                        comp_names = [c.competition.name for c in comps]
                        competition_ids.extend(ids)
                        logger.warning(f"No exact match for '{comp_name}'. Using partial matches: {comp_names}")
                else:
                    logger.warning(f"Competition '{comp_name}' not found.")
            
            if not competition_ids:
                logger.warning(f"No competitions found for {competitions}")
                return []

        try:
            market_catalogue = self.client.betting.list_market_catalogue(
                filter=betfairlightweight.filters.market_filter(
                    text_query=text_query,
                    event_type_ids=[event_type_id],
                    competition_ids=competition_ids if competition_ids else None,
                    market_type_codes=market_type_codes,
                ),
                max_results=40,
                market_projection=['EVENT', 'RUNNER_METADATA', 'MARKET_START_TIME', 'MARKET_DESCRIPTION', 'COMPETITION']
            )
            
            logger.info(f"Retrieved {len(market_catalogue)} markets from Betfair")
        except Exception as e:
            logger.error(f"Error fetching market catalogue")
            market_catalogue = None

        if not market_catalogue:
            return []

        market_ids = [m.market_id for m in market_catalogue]

        market_books = self.client.betting.list_market_book(
            market_ids=market_ids,
            price_projection=betfairlightweight.filters.price_projection(
                price_data=['EX_BEST_OFFERS']
            )
        )
        
        books_map = {book.market_id: book for book in market_books}

        events_grouped = {}
        for market in market_catalogue:
            book = books_map.get(market.market_id)
            if not book:
                continue

            event_key = (market.event.name, market.market_start_time, market.competition.name if market.competition else None)

            if event_key not in events_grouped:
                events_grouped[event_key] = {
                    'provider_event_id': market.event.id,
                    'name': market.event.name,
                    'time': market.market_start_time,
                    'competition': {
                        'name': market.competition.name if market.competition else None
                    },
                    'options': []
                }

            runner_odds = {}
            for runner in book.runners:
                best_price = runner.ex.available_to_back[0].price if runner.ex.available_to_back else None
                runner_odds[runner.selection_id] = best_price

            market_options = []
            for runner in market.runners:
                price = runner_odds.get(runner.selection_id)

                market_options.append({
                    "name": runner.runner_name,
                    "odds": price,
                    "selection_id": runner.selection_id
                })

            events_grouped[event_key]['options'].append({
                "name": market.description.market_type,
                "market_id": market.market_id,
                "options": market_options,
            })
        
        events = list(events_grouped.values())
        
        # Filter by date if provided
        if date:
            filtered_events = []
            for event in events:
                event_time = event.get('time')
                if isinstance(event_time, datetime):
                    event_date = event_time.strftime('%Y-%m-%d')
                else:
                    logger.error(f"Error filtering event. Invalid event time: {event_time}")
                    continue
                    
                if event_date == date:
                    filtered_events.append(event)
            return filtered_events
            
        return events

    def get_event_markets(self, event_id: str, market_type_codes: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Fetch all available markets for a specific event.
        
        Args:
            event_id: Betfair event ID
            market_type_codes: Optional list of market type codes to filter by.
                              If None, fetches all available market types.
        
        Returns:
            List of market dictionaries with odds and runner information.
        """
        if market_type_codes is None:
            market_type_codes = [
                'MATCH_ODDS', 'DOUBLE_CHANCE', 'OVER_UNDER', 'OVER_UNDER_05', 'OVER_UNDER_15',
                'OVER_UNDER_25', 'OVER_UNDER_35', 'OVER_UNDER_45', 'OVER_UNDER_55', 'OVER_UNDER_65',
                'TOTAL_CARDS', 'OVER_UNDER_05_CARDS', 'OVER_UNDER_15_CARDS',
                'OVER_UNDER_25_CARDS', 'OVER_UNDER_35_CARDS', 'OVER_UNDER_45_CARDS',
                'BOTH_TEAMS_TO_SCORE'
            ]
        
        try:
            market_catalogue = self.client.betting.list_market_catalogue(
                filter=betfairlightweight.filters.market_filter(
                    event_ids=[event_id],
                    market_type_codes=market_type_codes,
                ),
                max_results=100,
                market_projection=['RUNNER_METADATA', 'MARKET_START_TIME', 'MARKET_DESCRIPTION']
            )
            
            if not market_catalogue:
                return []
            
            market_ids = [m.market_id for m in market_catalogue]
            
            market_books = self.client.betting.list_market_book(
                market_ids=market_ids,
                price_projection=betfairlightweight.filters.price_projection(
                    price_data=['EX_BEST_OFFERS']
                )
            )
            
            books_map = {book.market_id: book for book in market_books}
            
            markets = []
            for market in market_catalogue:
                book = books_map.get(market.market_id)
                if not book:
                    continue
                
                runner_odds = {}
                for runner in book.runners:
                    best_price = runner.ex.available_to_back[0].price if runner.ex.available_to_back else None
                    runner_odds[runner.selection_id] = best_price
                
                market_options = []
                for runner in market.runners:
                    price = runner_odds.get(runner.selection_id)
                    market_options.append({
                        "name": runner.runner_name,
                        "odds": price,
                        "selection_id": runner.selection_id
                    })
                
                markets.append({
                    "name": market.description.market_type,
                    "market_id": market.market_id,
                    "options": market_options,
                })
            
            return markets
            
        except Exception as e:
            logger.error(f"Error fetching markets for event {event_id}: {e}", exc_info=True)
            return []

    def place_bets(self, bets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Place multiple bets across potentially different markets.
        Groups bets by market_id and makes separate API calls for each market.
        
        Args:
            bets: List of bet dictionaries, each containing:
                - market_id: str
                - selection_id: int
                - stake: float
                - odds: float
                - side: str (optional, defaults to 'BACK')
        
        Returns:
            Dictionary with overall status and results for each bet.
        """
        
        # Group bets by market_id (Betfair requires same market for batch)
        bets_by_market = defaultdict(list)
        for bet in bets:
            bets_by_market[bet['market_id']].append(bet)
        
        all_results = []
        overall_status = 'SUCCESS'

        # Check for local emulator environment
        if os.environ.get("FUNCTIONS_EMULATOR") == "true":
            logger.warning("Mocking bet placement in local environment.")
            for bet in bets:
                all_results.append({
                    "market_id": bet['market_id'],
                    "selection_id": bet['selection_id'],
                    "status": "SUCCESS",
                    "bet_id": f"mock_bet_{uuid.uuid4()}",
                    "average_price_matched": bet['odds'],
                    "size_matched": bet['stake']
                })
            
            return {
                "status": "SUCCESS",
                "bets": all_results
            }
        
        # Process each market's bets
        for market_id, market_bets in bets_by_market.items():
            instructions = []
            
            for bet in market_bets:
                limit_order = betfairlightweight.filters.limit_order(
                    size=bet['stake'],
                    price=bet['odds'],
                    persistence_type='LAPSE'
                )
                
                instruction = betfairlightweight.filters.place_instruction(
                    order_type='LIMIT',
                    selection_id=bet['selection_id'],
                    side=bet.get('side', 'BACK'),
                    limit_order=limit_order
                )
                instructions.append(instruction)
            
            # Place all bets for this market
            place_orders = self.client.betting.place_orders(
                market_id=market_id,
                instructions=instructions
            )
            
            # Process results
            if place_orders.status != 'SUCCESS':
                overall_status = 'FAILURE'
            
            for i, report in enumerate(place_orders.place_instruction_reports):
                result = {
                    'market_id': market_id,
                    'selection_id': market_bets[i]['selection_id'],
                    'status': report.status,
                }
                
                if report.status == 'SUCCESS':
                    result['bet_id'] = report.bet_id
                    result['average_price_matched'] = report.average_price_matched
                    result['size_matched'] = report.size_matched
                else:
                    result['error_code'] = report.error_code
                    overall_status = 'PARTIAL_FAILURE' if overall_status == 'SUCCESS' else 'FAILURE'
                
                all_results.append(result)
        
        return {
            'status': overall_status,
            'bets': all_results
        }

    def list_cleared_orders(self, bet_ids: Optional[List[str]] = None, settled_date_range: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """
        List cleared (settled) orders.
        
        Args:
            bet_ids: Optional list of bet IDs to filter by.
            settled_date_range: Optional tuple of (start_datetime, end_datetime).
            
        Returns:
            List of cleared orders with status and P/L.
        """
        # Create filter filter
        if bet_ids:
            filter_kwargs = {"bet_ids": bet_ids}
        else:
            filter_kwargs = {}
            
        if settled_date_range:
            time_range = betfairlightweight.filters.time_range(
                from_=settled_date_range[0].strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                to_=settled_date_range[1].strftime("%Y-%m-%dT%H:%M:%S.000Z")
            )
            filter_kwargs["settled_date_range"] = time_range

        # Only create market_filter if we are filtering by bet_ids? 
        # Actually list_cleared_orders takes specific args like bet_ids directly or in the body.
        # betfairlightweight API: client.betting.list_cleared_orders(bet_ids=[...], ...)
        
        # It seems bet_ids is a direct argument, not inside market_filter for list_cleared_orders
        
        cleared_orders = self.client.betting.list_cleared_orders(
            bet_status="SETTLED",
            bet_ids=bet_ids if bet_ids else None,
            settled_date_range=filter_kwargs.get("settled_date_range")
        )
        
        results = []
        if cleared_orders and cleared_orders.orders:
            for order in cleared_orders.orders:
                results.append({
                    "bet_id": order.bet_id,
                    "market_id": order.market_id,
                    "selection_id": order.selection_id,
                    "status": "WON" if order.profit > 0 else "LOST", 
                    "profit": order.profit,
                    "settled_date": order.settled_date,
                    "side": order.side,
                    "price_requested": order.price_requested,
                    "price_matched": order.price_matched,
                    "size_settled": order.size_settled
                })
                
        return results
