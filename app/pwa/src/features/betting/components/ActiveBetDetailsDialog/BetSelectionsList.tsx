import { BetSelectionItem, EventInfo } from "@/shared/types";
import { formatTimestamp } from "../../utils/formatBetMetadata";
import { formatCurrency } from "@/shared/utils";
import { SelectionReasoning } from "../SelectionReasoning";

interface BetSelectionsListProps {
    groupedByEvent: Array<{ event: EventInfo; selections: BetSelectionItem[] }>;
}

export function BetSelectionsList({ groupedByEvent }: BetSelectionsListProps) {
    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-lg">Selections</h3>
            {groupedByEvent.map((group, groupIdx) => (
                <div key={groupIdx} className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-gray-900">{group.event?.name || 'Unknown Event'}</h4>
                            <p className="text-xs text-gray-500">
                                {group.event?.competition?.name || 'Unknown Competition'} • {formatTimestamp(group.event?.time || '')}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {group.selections.map((selection, idx) => {
                            const returns = selection.stake * selection.odds;
                            return (
                                <div key={idx} className="py-4 border-b border-gray-100 last:border-0">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm text-gray-900">{selection.market}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Odds: <span className="font-semibold text-gray-700">{selection.odds?.toFixed(2) || '-'}</span>
                                                {" • "}
                                                Stake: <span className="font-semibold text-gray-700">{formatCurrency(selection.stake)}</span>
                                                {" • "}
                                                Returns: <span className="font-semibold text-green-600">{formatCurrency(returns)}</span>
                                            </p>
                                        </div>
                                    </div>
                                    {selection.reasoning && (
                                        <SelectionReasoning reasoning={selection.reasoning} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
