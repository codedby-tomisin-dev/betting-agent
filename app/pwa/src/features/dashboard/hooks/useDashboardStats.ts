import { useMemo } from 'react';
import { Bet } from '@/shared/types';
import { DashboardStats } from '../types';

/**
 * Hook to calculate dashboard statistics from bets
 */
export function useDashboardStats(bets: Bet[]): DashboardStats {
    return useMemo(() => {
        const finishedBets = bets.filter(b => b.status === "finished");

        let totalProfit = 0;
        let wins = 0;

        finishedBets.forEach(bet => {
            if (bet.settlement_results) {
                const realizedReturn = bet.settlement_results.reduce(
                    (acc, res) => acc + (res.profit || 0),
                    0
                );
                totalProfit += realizedReturn;
                if (realizedReturn > 0) wins++;
            }
        });

        const winRate = finishedBets.length > 0
            ? (wins / finishedBets.length) * 100
            : 0;

        const latestBet = bets[0];
        const currentBalance = latestBet?.balance?.ending ?? latestBet?.balance?.starting ?? 0;

        return {
            totalProfit,
            winRate,
            currentBalance,
            wins,
            finishedBetsCount: finishedBets.length,
        };
    }, [bets]);
}
