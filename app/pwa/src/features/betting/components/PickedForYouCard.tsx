"use client";

import { Sparkles, X, ThumbsUp } from "lucide-react";
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
        <div className="w-full h-full p-4 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 text-white flex flex-col relative overflow-visible shadow-lg">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12 blur-xl"></div>

            {/* Left Button - Skip (X) */}
            <button
                onClick={handleSkip}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center group z-20 border-4 border-pink-100"
            >
                <X className="w-7 h-7 text-gray-400 group-hover:text-red-500 transition-colors stroke-[3]" />
            </button>

            {/* Right Button - Accept (ThumbsUp) */}
            <button
                onClick={handleAccept}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center group z-20 border-4 border-white"
            >
                <ThumbsUp className="w-7 h-7 text-white fill-white" />
            </button>

            {/* Pick Card */}
            <div className="flex-1 bg-white rounded-xl p-4 relative z-10 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-md">
                        {currentSelection.event?.competition?.name || 'Match'}
                    </span>
                    <div className="flex items-center gap-1 text-pink-600">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold">AI Suggestion</span>
                    </div>
                </div>

                {/* Teams - smaller, inline */}
                <div className="text-center mb-1">
                    {/* <p className="text-gray-600 text-sm font-semibold">
                        {teams[0]} <span className="text-gray-400 text-xs mx-1">vs</span> {teams[1] || teams[0]}
                    </p> */}
                </div>

                {/* AI Prediction - HERO ELEMENT */}
                <div className="flex-1 flex flex-col items-center justify-center mb-8 gap-4">
                    <div className="text-center">
                        <p className="text-gray-600 text-sm font-semibold">
                            {teams[0]} <span className="text-gray-400 text-xs mx-1">vs</span> {teams[1] || teams[0]}
                        </p>
                    </div>
                    <p className="text-gray-900 font-bold text-2xl text-center leading-tight">
                        {currentSelection.market}
                    </p>
                    <div className="flex justify-center items-center gap-2">
                        <span className="text-sm text-gray-500">Odds:</span>
                        <span className="text-pink-600 font-bold text-2xl leading-none">
                            {currentSelection.odds?.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-1.5 mt-3 relative z-10">
                {selections.map((_, idx) => (
                    <div
                        key={idx}
                        className={`h-1.5 rounded-full transition-all ${idx === currentIndex
                            ? 'w-6 bg-white'
                            : idx < currentIndex
                                ? 'w-1.5 bg-white/60'
                                : 'w-1.5 bg-white/30'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
