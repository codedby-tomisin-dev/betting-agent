"use client";

import { Bet } from "@/shared/types";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { useMemo } from "react";
import { BetModel } from "@/features/betting/models/BetModel";
import { formatCurrency } from "@/shared/utils";
import { DashboardStats } from "../types";

interface BalanceCardProps {
    bets: Bet[];
    stats: DashboardStats;
    walletBalance: number | null;
    activeExposure: number;
    className?: string;
}

/**
 * Combined balance display + trending chart card (Bloom-style).
 *
 * The balance text floats above a subtle area sparkline on a purple gradient.
 */
export function BalanceCard({ bets, stats, walletBalance, activeExposure, className }: Readonly<BalanceCardProps>) {
    const displayBalance = walletBalance ?? stats.currentBalance;
    const [major, minor] = displayBalance.toString().split(".");
    const isPositive = stats.recentProfit >= 0;

    const chartData = useMemo(() => {
        const data = bets
            .filter(b => b.status === "finished" && b.balance?.ending !== undefined && b.finished_at)
            .sort((a, b) => {
                const dateA = a.finished_at instanceof Date ? a.finished_at : (a.finished_at as { toDate: () => Date }).toDate();
                const dateB = b.finished_at instanceof Date ? b.finished_at : (b.finished_at as { toDate: () => Date }).toDate();
                return dateA.getTime() - dateB.getTime();
            })
            .map(b => {
                const model = new BetModel(b);
                const date = b.finished_at instanceof Date ? b.finished_at : (b.finished_at as { toDate: () => Date }).toDate();
                return { date: format(date, "d MMM"), balance: model.endingBalance };
            });

        if (data.length > 0) {
            data.unshift({ date: "Start", balance: 0 });
        } else {
            data.push({ date: "Start", balance: 0 });
        }

        return data;
    }, [bets]);

    return (
        <div
            className={`relative rounded-3xl overflow-hidden flex flex-col justify-between shadow-lg ${className}`}
            style={{
                background: "linear-gradient(180deg, #5856D6 0%, #4a0e82 100%)",
            }}
        >
            {/* Balance text layer - floating on top */}
            <div className="relative z-10 px-6 pt-6 flex flex-col h-full justify-between pb-6">
                <div>
                    {/* Header Row */}
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium text-white/80">Total Balance</p>
                        <div className="p-1.5 bg-white/10 rounded-full backdrop-blur-md">
                            {/* Eye icon or similar could go here if needed, keeping it simple */}
                            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                        </div>
                    </div>

                    {/* Main balance */}
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-white/90">£</span>
                        <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-sm">
                            {major}
                        </h1>
                        <span className="text-2xl text-white/80 font-semibold">.{minor ?? "00"}</span>
                    </div>
                </div>

                {/* Stats Row at bottom */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                        <span className={`text-xs font-bold ${isPositive ? "text-green-300" : "text-red-300"}`}>
                            {isPositive ? "↑" : "↓"} {formatCurrency(stats.recentProfit)}
                        </span>
                        <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">Return</span>
                    </div>

                    {activeExposure > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                            <span className="text-xs font-bold text-yellow-100">{formatCurrency(activeExposure)}</span>
                            <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">Risk</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Edge-to-edge Chart Layer */}
            <div className="absolute inset-0 z-0 top-1/3 pointer-events-none">
                {/* Mask gradient at bottom to fade nicely if needed, but 'edge to edge' usually means flush. 
                     We will make it flush to bottom. */}
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="balanceChartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
                                <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="balance"
                            stroke="#ffffff"
                            strokeWidth={3}
                            strokeOpacity={0.8}
                            fill="url(#balanceChartGradient)"
                            fillOpacity={1}
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Overlay gradient for the "intricately woven" edge look */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#4a0e82] via-[#4a0e82]/50 to-transparent pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#4a0e82]/30 to-transparent pointer-events-none" />
                <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#5856D6]/30 to-transparent pointer-events-none" />
            </div>
        </div>
    );
}
