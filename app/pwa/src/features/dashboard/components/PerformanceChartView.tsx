"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bet } from "@/shared/types";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { useMemo } from "react";
import { ChartDataPoint } from "../types";

interface PerformanceChartViewProps {
    bets: Bet[];
}

export function PerformanceChartView({ bets }: PerformanceChartViewProps) {
    const chartData = useMemo(() => {
        const data: ChartDataPoint[] = bets
            .filter(b => b.status === "finished" && b.balance?.ending !== undefined)
            .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
            .map(b => ({
                date: format(new Date(b.target_date), "d MMM yyyy"),
                balance: b.balance?.ending
            }));

        if (data.length > 0) {
            data.unshift({ date: "Start", balance: 0 });
        } else {
            data.push({ date: 'Start', balance: 0 });
        }

        return data;
    }, [bets]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent className="pl-2 -ml-8">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                                tickFormatter={(value) => `$${value}`}
                            />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                            />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#10b981"
                                fillOpacity={1}
                                fill="url(#colorBalance)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
