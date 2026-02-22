"use client";

import { Calendar, Check, X } from "lucide-react";
import { formatCurrency } from "@/shared/utils";
import { format } from "date-fns";
import { cn } from "@/shared/utils";
import { BetModel } from "../models/BetModel";

interface RecentActivityRowProps {
    betModel: BetModel;
    onClick: () => void;
    isLast?: boolean;
}

export function RecentActivityRow({ betModel, onClick, isLast }: RecentActivityRowProps) {
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
            className={cn(
                "group flex flex-col sm:flex-row sm:items-center justify-between py-4 px-3 hover:bg-gray-50/60 transition-all cursor-pointer rounded-xl border border-transparent",
                !isLast && "border-b-gray-100 hover:border-transparent rounded-none hover:rounded-xl"
            )}
            onClick={onClick}
        >
            <div className="flex-1 min-w-0 pr-4 space-y-1.5 mb-3 sm:mb-0">
                <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate text-sm sm:text-base">
                    {/* Clean up any embedded dates from the DB title */}
                    {title.split(" + ")[0].split(" - 202")[0]}
                    {title.includes(" + ") && (
                        <span className="text-gray-500 font-normal text-sm"> + {title.split(" + ")[1]}</span>
                    )}
                </p>
                <div className="flex items-center text-xs text-gray-500 font-medium">
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    Target: {targetDate ? format(targetDate, "d MMM yyyy") : "N/A"}
                </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-start sm:justify-end w-full sm:w-auto">
                {isFinished ? (
                    <div className={cn(
                        "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap",
                        isWin
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                    )}>
                        {isWin ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        {isWin ? "WON" : "LOST"}
                        <span className={cn("ml-1", isWin ? "text-green-600" : "text-red-600")}>
                            {isWin ? "+" : ""}{formatCurrency(profit)}
                        </span>
                    </div>
                ) : (
                    <div className="px-3.5 py-1.5 rounded-full bg-gray-100/80 text-gray-600 text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                        {status === "placed" ? "Active" : status}
                    </div>
                )}
            </div>
        </div>
    );
}
