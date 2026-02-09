"use client";

import { useState } from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BetEvent, AIAnalysisResponse, BetSelectionItem, MarketOption, SelectionOption } from "@/shared/types";
import { format } from "date-fns";
import { AIContext } from "./AIContext";
import { analyzeSingleGame } from "@/shared/api/bettingApi";
import { toast } from "sonner";

import { MarketOptionsDialog } from "./MarketOptionsDialog";
import { useBetSlip } from "../context/BetSlipContext";

interface UpcomingGameCardProps {
    game: BetEvent;
    onAddToTicket?: () => void;
}

export function UpcomingGameCard({
    game,
    onAddToTicket
}: UpcomingGameCardProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);
    const [isMarketsOpen, setIsMarketsOpen] = useState(false);
    const { toggleSelection, isInSlip } = useBetSlip();

    const handleAnalyze = async () => {
        try {
            setIsAnalyzing(true);
            const result = await analyzeSingleGame(game);
            setAnalysis(result);
        } catch (error) {
            console.error("Analysis failed:", error);
            toast.error("Failed to analyze game. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleToggleFromAI = (selection: BetSelectionItem) => {
        toggleSelection(selection);
    };

    const handleToggleFromDialog = (event: BetEvent, market: MarketOption, selection: SelectionOption) => {
        toggleSelection({
            event: {
                name: event.name,
                time: event.time,
                competition: event.competition || { name: '' }
            },
            market: `${market.name}: ${selection.name}`,
            market_name: market.name,
            selection_name: selection.name,
            market_id: market.market_id,
            selection_id: selection.selection_id,
            odds: selection.odds,
            stake: 0
        });
    };

    const formattedDate = game.time ? format(new Date(game.time), "MMM d, HH:mm") : "TBD";

    // Extract teams from name if not provided separately (assuming "Home v Away" format)
    let homeTeam = "Home Team";
    let awayTeam = "Away Team";
    if (game.name.includes(" v ")) {
        [homeTeam, awayTeam] = game.name.split(" v ");
    } else if (game.name.includes(" vs ")) {
        [homeTeam, awayTeam] = game.name.split(" vs ");
    } else {
        homeTeam = game.name;
        awayTeam = "";
    }

    return (
        <div className="flex-shrink-0 w-80 h-full p-5 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide truncate max-w-[60%]">
                        {game.competition?.name}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md shrink-0">
                        <Calendar className="h-3 w-3" />
                        <span>{formattedDate}</span>
                    </div>
                </div>

                <div className="space-y-1 mb-4">
                    <h4 className="font-bold text-gray-900 text-lg leading-tight truncate" title={homeTeam}>{homeTeam}</h4>
                    {awayTeam && <h4 className="font-bold text-gray-900 text-lg leading-tight truncate" title={awayTeam}>{awayTeam}</h4>}
                </div>
            </div>

            <div className="mt-auto space-y-3">
                <AIContext
                    analysis={analysis}
                    isLoading={isAnalyzing}
                    onAnalyze={handleAnalyze}
                    onAddSelection={handleToggleFromAI}
                    isInSlip={isInSlip}
                />

                <div className="border-t border-dashed border-gray-100 pt-3">
                    <Button
                        variant="ghost"
                        className="w-full justify-between text-gray-600 hover:text-blue-600 hover:bg-blue-50 -ml-2 pl-2 pr-2"
                        onClick={() => setIsMarketsOpen(true)}
                    >
                        <span className="text-sm font-semibold">View Markets</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <MarketOptionsDialog
                event={game}
                isOpen={isMarketsOpen}
                onClose={() => setIsMarketsOpen(false)}
                onSelectSelection={handleToggleFromDialog}
                isInSlip={isInSlip}
            />
        </div>
    );
}

