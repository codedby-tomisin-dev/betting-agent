import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { BetSelectionItem, Bet } from "@/shared/types";

/**
 * Approve a bet intent and queue it for placement
 */
export const approveBetIntent = async (
    betId: string,
    selections?: { items: BetSelectionItem[] }
) => {
    const approve = httpsCallable(functions, 'approve_bet_intent');
    const result = await approve({ bet_id: betId, selections });
    return result.data;
};

/**
 * Trigger the automated betting workflow
 */
export const triggerAutomatedBetting = async (date?: string) => {
    const trigger = httpsCallable(functions, 'automated_daily_betting_http');
    const result = await trigger({ date });
    return result.data;
};

/**
 * Get paginated bet history
 */
export const getBetHistory = async (
    limit: number = 20,
    startAfterId?: string,
    status?: string,
    dateRange?: { start: string, end: string }
) => {
    const getHistory = httpsCallable(functions, 'get_bet_history');
    const result = await getHistory({ limit, start_after_id: startAfterId, status, date_range: dateRange });
    return result.data as { items: Bet[], last_doc_id: string | null };
};
