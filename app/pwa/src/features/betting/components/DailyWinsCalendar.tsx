"use client";

import { useMemo } from "react";
import { Bet } from "@/shared/types";
import { BetModel } from "../models/BetModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";

interface DailyWinsCalendarProps {
    bets: Bet[];
}

type DayResult = "win" | "loss" | "none";

interface DayData {
    date: Date;
    result: DayResult;
    profit: number;
    betCount: number;
}

/**
 * Renders a month-view grid showing daily P&L outcomes.
 * Green = net win day, Red = net loss day, neutral = no settled bets.
 */
export function DailyWinsCalendar({ bets }: DailyWinsCalendarProps) {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const dayDataMap = useMemo(() => {
        const map = new Map<string, { profit: number; betCount: number }>();

        bets.forEach(bet => {
            const model = new BetModel(bet);
            if (!model.isFinished) return;

            const dateKey = bet.placed_at
                ? format(new Date(bet.placed_at as Date), "yyyy-MM-dd")
                : null;
            if (!dateKey) return;

            const existing = map.get(dateKey) ?? { profit: 0, betCount: 0 };
            const profit = (bet.realized_returns ?? 0) - (bet.selections?.wager?.stake ?? 0);
            map.set(dateKey, {
                profit: existing.profit + profit,
                betCount: existing.betCount + 1,
            });
        });

        return map;
    }, [bets]);

    const days: DayData[] = eachDayOfInterval({ start: monthStart, end: monthEnd }).map(date => {
        const key = format(date, "yyyy-MM-dd");
        const data = dayDataMap.get(key);
        let result: DayResult = "none";
        if (data) {
            result = data.profit >= 0 ? "win" : "loss";
        }
        return { date, result, profit: data?.profit ?? 0, betCount: data?.betCount ?? 0 };
    });

    // Pad start of grid for correct weekday alignment (Mon–Sun)
    const firstDayOfWeek = (getDay(monthStart) + 6) % 7; // 0=Mon
    const paddingCells = Array.from({ length: firstDayOfWeek });

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return (
        <Card className="h-full bg-transparent border-0 shadow-none">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl font-[400] text-gray-900">
                    {format(today, "MMMM yyyy")} — Daily Results
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-1">
                    {dayLabels.map(label => (
                        <div key={label} className="text-center text-[10px] font-semibold text-gray-400 uppercase pb-1">
                            {label}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                    {paddingCells.map((_, i) => (
                        <div key={`pad-${i}`} />
                    ))}
                    {days.map(({ date, result, profit, betCount }) => {
                        const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
                        const isFuture = date > today;

                        let bg = "bg-gray-100 text-gray-400";
                        if (!isFuture && result === "win") bg = "bg-green-100 text-green-700";
                        if (!isFuture && result === "loss") bg = "bg-red-100 text-red-600";

                        return (
                            <div
                                key={format(date, "yyyy-MM-dd")}
                                title={
                                    betCount > 0
                                        ? `${betCount} bet${betCount > 1 ? "s" : ""} · ${profit >= 0 ? "+" : ""}£${profit.toFixed(2)}`
                                        : undefined
                                }
                                className={`
                                    relative flex flex-col items-center justify-center rounded-lg aspect-square text-xs font-medium
                                    transition-transform hover:scale-105 cursor-default
                                    ${bg}
                                    ${isToday ? "ring-2 ring-offset-1 ring-gray-400" : ""}
                                    ${isFuture ? "opacity-30" : ""}
                                `}
                            >
                                <span className="leading-none">{format(date, "d")}</span>
                                {betCount > 0 && (
                                    <span className="text-[8px] leading-none mt-0.5 opacity-80">
                                        {profit >= 0 ? "+" : ""}£{Math.abs(profit).toFixed(0)}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 rounded-sm bg-green-100" /> Win day
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 rounded-sm bg-red-100" /> Loss day
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 rounded-sm bg-gray-100" /> No bets
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
