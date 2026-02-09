import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Bet, BetSelectionItem, MarketOption, SelectionOption, BetEvent } from '@/shared/types';
import { AddedSelectionItem } from '../types';

/**
 * Hook to manage stake edits, added/removed selections for a single bet
 */
export function useBetModifications(bet: Bet) {
    const [editedStakes, setEditedStakes] = useState<Record<string, number>>({});
    const [addedSelections, setAddedSelections] = useState<AddedSelectionItem[]>([]);
    const [removedIndices, setRemovedIndices] = useState<Set<number>>(new Set());

    const updateSelectionStake = useCallback((
        stableId: string,
        value: number,
        maxBalance: number
    ) => {
        const cappedValue = Math.min(value, maxBalance);
        setEditedStakes(prev => ({
            ...prev,
            [stableId]: cappedValue
        }));
    }, []);

    const addMarketSelectionToBet = useCallback((
        eventName: string,
        market: MarketOption,
        selection: SelectionOption
    ) => {
        // Find full event details from the bet object
        const fullEvent = bet.events?.find(e => e.name === eventName);

        const newSelection: AddedSelectionItem = {
            id: crypto.randomUUID(),
            event: {
                name: eventName,
                time: fullEvent?.time || new Date().toISOString(),
                competition: {
                    name: fullEvent?.competition.name || "Unknown"
                }
            },
            market: selection.name,
            market_name: market.name,
            selection_name: selection.name,
            odds: selection.odds,
            stake: 10,
            market_id: market.market_id,
            selection_id: selection.selection_id,
        };

        setAddedSelections(prev => [...prev, newSelection]);
        toast.success(`Added ${selection.name} to ${eventName}`);
    }, [bet.events]);

    const addNewMatchToBet = useCallback((
        event: BetEvent,
        market: MarketOption,
        selection: SelectionOption
    ) => {
        const newSelection: AddedSelectionItem = {
            id: crypto.randomUUID(),
            event: event,
            market: selection.name,
            market_name: market.name,
            selection_name: selection.name,
            odds: selection.odds,
            stake: 10,
            market_id: market.market_id,
            selection_id: selection.selection_id,
        };

        setAddedSelections(prev => [...prev, newSelection]);
        toast.success(`Added ${event.name} - ${selection.name}`);
    }, []);

    const removeSelectionFromBet = useCallback((
        absoluteIndex: number,
        originalItemsLength: number
    ) => {
        if (absoluteIndex >= originalItemsLength) {
            const addedIndex = absoluteIndex - originalItemsLength;
            setAddedSelections(prev => prev.filter((_, idx) => idx !== addedIndex));
        } else {
            setRemovedIndices(prev => {
                const newRemoved = new Set(prev);
                newRemoved.add(absoluteIndex);
                return newRemoved;
            });
        }
        toast.success("Market removed");
    }, []);

    const getEffectiveStake = useCallback((stableId: string, originalStake: number) => {
        return editedStakes[stableId] ?? originalStake;
    }, [editedStakes]);

    const getFinalSelections = useCallback((): BetSelectionItem[] => {
        const originalItems = bet.selections?.items || [];

        const updatedOriginalItems = originalItems
            .filter((_, idx) => !removedIndices.has(idx))
            .map((item, filteredIdx) => {
                let actualOriginalIndex = 0;
                let count = 0;
                for (let i = 0; i < originalItems.length; i++) {
                    if (!removedIndices.has(i)) {
                        if (count === filteredIdx) {
                            actualOriginalIndex = i;
                            break;
                        }
                        count++;
                    }
                }

                const stableId = `original_${actualOriginalIndex}`;
                const editedStake = editedStakes[stableId];
                return editedStake !== undefined ? { ...item, stake: editedStake } : item;
            });

        const updatedAddedItems = addedSelections.map((item) => {
            const stableId = `added_${item.id}`;
            const editedStake = editedStakes[stableId];
            const baseItem: BetSelectionItem = {
                event: item.event, // Already structured in addMarketSelectionToBet/addNewMatchToBet
                market: item.market,
                odds: item.odds,
                stake: item.stake,
                market_id: item.market_id,
                selection_id: item.selection_id,
            };
            return editedStake !== undefined ? { ...baseItem, stake: editedStake } : baseItem;
        });

        return [...updatedOriginalItems, ...updatedAddedItems];
    }, [bet.selections?.items, removedIndices, editedStakes, addedSelections]);

    const resetModifications = useCallback(() => {
        setEditedStakes({});
        setAddedSelections([]);
        setRemovedIndices(new Set());
    }, []);

    return {
        editedStakes,
        addedSelections,
        removedIndices,
        updateSelectionStake,
        addMarketSelectionToBet,
        addNewMatchToBet,
        removeSelectionFromBet,
        getEffectiveStake,
        getFinalSelections,
        resetModifications,
    };
}
