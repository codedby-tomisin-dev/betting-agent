"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/shared/utils";
import { Wallet, Target } from "lucide-react";
import { DashboardStats } from "../types";

interface StatsCardsViewProps {
    stats: DashboardStats;
}

export function StatsCardsView({ stats }: StatsCardsViewProps) {
    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{formatCurrency(stats.currentBalance)}</div>
                        <p className="text-xs text-muted-foreground">
                            +{formatCurrency(stats.totalProfit)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.winRate.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.wins} wins / {stats.finishedBetsCount} placed
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
