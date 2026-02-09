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

export function RecentActivityRow({ betModel, onClick }: RecentActivityRowProps) {
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
                "group flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 hover:bg-gray-50/50 transition-colors cursor-pointer px-2 rounded-lg",
            )}
            onClick={onClick}
        >
            <div className="space-y-1 sm:mb-0">
                <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {title.split(" + ")[0]}
                    {title.includes(" + ") && (
                        <span className="text-gray-500 font-normal"> + {title.split(" + ")[1]}</span>
                    )}
                </p>
                <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="mr-2 h-3.5 w-3.5" />
                    Target: {targetDate ? format(targetDate, "d MMM yyyy") : "N/A"}
                </div>
            </div>

            <div className="flex items-center w-full sm:w-auto justify-between sm:justify-end">
                {isFinished ? (
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide",
                        isWin
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                    )}>
                        {isWin ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        {isWin ? "WON" : "LOST"}
                        <span className="ml-1">
                            {isWin ? "+" : ""}{formatCurrency(profit)}
                        </span>
                    </div>
                ) : (
                    <div className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium uppercase tracking-wide">
                        {status === "placed" ? "Active" : status}
                    </div>
                )}
            </div>
        </div>
    );
}
