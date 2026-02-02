"use client";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/shared/utils";
import { Check } from "lucide-react";

interface BetTotalsDisplayProps {
    totalStake: number;
    totalReturns: number;
    isApproving: boolean;
    onApprove: () => void;
    onReject: () => void;
}

export function BetTotalsDisplay({
    totalStake,
    totalReturns,
    isApproving,
    onApprove,
    onReject,
}: BetTotalsDisplayProps) {
    return (
        <>
            <div className="flex flex-row justify-between">
                <div>
                    <p className="text-xs text-gray-500 mb-1">Total Stake</p>
                    <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(totalStake)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 mb-1">Potential Returns</p>
                    <p className="text-xl font-bold text-green-600">
                        {formatCurrency(totalReturns)}
                    </p>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300"
                    onClick={onReject}
                >
                    Reject
                </Button>
                <Button
                    size="sm"
                    className="bg-pink-500 hover:bg-pink-600 text-white"
                    onClick={(e) => {
                        e.stopPropagation();
                        onApprove();
                    }}
                    disabled={isApproving}
                >
                    {isApproving ? (
                        "Approving..."
                    ) : (
                        <>
                            <Check className="mr-2 h-4 w-4" />
                            Approve & Place
                        </>
                    )}
                </Button>
            </div>
        </>
    );
}
