import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { BetSelectionItem, Bet, BetEvent, MarketOption } from "@/shared/types";

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

/**
 * Fetch all upcoming games from the backend
 */
export const fetchUpcomingGames = async (date?: string) => {
    const isDev = typeof globalThis.window !== "undefined" && globalThis.window.location.hostname === "localhost";
    const projectId = "skilful-sphere-392008";
    const region = "europe-west2";

    const baseUrl = isDev
        ? `http://127.0.0.1:5001/${projectId}/${region}`
        : `https://${region}-${projectId}.cloudfunctions.net`;

    const params = new URLSearchParams({ sport: 'soccer' });
    if (date) {
        params.append('date', date);
    }

    const url = `${baseUrl}/get_upcoming_games?${params.toString()}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.data as BetEvent[] || [];
    } catch (error) {
        console.error("Failed to fetch upcoming games:", error);
        return [];
    }
};

/**
 * Request AI analysis for a single game
 */
export const analyzeSingleGame = async (
    game: BetEvent,
    budget?: number,
    risk_appetite?: number,
    markets?: MarketOption[]
) => {
    const isDev = typeof globalThis.window !== "undefined" && globalThis.window.location.hostname === "localhost";
    const projectId = "skilful-sphere-392008";
    const region = "europe-west2";

    const baseUrl = isDev
        ? `http://127.0.0.1:5001/${projectId}/${region}`
        : `https://${region}-${projectId}.cloudfunctions.net`;

    const url = `${baseUrl}/analyze_bets`;

    // If markets are provided, use them; otherwise use the game's existing options
    const eventToAnalyze = markets ? { ...game, options: markets } : game;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                events: [eventToAnalyze],
                budget,
                risk_appetite
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error("Failed to analyze game:", error);
        throw error;
    }
};

/**
 * Place bets on Betfair Exchange
 */
export interface PlaceBetOrder {
    market_id: string;
    selection_id: string | number;
    stake: number;
    odds: number;
    side?: string;
    market_name?: string;
    selection_name?: string;
    event?: {
        name: string;
        time: string;
        competition: { name: string };
    };
}

export const placeBets = async (bets: PlaceBetOrder[]) => {
    const isDev = typeof globalThis.window !== "undefined" && globalThis.window.location.hostname === "localhost";
    const projectId = "skilful-sphere-392008";
    const region = "europe-west2";

    const baseUrl = isDev
        ? `http://127.0.0.1:5001/${projectId}/${region}`
        : `https://${region}-${projectId}.cloudfunctions.net`;

    const url = `${baseUrl}/place_bet`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bets }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Failed to place bets:", error);
        throw error;
    }
};

/**
 * Fetch all available markets for a specific event
 */
export const fetchEventMarkets = async (providerEventId: string, marketTypes?: string[]) => {
    const isDev = typeof globalThis.window !== "undefined" && globalThis.window.location.hostname === "localhost";
    const projectId = "skilful-sphere-392008";
    const region = "europe-west2";

    const baseUrl = isDev
        ? `http://127.0.0.1:5001/${projectId}/${region}`
        : `https://${region}-${projectId}.cloudfunctions.net`;

    const params = new URLSearchParams({ event_id: providerEventId });
    if (marketTypes && marketTypes.length > 0) {
        params.append('market_types', marketTypes.join(','));
    }

    const url = `${baseUrl}/get_event_markets?${params.toString()}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.data as MarketOption[];
    } catch (error) {
        console.error("Failed to fetch event markets:", error);
        throw error;
    }
};
