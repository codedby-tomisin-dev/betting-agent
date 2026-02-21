"use client";

import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/shared/utils";
import { format } from "date-fns";
import { cn } from "@/shared/utils";
import { BetModel } from "../models/BetModel";

interface RecentBetCardProps {
    betModel: BetModel;
    onClick: () => void;
}

export function RecentBetCard({ betModel, onClick }: RecentBetCardProps) {
    const {
        title,
        targetDate,
        profit,
        isFinished,
        isWin,
        status
    } = betModel;

    return (
        <div
            className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-gray-100 bg-white shadow-xs hover:shadow-md transition-all cursor-pointer"
            onClick={onClick}
        >
            <div className="space-y-2 mb-4 sm:mb-0">
                <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {title}
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="mr-2 h-3.5 w-3.5" />
                    Target: {targetDate ? format(targetDate, "d MMM yyyy") : "N/A"}
                </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">

                {isFinished ? (
                    <div className={cn(
                        "flex flex-col items-center justify-center min-w-[100px] h-[50px] rounded-lg border px-3 py-1",
                        isWin
                            ? "bg-green-50 border-green-100 text-green-700"
                            : "bg-red-50 border-red-100 text-red-700"
                    )}>
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                            {isWin ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {isWin ? "Won" : "Lost"}
                        </div>
                        <div className="text-sm font-bold">
                            {isWin ? "+" : ""}{formatCurrency(profit)}
                        </div>
                    </div>
                ) : (
                    <Badge variant="secondary" className="h-[50px] min-w-[100px] flex items-center justify-center bg-gray-100 text-gray-600 font-medium">
                        {status === "placed" ? "Active" : status}
                    </Badge>
                )}
            </div>
        </div>
    );
}
