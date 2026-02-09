"use client";

import { Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bet } from "@/shared/types";
import { BetModel } from "../models/BetModel";

interface PickedForYouCardProps {
    bet: Bet;
    onClick: () => void;
}

export function PickedForYouCard({ bet, onClick }: PickedForYouCardProps) {
    const model = new BetModel(bet);
    const selectionCount = model.selectionCount;
    const eventNames = model.eventNames.slice(0, 3); // Show max 3

    return (
        <div
            role="button"
            tabIndex={0}
            className="flex-shrink-0 w-80 h-64 p-6 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 text-white flex flex-col justify-between relative overflow-hidden cursor-pointer transition-transform shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-pink-300"
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            {/* Sparkle decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 blur-xl"></div>

            <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-pink-200" />
                    <h3 className="font-bold text-lg">Picked for You</h3>
                </div>

                <p className="text-pink-100 text-lg font-medium">
                    {selectionCount} {selectionCount === 1 ? 'game' : 'games'} selected
                </p>
            </div>

            <Button
                variant="ghost"
                className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40 mt-auto group"
            >
                <span className="text-sm font-semibold">View Selections</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
        </div>
    );
}
