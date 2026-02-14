import { formatCurrency } from "@/shared/utils";

import { DashboardStats } from "../types";

interface BalanceOverviewProps {
    stats: DashboardStats;
    walletBalance: number | null;
    activeExposure: number;
}

export function BalanceOverview({ stats, walletBalance, activeExposure }: Readonly<BalanceOverviewProps>) {
    const isPositive = stats.recentProfit >= 0;

    // Prefer the live wallet balance; fall back to bet-derived balance
    const displayBalance = walletBalance ?? stats.currentBalance;
    const [major, minor] = formatCurrency(displayBalance).split(".");

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-sm font-medium">Current Balance</span>
                </div>

                <div className="flex items-baseline gap-1">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
                        {major}
                    </h1>
                    <span className="text-sm md:text-base text-gray-500 font-medium">.{minor ?? "00"}</span>

                    {activeExposure > 0 && (
                        <span className="ml-3 text-sm text-amber-600 font-medium">
                            {formatCurrency(activeExposure)} at risk
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <span className={isPositive ? "text-green-600 font-[800]" : "text-red-600 font-medium"}>
                        {isPositive ? "+" : ""}{formatCurrency(stats.recentProfit)}
                    </span>
                    <span className="text-muted-foreground">• {isPositive ? "Gained" : "Lost"}</span>
                </div>
            </div>
        </div>
    );
}

