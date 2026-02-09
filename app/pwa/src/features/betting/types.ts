export type {
    Bet,
    BetSelectionItem,
    BetWager,
    BetBalance,
    BetEvent,
    EventInfo,
    MarketOption,
    SelectionOption,
    SelectionEventGroup,
    SelectionMarketItem,
    Competition,
    BetStatus,
} from '@/shared/types';

/**
 * Added selection item with unique ID for tracking
 */
export interface AddedSelectionItem {
    id: string;
    event: import('@/shared/types').EventInfo;
    market: string;
    odds: number;
    stake: number;
    market_id: string;
    selection_id: string | number;
    reasoning?: string;
}

/**
 * State for bet modifications
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
