"use client";

import { Receipt } from "lucide-react";
import { useBetSlip } from "../context/BetSlipContext";
import { cn } from "@/shared/utils";

interface BetSlipFabProps {
    onClick: () => void;
}

export function BetSlipFab({ onClick }: BetSlipFabProps) {
    const { selections } = useBetSlip();

    if (selections.length === 0) return null;

    return (
        <button
            onClick={onClick}
            className={cn(
                "fixed bottom-6 right-6 z-50",
                "flex items-center gap-2 px-4 py-3",
                "bg-pink-600 hover:bg-pink-700 text-white",
                "rounded-full shadow-lg hover:shadow-xl",
                "transition-all duration-200 transform hover:scale-105",
                "font-semibold text-sm"
            )}
        >
            <Receipt className="h-4 w-4" />
            <span>Bet Slip ({selections.length})</span>
        </button>
    );
}
