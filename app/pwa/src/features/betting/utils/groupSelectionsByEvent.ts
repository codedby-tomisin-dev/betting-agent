import { BetSelectionItem, SelectionEventGroup } from '@/shared/types';
import { AddedSelectionItem } from '../types';

interface ItemWithMetadata {
    event: string;
    market: string;
    odds: number;
    stake: number;
    market_id?: string;
    selection_id?: string | number;
    stableId: string;
    isOriginal: boolean;
    originalIndex?: number;
    addedIndex?: number;
}

/**
 * Group selections by event name for display
 */
export function groupSelectionsByEvent(
    originalItems: BetSelectionItem[],
    addedItems: AddedSelectionItem[],
    removedIndices: Set<number>
): SelectionEventGroup[] {
    const originalWithMetadata: ItemWithMetadata[] = originalItems
        .map((item, idx) => ({
            event: item.event,
            market: item.market,
            odds: item.odds,
            stake: item.stake,
            market_id: item.market_id,
            selection_id: item.selection_id,
            originalIndex: idx,
            isOriginal: true as const,
            stableId: `original_${idx}`
        }))
        .filter((_, idx) => !removedIndices.has(idx));

    const addedWithMetadata: ItemWithMetadata[] = addedItems.map((item, idx) => ({
        event: item.event,
        market: item.market,
        odds: item.odds,
        stake: item.stake,
        market_id: item.market_id,
        selection_id: item.selection_id,
        addedIndex: idx,
        isOriginal: false as const,
        stableId: `added_${item.id}`
    }));

    const itemsWithIndices: ItemWithMetadata[] = [...originalWithMetadata, ...addedWithMetadata];

    const groups: Record<string, SelectionEventGroup> = {};

    itemsWithIndices.forEach((item) => {
        const eventName = item.event || "Unknown Event";
        if (!groups[eventName]) {
            groups[eventName] = {
                event: eventName,
                markets: []
            };
        }
        groups[eventName].markets.push({
            market: item.market,
            odds: item.odds,
            stake: item.stake,
            potential_returns: item.stake * item.odds,
            market_id: item.market_id,
            selection_id: item.selection_id,
            stableId: item.stableId,
            isOriginal: item.isOriginal,
            originalIndex: item.originalIndex,
            addedIndex: item.addedIndex
        });
    });

    return Object.values(groups);
}
