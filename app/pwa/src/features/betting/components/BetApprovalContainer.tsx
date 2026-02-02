"use client";

import { useState } from "react";
import { Bet, BetSelectionItem } from "@/shared/types";
import { useBetApproval } from "../hooks/useBetApproval";
import { BetApprovalView } from "./BetApprovalView";
import { PendingBetCard } from "./PendingBetCard";

interface BetApprovalContainerProps {
    bets: Bet[];
}

export function BetApprovalContainer({ bets }: BetApprovalContainerProps) {
    const pendingBets = bets.filter(b => b.status === "analyzed");
    const [isExpanded, setIsExpanded] = useState(true);
    const { approvingBetId, submitBetForPlacement } = useBetApproval();

    const handleApproveBet = async (betId: string, getFinalSelections: () => BetSelectionItem[]) => {
        const finalItems = getFinalSelections();
        await submitBetForPlacement(betId, finalItems);
    };

    const handleRejectBet = (betId: string) => {
        // TODO: Implement reject functionality
        console.log("Reject bet:", betId);
    };

    return (
        <BetApprovalView
            pendingCount={pendingBets.length}
            isExpanded={isExpanded}
            onToggleExpand={() => setIsExpanded(!isExpanded)}
        >
            {pendingBets.map(bet => (
                <PendingBetCard
                    key={bet.id}
                    bet={bet}
                    isApproving={approvingBetId === bet.id}
                    onApprove={(getFinalSelections) => handleApproveBet(bet.id, getFinalSelections)}
                    onReject={() => handleRejectBet(bet.id)}
                />
            ))}
        </BetApprovalView>
    );
}
