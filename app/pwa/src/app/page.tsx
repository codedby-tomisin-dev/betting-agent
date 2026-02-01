
"use client";

import { useBets } from "@/lib/hooks/useBets";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { ActiveBetsList } from "@/components/betting/ActiveBetsList";
import { BetApprovalInterface } from "@/components/betting/BetApprovalInterface";
import { Toaster } from "@/components/ui/sonner";

export default function Home() {
  const { bets, loading, error } = useBets();

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

      {/* Pending Approvals - Top Priority */}
      <BetApprovalInterface bets={bets} />

      <StatsCards bets={bets} />

      {/* Performance Overview and Active Betslips - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <PerformanceChart bets={bets} />
        </div>
        <div className="lg:col-span-2">
          <ActiveBetsList bets={bets} />
        </div>
      </div>
    </div>
  );
}
