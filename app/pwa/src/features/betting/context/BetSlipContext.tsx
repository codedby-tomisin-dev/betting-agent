"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { BetSelectionItem } from "@/shared/types";

export interface BetSlipSelection extends BetSelectionItem {
    id: string; // Unique identifier for each selection in the slip
}

interface BetSlipContextType {
    selections: BetSlipSelection[];
    addSelection: (selection: Omit<BetSlipSelection, 'id'>) => void;
    removeSelection: (id: string) => void;
    removeByMarket: (marketId: string, selectionId: string | number) => void;
    toggleSelection: (selection: Omit<BetSlipSelection, 'id'>) => void;
    updateStake: (id: string, stake: number) => void;
    clearSlip: () => void;
    isInSlip: (marketId: string, selectionId: string | number) => boolean;
    totalStake: number;
    totalReturns: number;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

const STORAGE_KEY = 'betslip_selections';

export function BetSlipProvider({ children }: { children: ReactNode }) {
    const [selections, setSelections] = useState<BetSlipSelection[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setSelections(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load bet slip from storage:', e);
        }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
        } catch (e) {
            console.error('Failed to save bet slip to storage:', e);
        }
    }, [selections]);

    const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const addSelection = useCallback((selection: Omit<BetSlipSelection, 'id'>) => {
        setSelections(prev => {
            // Check if already exists
            const exists = prev.some(
                s => s.market_id === selection.market_id && s.selection_id === selection.selection_id
            );
            if (exists) return prev;

            return [...prev, { ...selection, id: generateId() }];
        });
    }, []);

    const removeSelection = useCallback((id: string) => {
        setSelections(prev => prev.filter(s => s.id !== id));
    }, []);

    const removeByMarket = useCallback((marketId: string, selectionId: string | number) => {
        setSelections(prev => prev.filter(s => !(s.market_id === marketId && s.selection_id === selectionId)));
    }, []);

    const toggleSelection = useCallback((selection: Omit<BetSlipSelection, 'id'>) => {
        setSelections(prev => {
            const existingIdx = prev.findIndex(
                s => s.market_id === selection.market_id && s.selection_id === selection.selection_id
            );
            if (existingIdx >= 0) {
                // Remove it
                return prev.filter((_, idx) => idx !== existingIdx);
            }
            // Add it
            return [...prev, { ...selection, id: generateId() }];
        });
    }, []);

    const updateStake = useCallback((id: string, stake: number) => {
        setSelections(prev => prev.map(s =>
            s.id === id ? { ...s, stake } : s
        ));
    }, []);

    const clearSlip = useCallback(() => {
        setSelections([]);
    }, []);

    const isInSlip = useCallback((marketId: string, selectionId: string | number) => {
        return selections.some(s => s.market_id === marketId && s.selection_id === selectionId);
    }, [selections]);

    const totalStake = selections.reduce((sum, s) => sum + s.stake, 0);
    const totalReturns = selections.reduce((sum, s) => sum + (s.stake * s.odds), 0);

    return (
        <BetSlipContext.Provider value={{
            selections,
            addSelection,
            removeSelection,
            removeByMarket,
            toggleSelection,
            updateStake,
            clearSlip,
            isInSlip,
            totalStake,
            totalReturns
        }}>
            {children}
        </BetSlipContext.Provider>
    );
}

export function useBetSlip() {
    const context = useContext(BetSlipContext);
    if (!context) {
        throw new Error('useBetSlip must be used within a BetSlipProvider');
    }
    return context;
}
