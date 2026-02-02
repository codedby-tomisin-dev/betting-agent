import { Timestamp } from 'firebase/firestore';

/**
 * Unified bet status - superset of all possible statuses
 */
export type BetStatus =
    | 'intent'
    | 'analyzed'
    | 'approved'
    | 'ready'
    | 'placed'
    | 'settled'
    | 'finished'
    | 'failed'
    | 'skipped'
    | 'existing';

/**
 * Individual bet selection item
 */
export interface BetSelectionItem {
    event: string;
    market: string;
    odds: number;
    stake: number;
    market_id?: string;
    selection_id?: string | number;
    side?: string;
    reasoning?: string;
}

/**
 * Wager totals for a bet
 */
export interface BetWager {
    odds: number;
    stake: number;
    potential_returns: number;
}

/**
 * Balance information for a bet
 */
export interface BetBalance {
    starting: number;
    predicted?: number | null;
    ending?: number | null;
}

/**
 * User preferences for bet analysis
 */
export interface BetPreferences {
    risk_appetite: number;
    budget: number;
    reliable_teams_only: boolean;
    competitions: string[];
}

/**
 * Selection option within a market
 */
export interface SelectionOption {
    name: string;
    selection_id: string | number;
    odds: number;
}

/**
 * Market option within an event
 */
export interface MarketOption {
    name: string;
    market_id: string;
    options?: SelectionOption[];
}

/**
 * Event with available markets
 */
export interface BetEvent {
    event_name: string;
    competition_name: string;
    event_time: string;
    options?: MarketOption[];
}

/**
 * Result from bet placement
 */
export interface PlacementResult {
    bet_id: string;
    market_id: string;
    selection_id: string | number;
    placed_date: string;
}

/**
 * Result from bet settlement
 */
export interface SettlementResult {
    market_id: string;
    selection_id: string | number;
    status: 'WIN' | 'LOSE' | 'VOID';
    profit: number;
    sizeMatched: number;
    betId: string;
}

/**
 * Main Bet interface - single source of truth
 * Merged from Bet (api.ts) and BetSlip (types.ts)
 */
export interface Bet {
    id: string;
    status: BetStatus;
    created_at: Timestamp | Date;
    target_date: string;
    events?: BetEvent[];
    selections?: {
        items: BetSelectionItem[];
        wager: BetWager;
    };
    balance?: BetBalance;
    preferences?: BetPreferences;
    ai_reasoning?: string;
    placement_results?: PlacementResult[];
    settlement_results?: SettlementResult[];
    analyzed_at?: Timestamp | Date;
    approved_at?: Timestamp | Date;
    placed_at?: Timestamp | Date;
    finished_at?: Timestamp | Date;
    realized_returns?: number;
    error?: string;
}

/**
 * Grouped selection for UI display - selections grouped by event
 */
export interface SelectionEventGroup {
    event: string;
    markets: Array<{
        market: string;
        odds: number;
        stake: number;
        potential_returns: number;
        market_id?: string;
        selection_id?: string | number;
        stableId: string;
        isOriginal: boolean;
        originalIndex?: number;
        addedIndex?: number;
    }>;
}
