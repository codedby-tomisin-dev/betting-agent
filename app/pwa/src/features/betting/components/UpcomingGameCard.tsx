"use client";

import { useState } from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { BetEvent, BetSelectionItem, MarketOption, SelectionOption } from "@/shared/types";
import { format } from "date-fns";

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
    const [isMarketsOpen, setIsMarketsOpen] = useState(false);
    const { toggleSelection, isInSlip } = useBetSlip();

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
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 bg-white/50 px-2 py-0.5 rounded-md shrink-0">
                            <Calendar className="h-3 w-3" />
                            <span>{formattedDate}</span>
                        </div>
                    </div>

                    <div className="space-y-0.5">
                        <h4 className="font-bold text-gray-900 text-sm leading-tight truncate" title={homeTeam}>{homeTeam}</h4>
                        {awayTeam && <h4 className="font-bold text-gray-900 text-sm leading-tight truncate" title={awayTeam}>{awayTeam}</h4>}
                    </div>
                </div>
            </div>

            <MarketOptionsDialog
                event={game}
                isOpen={isMarketsOpen}
                onClose={() => setIsMarketsOpen(false)}
                onSelectSelection={handleToggleFromDialog}
                isInSlip={isInSlip}
            />
        </>
    );
}
