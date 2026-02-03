"use client";

import { useBets } from "@/shared/hooks";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { BalanceOverview } from "./BalanceOverview";
import { PerformanceChartView } from "./PerformanceChartView";
import { BetApprovalContainer, ActiveBetsListView } from "@/features/betting";
import { Toaster } from "@/components/ui/sonner";

export function DashboardContainer() {
    const { bets, loading, error } = useBets();
    const stats = useDashboardStats(bets);

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading dashboard...</div>;
    }

    if (error) {
        return <div className="flex h-screen items-center justify-center text-red-500">Error: {error}</div>;
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <Toaster />

            <BalanceOverview stats={stats} />

            <BetApprovalContainer bets={bets} />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <PerformanceChartView bets={bets} />
                </div>
                <div className="lg:col-span-2">
                    <ActiveBetsListView bets={bets} />
                </div>
            </div>
        </div>
    );
}
