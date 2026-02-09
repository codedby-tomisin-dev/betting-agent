"use client";

import { Sparkles, ChevronRight, Loader2, Check } from "lucide-react";
import { cn } from "@/shared/utils";
import { AIAnalysisResponse, BetSelectionItem } from "@/shared/types";

interface AIContextProps {
    analysis: AIAnalysisResponse | null;
    isLoading: boolean;
    onAnalyze?: () => void;
    onAddSelection?: (selection: BetSelectionItem) => void;
    isInSlip?: (marketId: string, selectionId: string | number) => boolean;
    className?: string;
}

export function AIContext({
    analysis,
    isLoading,
    onAnalyze,
    onAddSelection,
    isInSlip,
    className
}: AIContextProps) {

    // If we're loading, show a loading state
    if (isLoading) {
        return (
            <div className={cn("mt-2 flex items-start max-w-full", className)}>
                <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-[20px] px-3 py-1.5 text-gray-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                    <span className="text-xs font-medium">Analyzing...</span>
                </div>
            </div>
        );
    }

    // If no analysis yet, show button to request it
    if (!analysis) {
        return (
            <div className={cn("mt-2 flex items-start max-w-full", className)}>
                <button
                    onClick={onAnalyze}
                    className="relative flex items-center bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 hover:shadow-sm rounded-[20px] px-3 py-1.5 transition-all group"
                >
                    <Sparkles className="h-3.5 w-3.5 text-violet-500 mr-2" />
                    <span className="text-xs font-medium text-gray-700">Ask AI</span>
                </button>
            </div>
        );
    }

    // If we have analysis, show the scrollable row of options
    if (analysis) {
        const hasSelections = analysis.selections?.items?.length > 0;

        if (!hasSelections) {
            return (
                <div className={cn("mt-2 text-xs text-gray-500 italic", className)}>
                    {analysis.overall_reasoning}
                </div>
            );
        }

        return (
            <div className={cn("mt-3 relative group/carousel", className)}>
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/carousel:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const container = document.getElementById(`carousel-${analysis.overall_reasoning.slice(0, 5)}`);
                            if (container) container.scrollBy({ left: -200, behavior: 'smooth' });
                        }}
                        className="p-1 rounded-full bg-white shadow-md border border-gray-100 hover:bg-gray-50 text-gray-600"
                    >
                        <ChevronRight className="h-4 w-4 rotate-180" />
                    </button>
                </div>

                <div
                    id={`carousel-${analysis.overall_reasoning.slice(0, 5)}`}
                    className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-2 px-2 py-1"
                >
                    {analysis.selections.items.map((item, idx) => {
                        const inSlip = isInSlip?.(item.market_id || '', item.selection_id || '');
                        return (
                            <button
                                key={`${item.market_id}-${item.selection_id}-${idx}`}
                                onClick={() => onAddSelection?.(item)}
                                className={cn(
                                    "snap-center flex-shrink-0 w-48 rounded-xl p-3 border-2 flex flex-col gap-2 text-left transition-all",
                                    inSlip
                                        ? "bg-pink-50 border-pink-300 shadow-sm shadow-pink-100"
                                        : "bg-gray-50 border-gray-100 hover:border-gray-200 hover:shadow-sm"
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-gray-700 line-clamp-1" title={item.market}>
                                        {item.market}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {inSlip && <Check className="h-3 w-3 text-pink-600" />}
                                        <span className="text-xs font-mono font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                                            {item.odds}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-[10px] text-gray-500 leading-snug line-clamp-3" title={item.reasoning}>
                                    {item.reasoning}
                                </p>
                            </button>
                        );
                    })}
                </div>

                <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/carousel:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const container = document.getElementById(`carousel-${analysis.overall_reasoning.slice(0, 5)}`);
                            if (container) container.scrollBy({ left: 200, behavior: 'smooth' });
                        }}
                        className="p-1 rounded-full bg-white shadow-md border border-gray-100 hover:bg-gray-50 text-gray-600"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }
}
