"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BetEvent, MarketOption, SelectionOption, AIAnalysisResponse, BetSelectionItem } from "@/shared/types";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/shared/utils";
import { useState, useEffect, useMemo } from "react";
import { AIContext } from "./AIContext";
import { QuickPickSection } from "./QuickPickSection";
import { analyzeSingleGame } from "@/shared/api/bettingApi";
import { toast } from "sonner";
import { useBetSlip } from "../context/BetSlipContext";
import { groupMarketsByCategory, type MarketCategory } from "../utils/marketCategories";

interface MarketOptionsDialogProps {
    readonly event: BetEvent;
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onSelectSelection?: (event: BetEvent, market: MarketOption, selection: SelectionOption) => void;
    readonly isInSlip?: (marketId: string, selectionId: string | number) => boolean;
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
    const [allMarkets, setAllMarkets] = useState<MarketOption[]>([]);
    const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<MarketCategory>>(
        new Set(['Match Odds', 'Goals'])
    );

    // Fetch all markets when dialog opens if provider_event_id is available
    useEffect(() => {
        if (isOpen && event.provider_event_id) {
            const fetchMarkets = async () => {
                try {
                    setIsLoadingMarkets(true);
                    const { fetchEventMarkets } = await import("@/shared/api/bettingApi");
                    const markets = await fetchEventMarkets(event.provider_event_id!);

                    // Merge with existing markets, avoiding duplicates
                    const existingMarketIds = new Set(event.options?.map(m => m.market_id) || []);
                    const newMarkets = markets.filter(m => !existingMarketIds.has(m.market_id));
                    setAllMarkets([...(event.options || []), ...newMarkets]);
                } catch (error) {
                    console.error("Failed to fetch event markets:", error);
                    // Fall back to existing markets
                    setAllMarkets(event.options || []);
                } finally {
                    setIsLoadingMarkets(false);
                }
            };
            fetchMarkets();
        } else if (isOpen) {
            // No provider_event_id, use existing markets
            setAllMarkets(event.options || []);
        }
    }, [isOpen, event.provider_event_id, event.options]);

    // Reset analysis when dialog opens/closes
    useEffect(() => {
        if (!isOpen) {
            setAnalysis(null);
            setIsAnalyzing(false);
            setAllMarkets([]);
        }
    }, [isOpen]);

    // Group markets by category
    const categorizedMarkets = useMemo(() =>
        groupMarketsByCategory(allMarkets),
        [allMarkets]
    );

    const handleAnalyze = async () => {
        try {
            setIsAnalyzing(true);
            // Pass all fetched markets to the AI for comprehensive analysis
            const result = await analyzeSingleGame(event, undefined, undefined, allMarkets);
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

    const handleQuickSelection = (market: MarketOption, selection: SelectionOption) => {
        if (onSelectSelection) {
            onSelectSelection(event, market, selection);
        }
    };

    const toggleCategory = (category: MarketCategory) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[85vh] flex flex-col max-w-md p-0 gap-0 overflow-hidden bg-white">
                <DialogHeader className="px-6 pt-6 pb-2 border-b border-gray-50">
                    <DialogTitle>{event.name}</DialogTitle>
                    <p className="text-xs text-gray-500">
                        {event.competition?.name} • {event.time ? new Date(event.time).toLocaleString() : 'TBD'}
                    </p>
                </DialogHeader>

                <Tabs defaultValue="quick-pick" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 py-2 border-b border-gray-100">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="quick-pick">Quick Pick</TabsTrigger>
                            <TabsTrigger value="all-markets">All Markets</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="quick-pick" className="flex-1 overflow-y-auto m-0">
                        <QuickPickSection
                            event={event}
                            markets={allMarkets}
                            onSelection={handleQuickSelection}
                            isInSlip={isInSlip}
                        />

                        {/* AI Analysis - kept inside Quick Pick for context */}
                        <div className="px-6 py-4 mt-2 border-t border-gray-100">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">AI Analysis</h4>
                            <AIContext
                                analysis={analysis}
                                isLoading={isAnalyzing}
                                onAnalyze={handleAnalyze}
                                onAddSelection={handleToggleFromAI}
                                isInSlip={isInSlip}
                                className="mt-0"
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="all-markets" className="flex-1 overflow-y-auto m-0 p-6 space-y-4">
                        {isLoadingMarkets ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                Loading additional markets...
                            </p>
                        ) : (!allMarkets || allMarkets.length === 0) ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                No markets available for this event
                            </p>
                        ) : (
                            Array.from(categorizedMarkets.entries()).map(([category, markets]) => {
                                if (markets.length === 0) return null;
                                const isExpanded = expandedCategories.has(category);

                                return (
                                    <div key={category} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                        <button
                                            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                                            onClick={() => toggleCategory(category)}
                                        >
                                            <span className="text-sm font-semibold text-gray-700">{category}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">{markets.length} market{markets.length !== 1 ? 's' : ''}</span>
                                                {isExpanded ? (
                                                    <ChevronUp className="h-4 w-4 text-gray-500" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                                )}
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="p-4 space-y-4">
                                                {markets.map((option, optIdx) => (
                                                    <div key={`${option.market_id || optIdx}`} className="space-y-2">
                                                        <h5 className="text-xs font-semibold text-gray-600">{option.name}</h5>
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
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

