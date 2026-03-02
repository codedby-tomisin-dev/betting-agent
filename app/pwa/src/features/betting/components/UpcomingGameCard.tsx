"use client";

import { useState } from "react";
import { Calendar, Star, Sparkles } from "lucide-react";
import { DailyFixture, BetEvent, MarketOption, SelectionOption, BetSelectionItem } from "@/shared/types";
import { format } from "date-fns";

import { MarketOptionsDialog } from "./MarketOptionsDialog";
import { updateFixtureSelections } from "@/shared/api/bettingApi";

interface UpcomingGameCardProps {
    fixture: DailyFixture;
    date: string;
}

export function UpcomingGameCard({
    fixture,
    date
}: UpcomingGameCardProps) {
    const game = fixture.event;
    const [isMarketsOpen, setIsMarketsOpen] = useState(false);

    const isSelectionInFixture = (marketId: string, selectionId: string | number) => {
        if (!fixture.selections) return false;
        return fixture.selections.some(s => s.market_id === marketId && s.selection_id === String(selectionId));
    };

    const handleToggleFromDialog = async (event: BetEvent, market: MarketOption, selection: SelectionOption) => {
        const currentSelections = fixture.selections ? [...fixture.selections] : [];
        const existingIdx = currentSelections.findIndex(s => s.market_id === market.market_id && s.selection_id === String(selection.selection_id));

        if (existingIdx >= 0) {
            currentSelections.splice(existingIdx, 1);
        } else {
            currentSelections.push({
                event: {
                    name: event.name,
                    time: event.time,
                    competition: event.competition || { name: '' }
                },
                market: `${market.name}: ${selection.name}`,
                market_name: market.name,
                selection_name: selection.name,
                market_id: market.market_id,
                selection_id: String(selection.selection_id),
                odds: selection.odds,
                stake: 0,
                source: "user"
            });
        }

        await updateFixtureSelections(date, fixture.id, currentSelections);
    };

    const handleToggleFromAI = async (item: BetSelectionItem) => {
        const currentSelections = fixture.selections ? [...fixture.selections] : [];
        const existingIdx = currentSelections.findIndex(s => s.market_id === item.market_id && s.selection_id === String(item.selection_id));

        if (existingIdx >= 0) {
            currentSelections.splice(existingIdx, 1);
        } else {
            currentSelections.push({ ...item, source: "ai" });
        }

        await updateFixtureSelections(date, fixture.id, currentSelections);
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
        <>
            <div
                className="w-full p-4 bg-gray-100 rounded-xl border-0 flex flex-col justify-between hover:bg-gray-200 transition-colors cursor-pointer group h-48"
                onClick={() => setIsMarketsOpen(true)}
            >
                <div>
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate max-w-[60%]">
                            {game.competition?.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                            {fixture.metadata?.is_reliable_team && (
                                <span title="Reliable team" className="text-amber-400">
                                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                                </span>
                            )}
                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 bg-white/50 px-2 py-0.5 rounded-md shrink-0">
                                <Calendar className="h-3 w-3" />
                                <span>{formattedDate}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-0.5 mb-3">
                        <h4 className="font-semibold text-gray-900 text-lg leading-tight truncate" title={homeTeam}>{homeTeam}</h4>
                        {awayTeam && <h4 className="font-semibold text-gray-900 text-lg leading-tight truncate" title={awayTeam}>{awayTeam}</h4>}
                    </div>

                    {/* AI Analysis State & Selections */}
                    <div className="mt-auto">
                        {/* {fixture.analysis_status === "pending" && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white/60 p-2 rounded-lg py-1.5 border border-dashed border-gray-300">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Analyzing...</span>
                            </div>
                        )} */}
                        {fixture.analysis_status === "completed" && fixture.selections && fixture.selections.length > 0 && (
                            <div className="bg-white/70 p-2 rounded-lg border border-gray-200 mt-2 space-y-1">
                                {fixture.selections.length > 1 ? (
                                    <div className="flex justify-between items-center gap-2">
                                        <div className="flex items-center gap-1 overflow-hidden">
                                            <Sparkles className="h-2.5 w-2.5 text-violet-500 shrink-0" />
                                            <span className="text-xs text-gray-700 font-medium truncate">
                                                {fixture.selections.length} selections
                                            </span>
                                        </div>
                                        <span className="font-bold text-gray-900 text-xs shrink-0">
                                            {fixture.selections.reduce((acc, curr) => acc * (curr.odds || 1), 1).toFixed(2)}
                                        </span>
                                    </div>
                                ) : (
                                    fixture.selections.map((sel, idx) => (
                                        <div key={`${sel.market_id ?? idx}-${sel.selection_id ?? idx}`} className="flex justify-between items-center gap-2">
                                            <div className="flex items-center gap-1 overflow-hidden">
                                                {sel.source === 'ai' && <Sparkles className="h-2.5 w-2.5 text-violet-500 shrink-0" />}
                                                <span className="text-xs text-gray-700 font-medium truncate">
                                                    {sel.market || "Selection"}
                                                </span>
                                            </div>
                                            <span className="font-bold text-gray-900 text-xs shrink-0">
                                                {Number(sel.odds).toFixed(2)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                        {fixture.analysis_status === "failed" && (
                            <div className="text-xs text-red-500 mt-2 bg-red-50 p-1.5 rounded-md border border-red-100">
                                Analysis failed
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <MarketOptionsDialog
                event={game}
                isOpen={isMarketsOpen}
                onClose={() => setIsMarketsOpen(false)}
                onSelectSelection={handleToggleFromDialog}
                onToggleAISelection={handleToggleFromAI}
                isInSlip={isSelectionInFixture}
                aiSelections={fixture.selections}
            />
        </>
    );
}
