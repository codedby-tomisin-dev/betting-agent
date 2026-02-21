"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bet, BetSelectionItem } from "@/shared/types";
import { useBetApproval } from "../hooks/useBetApproval";
import { PendingBetDialog } from "./PendingBetDialog";
import { PickedForYouCard } from "./PickedForYouCard";

interface BetApprovalContainerProps {
    bets: Bet[];
}

export function BetApprovalContainer({ bets }: BetApprovalContainerProps) {
    const pendingBets = bets.filter(b => b.status === "analyzed");
    const [selectedBetId, setSelectedBetId] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);
    const { approvingBetId, submitBetForPlacement } = useBetApproval();

    // Use the first pending bet for the "Picked for You" card interaction
    // In a real scenario, this might show multiple cards or a summary of all
    const mainPendingBet = pendingBets.length > 0 ? pendingBets[0] : null;

    // If no pending bets, we can hide this section or show a simplified state
    // For now, if no pending bets, we'll return null or empty to not clutter dashboard
    if (!mainPendingBet) return null;

    const handleApproveBet = async (betId: string, getFinalSelections: () => BetSelectionItem[]) => {
        const finalItems = getFinalSelections();
        await submitBetForPlacement(betId, finalItems);
        if (selectedBetId === betId) {
            setSelectedBetId(null);
        }
    };

    const handleRejectBet = (betId: string) => {
        // TODO: Implement reject functionality
        console.log("Reject bet:", betId);
        if (selectedBetId === betId) {
            setSelectedBetId(null);
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold text-gray-900">Pending Actions</h2>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-gray-500 hover:text-gray-700"
                >
                    <span className="mr-2 text-xs font-medium uppercase tracking-wide">{isExpanded ? 'Hide' : 'Show'}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
            </div>

            {isExpanded && (
                <div className="flex gap-4 overflow-x-auto pb-6 px-1 scrollbar-hide -mx-1 snap-x animate-in slide-in-from-top-2 duration-300">
                    {/* Picked For You Card - only shows if there are pending bets */}
                    {mainPendingBet && (
                        <div className="snap-start">
                            <PickedForYouCard
                                bet={mainPendingBet}
                                onClick={() => setSelectedBetId(mainPendingBet.id)}
                            />
                        </div>
                    )}
                </div>
            )}

            <PendingBetDialog
                bet={selectedBetId ? pendingBets.find(b => b.id === selectedBetId) || null : null}
                isOpen={!!selectedBetId}
                onClose={() => setSelectedBetId(null)}
                isApproving={approvingBetId === (selectedBetId || "")}
                onApprove={(getFinalSelections) => selectedBetId && handleApproveBet(selectedBetId, getFinalSelections)}
                onReject={() => selectedBetId && handleRejectBet(selectedBetId)}
            />
        </section>
    );
}
