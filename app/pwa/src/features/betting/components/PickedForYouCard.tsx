"use client";

import { Sparkles, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bet, BetSelectionItem } from "@/shared/types";
import { BetModel } from "../models/BetModel";
import { useState } from "react";
import { useBetSlip } from "../context/BetSlipContext";
import { toast } from "sonner";

interface PickedForYouCardProps {
    bet: Bet;
    onClick: () => void;
}

export function PickedForYouCard({ bet, onClick }: PickedForYouCardProps) {
    const model = new BetModel(bet);
    const selections = model.selections;
    const [currentIndex, setCurrentIndex] = useState(0);
    const { addSelection } = useBetSlip();

    if (!selections || selections.length === 0) {
        return null;
    }

    const currentSelection = selections[currentIndex];
    const remainingCount = selections.length - currentIndex;
    
    // Calculate confidence (mock for now - you can enhance this based on actual data)
    const confidence = Math.floor(75 + Math.random() * 20); // 75-95%

    const handleAccept = () => {
        // Add to bet slip with proper BetSelectionItem structure
        const selectionItem: Omit<BetSelectionItem, 'id'> = {
            event: currentSelection.event!,
            market: currentSelection.market || 'Unknown Market',
            market_name: currentSelection.market,
            selection_name: currentSelection.market,
            odds: currentSelection.odds || 1.0,
            stake: 0,
            market_id: currentSelection.market_id,
            selection_id: currentSelection.selection_id,
            reasoning: currentSelection.reasoning
        };
        
        addSelection(selectionItem);
        toast.success(`Added ${currentSelection.market} to bet slip!`);

        // Move to next or finish
        if (currentIndex < selections.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            toast.success("All picks reviewed!");
            setCurrentIndex(0); // Reset for next time
        }
    };

    const handleSkip = () => {
        if (currentIndex < selections.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setCurrentIndex(0); // Reset
        }
    };

    const handleAcceptAll = () => {
        selections.forEach(selection => {
            const selectionItem: Omit<BetSelectionItem, 'id'> = {
                event: selection.event!,
                market: selection.market || 'Unknown Market',
                market_name: selection.market,
                selection_name: selection.market,
                odds: selection.odds || 1.0,
                stake: 0,
                market_id: selection.market_id,
                selection_id: selection.selection_id,
                reasoning: selection.reasoning
            };
            
            addSelection(selectionItem);
        });
        toast.success(`Added all ${selections.length} picks to bet slip!`);
        setCurrentIndex(0);
    };

    // Split event name into teams
    const teams = currentSelection.event?.name?.split(' v ') || ['Team 1', 'Team 2'];

    return (
        <div className="w-full h-full p-4 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 text-white flex flex-col relative overflow-hidden shadow-lg">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12 blur-xl"></div>

            {/* Pick Card */}
            <div className="flex-1 bg-white rounded-xl p-4 mb-3 relative z-10 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-md">
                        {currentSelection.event?.competition?.name || 'Match'}
                    </span>
                    <div className="flex items-center gap-1 text-pink-600">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold">AI Suggestion</span>
                    </div>
                </div>

                {/* Teams */}
                <div className="flex flex-col items-center justify-center text-center mb-3 flex-1">
                    <p className="text-gray-900 font-bold text-lg leading-tight mb-1">
                        {teams[0]}
                    </p>
                    <p className="text-gray-400 text-xs font-medium mb-1">vs</p>
                    <p className="text-gray-900 font-bold text-lg leading-tight">
                        {teams[1] || teams[0]}
                    </p>
                </div>

                {/* Prediction & Odds */}
                <div className="bg-pink-50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">AI Prediction</p>
                        <p className="text-gray-900 font-bold text-base">{currentSelection.market}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Odds</p>
                        <p className="text-pink-600 font-bold text-2xl leading-none">{currentSelection.odds?.toFixed(2)}</p>
                    </div>
                </div>

                {/* Accept Pick Button - inside card */}
                <Button
                    onClick={handleAccept}
                    className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white border-0 h-11 text-sm font-bold flex items-center justify-center gap-2 mt-3 shadow-md"
                >
                    <Zap className="h-4 w-4" />
                    Accept Pick
                </Button>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2 relative z-10">
                <Button
                    onClick={handleSkip}
                    variant="ghost"
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 h-10 text-sm font-semibold rounded-xl"
                >
                    Skip
                </Button>
                {remainingCount > 1 && (
                    <Button
                        onClick={handleAcceptAll}
                        className="flex-1 bg-white hover:bg-white/90 text-pink-600 border-0 h-10 text-sm font-bold rounded-xl shadow-md"
                    >
                        Accept All {remainingCount}
                    </Button>
                )}
            </div>
        </div>
    );
}
