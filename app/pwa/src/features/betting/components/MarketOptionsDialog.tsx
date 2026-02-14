"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BetEvent, MarketOption, SelectionOption, AIAnalysisResponse, BetSelectionItem } from "@/shared/types";
import { Check } from "lucide-react";
import { cn } from "@/shared/utils";
import { useState, useEffect } from "react";
import { AIContext } from "./AIContext";
import { analyzeSingleGame } from "@/shared/api/bettingApi";
import { toast } from "sonner";
import { useBetSlip } from "../context/BetSlipContext";

interface MarketOptionsDialogProps {
    event: BetEvent;
    isOpen: boolean;
    onClose: () => void;
    onSelectSelection?: (event: BetEvent, market: MarketOption, selection: SelectionOption) => void;
    isInSlip?: (marketId: string, selectionId: string | number) => boolean;
}

export function MarketOptionsDialog({
    event,
    isOpen,
    onClose,
    onSelectSelection,
    isInSlip
}: MarketOptionsDialogProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);
    const { toggleSelection } = useBetSlip();

    // Reset analysis when dialog opens/closes
    useEffect(() => {
        if (!isOpen) {
            setAnalysis(null);
            setIsAnalyzing(false);
        }
    }, [isOpen, event]); // event object reference ok if stable, or use event.name

    const handleAnalyze = async () => {
        try {
            setIsAnalyzing(true);
            const result = await analyzeSingleGame(event);
            setAnalysis(result);
        } catch (error) {
            console.error("Analysis failed:", error);
            toast.error("Failed to analyze game. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleToggleFromAI = (item: BetSelectionItem) => {
        toggleSelection(item);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[85vh] flex flex-col max-w-md p-0 gap-0 overflow-hidden bg-gray-50/50">
                <DialogHeader className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
                    <DialogTitle>{event.name}</DialogTitle>
                    <p className="text-xs text-gray-500">
                        {event.competition?.name} • {event.time ? new Date(event.time).toLocaleString() : 'TBD'}
                    </p>
                </DialogHeader>

                <div className=" bg-white flex-1 overflow-y-auto">
                    <div className="px-6 py-4 mb-2 shadow-sm">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">AI Analysis</h4>
                        <AIContext
                            analysis={analysis}
                            isLoading={isAnalyzing}
                            onAnalyze={handleAnalyze}
                            onAddSelection={handleToggleFromAI}
                            isInSlip={isInSlip}
                            className="mt-0"
                        />
                    </div>

                    <div className="px-6 pb-6 space-y-6">
                        {(!event.options || event.options.length === 0) ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                No markets available for this event
                            </p>
                        ) : (
                            event.options.map((option, optIdx) => (
                                <div key={`${option.market_id || optIdx}`} className="space-y-2">
                                    <h4 className="text-sm font-semibold text-gray-700 sticky top-0 bg-gray-50/50 py-1 backdrop-blur-sm">{option.name}</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {option.options?.map((selection) => {
                                            const inSlip = isInSlip?.(option.market_id || '', selection.selection_id || '');
                                            return (
                                                <Button
                                                    key={`${option.market_id}-${selection.selection_id}`}
                                                    variant="outline"
                                                    className={cn(
                                                        "justify-between h-auto py-3 px-3 border-gray-200 bg-white shadow-sm",
                                                        inSlip
                                                            ? "bg-pink-50 border-pink-300 text-pink-700 hover:bg-pink-100 hover:border-pink-400"
                                                            : "hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                                                    )}
                                                    size="sm"
                                                    onClick={() => {
                                                        if (onSelectSelection) {
                                                            onSelectSelection(event, option, selection);
                                                        }
                                                    }}
                                                >
                                                    <span className="flex items-center gap-1.5 overflow-hidden">
                                                        {inSlip && <Check className="h-3 w-3 text-pink-600 shrink-0" />}
                                                        <span className="text-xs font-medium truncate" title={selection.name}>{selection.name}</span>
                                                    </span>
                                                    <span className={cn(
                                                        "font-bold text-xs ml-2",
                                                        inSlip ? "text-pink-600" : "text-blue-600"
                                                    )}>{selection.odds}</span>
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

