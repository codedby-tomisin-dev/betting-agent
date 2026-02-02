"use client";

import { useBets } from "@/shared/hooks";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { StatsCardsView } from "./StatsCardsView";
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

            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Welcome back!</h1>
                <p className="text-gray-500">Here&apos;s your betting performance at a glance.</p>
            </div>

            <BetApprovalContainer bets={bets} />

            <StatsCardsView stats={stats} />

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
