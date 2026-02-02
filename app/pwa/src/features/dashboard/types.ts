export type { Bet, BetStatus, SettlementResult } from '@/shared/types';

/**
 * Dashboard statistics calculated from bets
 */
export interface DashboardStats {
    totalProfit: number;
    winRate: number;
    currentBalance: number;
    wins: number;
    finishedBetsCount: number;
}

/**
 * Chart data point for performance visualization
 */
export interface ChartDataPoint {
    date: string;
    balance: number | null | undefined;
}
