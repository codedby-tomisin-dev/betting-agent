"use client";

import { useState, useMemo } from "react";
import { useBets, useWallet } from "@/shared/hooks";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { placeBets } from "@/shared/api/bettingApi";
import { BalanceCard } from "./BalanceCard";
import { RiskProfileCard } from "./RiskProfileCard";
import { BetApprovalContainer, RecentBetsListView, UpcomingGamesGrid, BetSlipFab, BetSlipDialog } from "@/features/betting";
import { BetSlipProvider } from "@/features/betting/context/BetSlipContext";
import { BentoGrid, BentoCell } from "@/components/ui/bento-grid";
import { Toaster } from "@/components/ui/sonner";

export function DashboardContainer() {
    const { bets, loading, error } = useBets();
    const { wallet } = useWallet();
    const stats = useDashboardStats(bets);

    const [isBetSlipOpen, setIsBetSlipOpen] = useState(false);

    const activeExposure = useMemo(() => {
        return bets
            .filter(b => b.status === "placed" || b.status === "ready")
            .reduce((sum, b) => sum + (b.selections?.wager?.stake ?? 0), 0);
    }, [bets]);

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

                    {/* Pending actions (approvals, etc) appear above the grid if active */}
                    <BetApprovalContainer bets={bets} />

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
                            <UpcomingGamesGrid />
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
                </div>
            </div>
        </BetSlipProvider>
    );
}
