"use client";

import { Calendar, ChevronRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/shared/utils";
import { BetModel } from "../models/BetModel";

interface PendingBetSummaryRowProps {
    betModel: BetModel;
    onClick: () => void;
}

export function PendingBetSummaryRow({ betModel, onClick }: PendingBetSummaryRowProps) {
    const {
        title,
        targetDate,
    } = betModel;

    return (
        <div
            className={cn(
                "group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer relative overflow-hidden",
            )}
            onClick={onClick}
        >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg" />

            <div className="space-y-1 mb-3 sm:mb-0 pl-2">
                <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {title}
                </p>
                <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="mr-2 h-3.5 w-3.5" />
                    Target: {targetDate ? format(targetDate, "d MMM yyyy") : "N/A"}
                </div>
            </div>

            <div className="flex items-center w-full sm:w-auto justify-between sm:justify-end gap-3 pl-2 sm:pl-0">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wide">
                    <Clock className="h-3.5 w-3.5" />
                    Pending Approval
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
            </div>
        </div>
    );
}
