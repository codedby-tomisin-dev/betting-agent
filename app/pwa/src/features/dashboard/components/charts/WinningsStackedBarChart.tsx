"use client";

import { Bet } from "@/shared/types";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { format } from "date-fns";
import { useMemo } from "react";
import { BetModel } from "@/features/betting/models/BetModel";

interface WinningsStackedBarChartProps {
    bets: Bet[];
}

export function WinningsStackedBarChart({ bets }: WinningsStackedBarChartProps) {
    const chartData = useMemo(() => {
        return bets
            .filter(b => b.status === "finished" && b.selections?.wager && b.placed_at)
            .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
            .map(b => {
                const model = new BetModel(b);
                const stake = model.stake;
                const profit = model.profit;
                const isWin = model.isWin;

                return {
                    date: format(new Date(b.target_date), "d MMM"),
                    fullDate: format(new Date(b.target_date), "d MMM yyyy"),
                    betId: b.id.substring(0, 6),
                    Stake: stake,
                    "Net Profit": isWin ? profit : 0,
                    "Net Loss": isWin ? 0 : Math.abs(profit),
                    profit
                };
            });
    }, [bets]);

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `£${value}`}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        cursor={{ fill: 'transparent' }}
                    />
                    <Legend />
                    <Bar dataKey="Stake" stackId="a" fill="#94a3b8" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Net Profit" stackId="a" fill="#8a2be2" radius={[4, 4, 0, 0]} />
                    {/* For losses, we might want to show them differently. 
                        If we stack, a "Loss" would reduce the height. 
                        Standard stacked charts with negatives can be tricky.
                        Simple approach: Stake is always positive. 
                        If we lost, we don't have "Net Profit".
                        Maybe just show Realized Returns vs Stake side by side? 
                        User asked for "Stacked". 
                        Let's treat "Winnings" as the gross return. 
                        Stack 1: Stake. 
                        Stack 2: Profit (only if win). 
                        If loss, the bar is just the stake? No, that implies we kept the stake.
                        If loss, we lost the stake.
                        
                        Alternative interpretation:
                        Bar 1: Stake
                        Bar 2: Winnings (Gross)
                        This is a Grouped Bar Chart.

                        Let's stick to:
                        Base: Stake (Gray)
                        Stack: Net Profit (Green)
                        
                        If loss:
                        Base: Realized (Gray?) -> No, Stake is what matched.
                        Maybe just show "Stake" and "Profit".
                    */}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
