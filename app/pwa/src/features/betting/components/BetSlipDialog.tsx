"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBetSlip } from "../context/BetSlipContext";
import { formatCurrency } from "@/shared/utils";
import { X, Trash2 } from "lucide-react";
import { formatTimestamp } from "../utils/formatBetMetadata";
import { SelectionReasoning } from "./SelectionReasoning";

interface BetSlipDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onPlaceBet?: () => void;
}

export function BetSlipDialog({ isOpen, onClose, onPlaceBet }: BetSlipDialogProps) {
    const { selections, removeSelection, updateStake, clearSlip, totalStake, totalReturns } = useBetSlip();

    // Group selections by event for display (similar to BetSelectionGroup)
    const groupedByEvent = selections.reduce((acc, sel) => {
        const eventKey = sel.event.name;
        if (!acc[eventKey]) {
            acc[eventKey] = { event: sel.event, items: [] };
        }
        acc[eventKey].items.push(sel);
        return acc;
    }, {} as Record<string, { event: typeof selections[0]['event']; items: typeof selections }>);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle>Bet Slip ({selections.length})</DialogTitle>
                        {selections.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={clearSlip}
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Clear All
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-4">
                    {selections.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                            Your bet slip is empty. Add selections from upcoming games.
                        </p>
                    ) : (
                        Object.values(groupedByEvent).map((group, groupIdx) => (
                            <div key={groupIdx} className="space-y-2 pb-4 border-b border-gray-100 last:border-0">
                                <div>
                                    <h4 className="font-semibold text-gray-900">{group.event.name}</h4>
                                    <p className="text-xs text-gray-500">
                                        {group.event.competition.name} • {formatTimestamp(group.event.time)}
                                    </p>
                                </div>

                                {group.items.map((item) => {
                                    const returns = item.stake * item.odds;
                                    return (
                                        <div key={item.id} className="py-3 border-b border-gray-50 last:border-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm text-gray-900">{item.market}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        Odds: <span className="font-semibold text-gray-700">{item.odds.toFixed(2)}</span>
                                                        {" • "}
                                                        Returns: <span className="font-semibold text-green-600">{formatCurrency(returns)}</span>
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1">
                                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stake</span>
                                                        <Input
                                                            type="number"
                                                            value={item.stake}
                                                            onChange={(e) => updateStake(item.id, parseFloat(e.target.value) || 0)}
                                                            className="w-16 h-6 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 text-right font-semibold"
                                                            step="0.01"
                                                            min="0"
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                                        onClick={() => removeSelection(item.id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            {item.reasoning && (
                                                <SelectionReasoning reasoning={item.reasoning} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {selections.length > 0 && (
                    <div className="flex-shrink-0 border-t pt-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Stake</span>
                            <span className="font-bold">{formatCurrency(totalStake)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Potential Returns</span>
                            <span className="font-bold text-green-600">{formatCurrency(totalReturns)}</span>
                        </div>
                        <Button
                            className="w-full bg-pink-600 hover:bg-pink-700"
                            onClick={onPlaceBet}
                        >
                            Place Bet
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
