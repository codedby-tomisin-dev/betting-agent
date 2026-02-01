/* eslint-disable @typescript-eslint/no-explicit-any */
export interface BetSelectionItem {
    event: string;
    market: string;
    odds: number;
}

export interface BetSelectionFullItem extends BetSelectionItem {
    stake: number;
    market_id: string;
    selection_id: number | string;
    side: string;
    reasoning?: string;
}

export interface BetWager {
    odds: number;
    stake: number;
    potential_returns: number;
}

export interface BetPreferences {
    risk_appetite: number;
    budget: number;
    reliable_teams_only: boolean;
    competitions: string[];
}

export interface BetBalance {
    starting: number;
    predicted: number | null;
    ending: number | null;
}

export interface BetSlip {
    id: string;
    target_date: string;
    status: 'intent' | 'analyzed' | 'approved' | 'ready' | 'placed' | 'settled' | 'finished' | 'failed' | 'skipped' | 'existing';
    preferences: BetPreferences;
    balance: BetBalance;
    selections: {
        items: BetSelectionItem[];
        wager: BetWager;
    };
    selections_full?: BetSelectionFullItem[];
    ai_reasoning?: string;
    analyzed_at?: any; // Firestore Timestamp or Date
    approved_at?: any;
    placed_at?: any;
    finished_at?: any;
    realized_returns?: number;

    // Legacy or other fields
    error?: string;
    events?: any[];
}
