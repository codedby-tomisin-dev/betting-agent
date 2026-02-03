import { BetWager } from "@/shared/types";
import { formatCurrency } from "@/shared/utils";

interface BetWagerTotalsProps {
    wager: BetWager;
}

export function BetWagerTotals({ wager }: BetWagerTotalsProps) {
    return (
        <div className="bg-gray-100 rounded-md p-4">
            <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Total Stake</span>
                <span className="font-bold">{formatCurrency(wager.stake)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Combined Odds</span>
                <span className="font-bold">{wager.odds.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="font-semibold text-green-700">Potential Returns</span>
                <span className="font-bold text-green-700 text-lg">
                    {formatCurrency(wager.potential_returns)}
                </span>
            </div>
        </div>
    );
}
