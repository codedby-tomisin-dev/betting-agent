"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/shared/utils";
import { SelectionEventGroup } from "@/shared/types";
import { Plus, X } from "lucide-react";
import { formatTimestamp } from "../utils/formatBetMetadata";
import { SelectionReasoning } from "./SelectionReasoning";

interface BetSelectionGroupProps {
    group: SelectionEventGroup;
    maxStake: number;
    getEffectiveStake: (stableId: string, originalStake: number) => number;
    onStakeChange: (stableId: string, value: string) => void;
    onRemoveMarket: (absoluteIndex: number, originalItemsLength: number) => void;
    onAddMarket: () => void;
    originalItemsLength: number;
}

export function BetSelectionGroup({
    group,
    maxStake,
    getEffectiveStake,
    onStakeChange,
    onRemoveMarket,
    onAddMarket,
    originalItemsLength,
}: BetSelectionGroupProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-semibold text-gray-900">{group.event?.name || 'Unknown Event'}</h4>
                    <p className="text-xs text-gray-500">
                        {group.event?.competition?.name || 'Unknown Competition'} • {formatTimestamp(group.event?.time || '')}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                    onClick={onAddMarket}
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Market
                </Button>
            </div>

            <div className="space-y-2">
                {group.markets.map((market, marketIdx) => {
                    const stake = getEffectiveStake(market.stableId, market.stake);
                    const returns = stake * market.odds;

                    return (
                        <div key={marketIdx} className="py-4 border-b border-gray-100 last:border-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex-1">
                                    <p className="font-medium text-sm text-gray-900">{market.market}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Odds: <span className="font-semibold text-gray-700">{market.odds?.toFixed(2) || '-'}</span>
                                        {" • "}
                                        Returns: <span className="font-semibold text-green-600">{formatCurrency(returns)}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stake</span>
                                        <Input
                                            type="number"
                                            value={stake}
                                            onChange={(e) => onStakeChange(market.stableId, e.target.value)}
                                            className="w-16 h-6 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 text-right font-semibold"
                                            step="0.01"
                                            min="0"
                                            max={maxStake}
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                        onClick={() => {
                                            if (market.isOriginal) {
                                                onRemoveMarket(market.originalIndex!, originalItemsLength);
                                            } else {
                                                onRemoveMarket(market.addedIndex! + originalItemsLength, originalItemsLength);
                                            }
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            {market.reasoning && (
                                <SelectionReasoning reasoning={market.reasoning} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
