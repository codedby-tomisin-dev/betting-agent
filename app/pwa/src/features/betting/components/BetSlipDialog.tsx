"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBetSlip } from "../context/BetSlipContext";
import { formatCurrency } from "@/shared/utils";
import { X, Trash2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { formatTimestamp } from "../utils/formatBetMetadata";
import { SelectionReasoning } from "./SelectionReasoning";
import { PlaceBetOrder } from "@/shared/api/bettingApi";
import { toast } from "sonner";

interface PlaceBetsResponse {
    status: string;
    data?: {
        status: string;
        bets: Array<{ status: string; market_id: string; selection_id: number; bet_id?: string; error_code?: string }>;
    };
    message?: string;
}

interface BetSlipDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onPlaceBets: (bets: PlaceBetOrder[]) => Promise<PlaceBetsResponse>;
}

export function BetSlipDialog({ isOpen, onClose, onPlaceBets }: BetSlipDialogProps) {
    const { selections, removeSelection, updateStake, clearSlip, totalStake, totalReturns } = useBetSlip();
    const [isPlacing, setIsPlacing] = useState(false);
    const [placementResult, setPlacementResult] = useState<{ success: boolean; message: string } | null>(null);

    // Group selections by event for display (similar to BetSelectionGroup)
    const groupedByEvent = selections.reduce((acc, sel) => {
        const eventKey = sel.event.name;
        if (!acc[eventKey]) {
            acc[eventKey] = { event: sel.event, items: [] };
        }
        acc[eventKey].items.push(sel);
        return acc;
    }, {} as Record<string, { event: typeof selections[0]['event']; items: typeof selections }>);

    const handlePlaceBet = async () => {
        if (selections.length === 0) return;

        // Validate all stakes are > 0
        const invalidSelections = selections.filter(s => s.stake <= 0);
        if (invalidSelections.length > 0) {
            toast.error("Please enter a stake for all selections (minimum £1)");
            return;
        }

        setIsPlacing(true);
        setPlacementResult(null);

        try {
            const bets = selections.map(s => ({
                market_id: s.market_id || '',
                selection_id: s.selection_id || '',
                stake: s.stake,
                odds: s.odds,
                side: s.side || 'BACK'
            }));

            const result = await onPlaceBets(bets);

            const betResults = result.data?.bets || [];
            const successCount = betResults.filter(r => r.status === 'SUCCESS').length;
            const failCount = betResults.length - successCount;

            if (successCount > 0) {
                setPlacementResult({
                    success: true,
                    message: failCount > 0
                        ? `${successCount} bet(s) placed, ${failCount} failed`
                        : `${successCount} bet(s) placed successfully!`
                });
                toast.success(`Bet placed successfully!`);

                setTimeout(() => {
                    clearSlip();
                    onClose();
                }, 2000);
            } else {
                setPlacementResult({
                    success: false,
                    message: result.message || "Failed to place bets"
                });
                toast.error("Failed to place bet");
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            setPlacementResult({
                success: false,
                message: errorMessage
            });
            toast.error(`Error: ${errorMessage}`);
        } finally {
            setIsPlacing(false);
        }
    };

    const handleClose = () => {
        if (!isPlacing) {
            setPlacementResult(null);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle>Bet Slip ({selections.length})</DialogTitle>
                        {selections.length > 0 && !isPlacing && (
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
                                                            disabled={isPlacing}
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                                        onClick={() => removeSelection(item.id)}
                                                        disabled={isPlacing}
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

                        {placementResult && (
                            <div className={`flex items-center gap-2 p-3 rounded-lg ${placementResult.success
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-700'
                                }`}>
                                {placementResult.success
                                    ? <CheckCircle className="h-5 w-5" />
                                    : <AlertCircle className="h-5 w-5" />
                                }
                                <span className="text-sm font-medium">{placementResult.message}</span>
                            </div>
                        )}

                        <Button
                            className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300"
                            onClick={handlePlaceBet}
                            disabled={isPlacing || totalStake <= 0}
                        >
                            {isPlacing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Placing Bet...
                                </>
                            ) : (
                                'Place Bet'
                            )}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

