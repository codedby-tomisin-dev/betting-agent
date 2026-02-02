"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/shared/utils";
import { SelectionEventGroup } from "@/shared/types";
import { Plus, X } from "lucide-react";

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
                <h4 className="font-semibold text-gray-900">{group.event}</h4>
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
                        <div key={marketIdx} className="bg-gray-50 rounded-md p-3 flex items-center justify-between">
                            <div className="flex-1">
                                <p className="font-medium text-sm">{market.market}</p>
                                <p className="text-xs text-gray-500">
                                    Odds: <span className="font-semibold">{market.odds.toFixed(2)}</span>
                                    {" • "}
                                    Returns: <span className="font-semibold text-green-600">{formatCurrency(returns)}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-500">Stake:</span>
                                    <Input
                                        type="number"
                                        value={stake}
                                        onChange={(e) => onStakeChange(market.stableId, e.target.value)}
                                        className="w-20 h-8 text-sm"
                                        step="0.01"
                                        min="0"
                                        max={maxStake}
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
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
                    );
                })}
            </div>
        </div>
    );
}
