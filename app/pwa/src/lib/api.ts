import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Bet {
    id: string;
    status: 'intent' | 'analyzed' | 'approved' | 'ready' | 'placed' | 'finished' | 'failed';
    created_at: any;
    target_date: string;
    events: any[];
    selections?: {
        items: any[];
        wager: {
            odds: number;
            stake: number;
            potential_returns: number;
        };
    };
    balance?: {
        starting: number;
        predicted?: number;
        ending?: number;
    };
    ai_reasoning?: string;
    placement_results?: any;
    settlement_results?: any;
}

export const analyzeBets = async (data: any) => {
    const analyze = httpsCallable(functions, 'analyze_bets');
    const result = await analyze(data);
    return result.data;
};

export const approveBetIntent = async (betId: string, selections?: { items: any[] }) => {
    const approve = httpsCallable(functions, 'approve_bet_intent');
    const result = await approve({ bet_id: betId, selections });
    return result.data;
};

export const triggerAutomatedBetting = async (date?: string) => {
    const trigger = httpsCallable(functions, 'automated_daily_betting_http');
    const result = await trigger({ date });
    return result.data;
};
