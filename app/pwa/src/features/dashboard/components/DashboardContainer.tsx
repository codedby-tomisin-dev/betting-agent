"use client";

import { useState, useMemo, useEffect } from "react";
import { useBets, useWallet } from "@/shared/hooks";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { placeBets, fetchSuggestions } from "@/shared/api/bettingApi";
import { BalanceCard } from "./BalanceCard";
import { RiskProfileCard } from "./RiskProfileCard";
import { RecentBetsListView, UpcomingGamesGrid, BetSlipFab, BetSlipDialog } from "@/features/betting";
import { BetSlipProvider } from "@/features/betting/context/BetSlipContext";
import { BentoGrid, BentoCell } from "@/components/ui/bento-grid";
import { Toaster } from "@/components/ui/sonner";
import { PendingBetDialog } from "@/features/betting/components/PendingBetDialog";
import { useBetApproval } from "@/features/betting/hooks/useBetApproval";
import { BetSelectionItem, Bet } from "@/shared/types";

export function DashboardContainer() {
    const { bets, loading, error } = useBets();
    const { wallet } = useWallet();
    const stats = useDashboardStats(bets);

    const [isBetSlipOpen, setIsBetSlipOpen] = useState(false);
    const [selectedBetId, setSelectedBetId] = useState<string | null>(null);
    const { approvingBetId, submitBetForPlacement } = useBetApproval();

    // Add state for suggestions
    const [suggestions, setSuggestions] = useState<Bet[]>([]);

    useEffect(() => {
        const loadSuggestions = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const results = await fetchSuggestions(today);
                setSuggestions(results);
            } catch (e) {
                console.error("Failed to load suggestions", e);
            }
        };
        loadSuggestions();
    }, []);

    const pendingBets = useMemo(() => bets.filter(b => b.status === "analyzed" || b.status === "intent"), [bets]);

    // Prioritize suggestions if available, otherwise fallback to existing pending bets
    const mainPendingBet = suggestions.length > 0 ? suggestions[0] : (pendingBets.length > 0 ? pendingBets[0] : null);

    const activeExposure = useMemo(() => {
        return bets
            .filter(b => b.status === "placed" || b.status === "ready")
            .reduce((sum, b) => sum + (b.selections?.wager?.stake ?? 0), 0);
    }, [bets]);

    const handleApproveBet = async (betId: string, getFinalSelections: () => BetSelectionItem[]) => {
        const finalItems = getFinalSelections();
        await submitBetForPlacement(betId, finalItems);
        setSelectedBetId(null);
    };

    const handleRejectBet = (betId: string) => {
        // TODO: Implement reject functionality
        console.log("Reject bet:", betId);
        setSelectedBetId(null);
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading dashboard...</div>;
    }

    if (error) {
        return <div className="flex h-screen items-center justify-center text-red-500">Error: {error}</div>;
    }

    return (
        <BetSlipProvider>
            <div className="bg-white rounded-3xl shadow-sm p-6 max-w-7xl mx-auto w-full">
                <div className="space-y-2">
                    <Toaster />

                    <BentoGrid>
                        {/* Top Row: Balance Card (3 cols) + Risk Profile (1 col) */}
                        <BentoCell className="col-span-1 md:col-span-2 lg:col-span-2 min-h-[300px]">
                            <BalanceCard
                                bets={bets}
                                stats={stats}
                                walletBalance={wallet?.amount ?? null}
                                activeExposure={activeExposure}
                                className="h-full"
                            />
                        </BentoCell>

                        <BentoCell className="col-span-1 md:col-span-2 lg:col-span-2 min-h-[300px]">
                            <RiskProfileCard />
                        </BentoCell>

                        <BentoCell className="col-span-1 md:col-span-2 lg:col-span-2 mt-8">
                            <UpcomingGamesGrid
                                pendingBet={mainPendingBet}
                                onPickedClick={() => mainPendingBet && setSelectedBetId(mainPendingBet.id)}
                            />
                        </BentoCell>

                        <BentoCell className="col-span-1 md:col-span-2 lg:col-span-2 min-h-[240px]">
                            <RecentBetsListView bets={bets} />
                        </BentoCell>
                    </BentoGrid>

                    <BetSlipFab onClick={() => setIsBetSlipOpen(true)} />
                    <BetSlipDialog
                        isOpen={isBetSlipOpen}
                        onClose={() => setIsBetSlipOpen(false)}
                        onPlaceBets={placeBets}
                    />

                    <PendingBetDialog
                        bet={selectedBetId ? pendingBets.find(b => b.id === selectedBetId) || null : null}
                        isOpen={!!selectedBetId}
                        onClose={() => setSelectedBetId(null)}
                        isApproving={approvingBetId === (selectedBetId || "")}
                        onApprove={(getFinalSelections) => selectedBetId && handleApproveBet(selectedBetId, getFinalSelections)}
                        onReject={() => selectedBetId && handleRejectBet(selectedBetId)}
                    />
                </div>
            </div>
        </BetSlipProvider>
    );
}
