export type {
    Bet,
    BetSelectionItem,
    BetWager,
    BetBalance,
    BetEvent,
    MarketOption,
    SelectionOption,
    SelectionEventGroup,
    BetStatus,
} from '@/shared/types';

/**
 * Added selection item with unique ID for tracking
 */
export interface AddedSelectionItem {
    id: string;
    event: string;
    market: string;
    odds: number;
    stake: number;
    market_id?: string;
    selection_id?: string | number;
}

/**
 * State for bet modifications (stakes, added/removed selections)
 */
export interface BetModificationState {
    editedStakes: Record<string, number>;
    addedSelections: AddedSelectionItem[];
    removedIndices: Set<number>;
}

/**
 * Totals calculated for a bet
 */
export interface BetTotals {
    totalStake: number;
    totalReturns: number;
}
