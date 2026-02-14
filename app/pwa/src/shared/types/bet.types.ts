import { Timestamp } from 'firebase/firestore';

/**
 * Unified bet status
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
 * Competition reference
 */
export interface Competition {
    name: string;
}

/**
 * Core event info - used by selections and full events
 */
export interface EventInfo {
    name: string;
    time: string;
    competition: Competition;
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
 * Full event with available markets
 */
export interface BetEvent extends EventInfo {
    provider_event_id?: string;
    options?: MarketOption[];
}

/**
 * Individual bet selection item
 */
export interface BetSelectionItem {
    event: EventInfo;
    market: string;
    odds: number;
    stake: number;
    market_name?: string;
    selection_name?: string;
    market_id?: string;
    selection_id?: string | number;
    side?: string;
    reasoning?: string;
}

/**
 * Wager totals
 */
export interface BetWager {
    odds: number;
    stake: number;
    potential_returns: number;
}

/**
 * Balance information
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
 * Market display item within a grouped selection
 */
export interface SelectionMarketItem {
    market: string;
    odds: number;
    stake: number;
    potential_returns: number;
    market_id?: string;
    selection_id?: string | number;
    reasoning?: string;
    stableId: string;
    isOriginal: boolean;
    originalIndex?: number;
    addedIndex?: number;
}

/**
 * Grouped selection for UI display
 */
export interface SelectionEventGroup {
    event: EventInfo;
    markets: SelectionMarketItem[];
}

/**
 * AI Analysis Response
 */
export interface AIAnalysisResponse {
    total_stake: number;
    total_returns: number;
    selections: {
        items: BetSelectionItem[];
        wager: BetWager;
    };
    overall_reasoning: string;
}
