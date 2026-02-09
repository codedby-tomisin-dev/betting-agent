import { BetSelectionItem, SelectionEventGroup, EventInfo } from '@/shared/types';
import { AddedSelectionItem } from '../types';
import { getEventId, parseEventInfo } from '../models/BetSelectionModel';

interface ItemWithMetadata {
    event: EventInfo;
    market: string;
    odds: number;
    stake: number;
    market_id?: string;
    selection_id?: string | number;
    reasoning?: string;
    stableId: string;
    isOriginal: boolean;
    originalIndex?: number;
    addedIndex?: number;
}

/**
 * Group selections by event for display
 */
export function groupSelectionsByEvent(
    originalItems: BetSelectionItem[],
    addedItems: AddedSelectionItem[],
    removedIndices: Set<number>
): SelectionEventGroup[] {
    const originalWithMetadata: ItemWithMetadata[] = originalItems
        .filter((_, idx) => !removedIndices.has(idx))
        .map((item, idx) => ({
            event: parseEventInfo(item.event as any),
            market: item.market,
            odds: item.odds,
            stake: item.stake,
            market_id: item.market_id,
            selection_id: item.selection_id,
            reasoning: item.reasoning,
            originalIndex: idx,
            isOriginal: true,
            stableId: `original_${idx}`
        }));

    const addedWithMetadata: ItemWithMetadata[] = addedItems.map((item, idx) => ({
        event: item.event,
        market: item.market,
        odds: item.odds,
        stake: item.stake,
        market_id: item.market_id,
        selection_id: item.selection_id,
        reasoning: item.reasoning,
        addedIndex: idx,
        isOriginal: false,
        stableId: `added_${item.id}`
    }));

    const itemsWithIndices = [...originalWithMetadata, ...addedWithMetadata];

    const groups: Record<string, SelectionEventGroup> = {};

    itemsWithIndices.forEach((item) => {
        const eventKey = getEventId(item.event);

        if (!groups[eventKey]) {
            groups[eventKey] = {
                event: item.event,
                markets: []
            };
        }

        groups[eventKey].markets.push({
            market: item.market,
            odds: item.odds,
            stake: item.stake,
            potential_returns: item.stake * item.odds,
            market_id: item.market_id,
            selection_id: item.selection_id,
            reasoning: item.reasoning,
            stableId: item.stableId,
            isOriginal: item.isOriginal,
            originalIndex: item.originalIndex,
            addedIndex: item.addedIndex
        });
    });

    return Object.values(groups);
}
