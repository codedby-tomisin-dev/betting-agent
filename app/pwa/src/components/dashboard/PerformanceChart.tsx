
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bet } from "@/lib/api";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";

interface PerformanceChartProps {
    bets: Bet[];
}

export function PerformanceChart({ bets }: PerformanceChartProps) {
    // Filter finished bets and sort by date ascending for the chart
    const data = bets
        .filter(b => b.status === "finished" && b.balance?.ending !== undefined)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map(b => ({
            date: format(new Date(b.created_at || b.target_date), "MMM d"), // simple date format
            balance: b.balance?.ending
        }));

    // If no data, show some placeholder or empty state
    if (data.length === 0) {
        // Mock data for visualization if empty
        // data.push({ date: 'Jan 1', balance: 1000 });
        // data.push({ date: 'Jan 2', balance: 1050 });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
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
