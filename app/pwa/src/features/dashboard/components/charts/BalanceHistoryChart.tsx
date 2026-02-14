"use client";

import { Bet } from "@/shared/types";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { useMemo } from "react";
import { ChartDataPoint } from "../../types";
import { BetModel } from "@/features/betting/models/BetModel";

interface BalanceHistoryChartProps {
    bets: Bet[];
}

export function BalanceHistoryChart({ bets }: Readonly<BalanceHistoryChartProps>) {
    const chartData = useMemo(() => {
        const data: ChartDataPoint[] = bets
            .filter(b => b.status === "finished" && b.balance?.ending !== undefined && b.finished_at)
            .sort((a, b) => {
                const dateA = a.finished_at instanceof Date ? a.finished_at : (a.finished_at as { toDate: () => Date }).toDate();
                const dateB = b.finished_at instanceof Date ? b.finished_at : (b.finished_at as { toDate: () => Date }).toDate();
                return dateA.getTime() - dateB.getTime();
            })
            .map(b => {
                const model = new BetModel(b);
                // executed_at / finished_at
                const date = b.finished_at instanceof Date ? b.finished_at : (b.finished_at as { toDate: () => Date }).toDate();

                return {
                    date: format(date, "d MMM yyyy"),
                    balance: model.endingBalance
                };
            });

        if (data.length > 0) {
            data.unshift({ date: "Start", balance: 0 });
        } else {
            data.push({ date: 'Start', balance: 0 });
        }

        return data;
    }, [bets]);

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8a2be2" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8a2be2" stopOpacity={0} />
                        </linearGradient>
                    </defs>
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
                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                    <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                    <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#8a2be2"
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                        strokeWidth={3}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
