
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
            date: format(new Date(b.target_date), "d MMM yyyy"),
            balance: b.balance?.ending
        }));

    // If data exists, prepend a starting point
    if (data.length > 0) {
        // Use a date slightly before the first bet, or just label it "Start"
        // To keep X-Axis consistent (if it's parsing dates), we might need a valid date string.
        // But for "d MMM yyyy", "Start" won't parse well if we used date objects.
        // Since we are using formatted strings, "Start" is fine as a categorical label if XAxis allows.
        // However, Recharts categorical axis works best.
        // Let's try prepending a point.
        data.unshift({ date: "Start", balance: 0 });
    } else {
        // Mock data for visualization if empty
        data.push({ date: 'Start', balance: 0 });
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
