import { BetSelectionItem } from "@/shared/types";
import { formatCurrency } from "@/shared/utils";

interface BetSelectionItemViewProps {
    selection: BetSelectionItem;
}

export function BetSelectionItemView({ selection }: BetSelectionItemViewProps) {
    const returns = selection.stake * selection.odds;

    return (
        <div className="bg-gray-50 rounded-md p-3">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="font-medium text-sm">{selection.market}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        Odds: <span className="font-semibold">{selection.odds.toFixed(2)}</span>
                        {" • "}
                        Stake: <span className="font-semibold">{formatCurrency(selection.stake)}</span>
                        {" • "}
                        Returns: <span className="font-semibold text-green-600">{formatCurrency(returns)}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
