import { SelectionEventGroup } from '@/shared/types';
import { BetTotals } from '../types';

/**
 * Calculate total stake and potential returns for grouped selections
 */
export function calculateBetTotals(
    groups: SelectionEventGroup[],
    getEffectiveStake: (stableId: string, originalStake: number) => number
): BetTotals {
    let totalStake = 0;
    let totalReturns = 0;

    groups.forEach(group => {
        group.markets.forEach(market => {
            const stake = getEffectiveStake(market.stableId, market.stake);
            totalStake += stake;
            totalReturns += stake * market.odds;
        });
    });

    return { totalStake, totalReturns };
}
