"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface StakeLimitsSectionProps {
    minStake: number;
    minProfit: number;
    onMinStakeChange: (value: number) => void;
    onMinProfitChange: (value: number) => void;
}

export function StakeLimitsSection({
    minStake,
    minProfit,
    onMinStakeChange,
    onMinProfitChange,
}: StakeLimitsSectionProps) {
    return (
        <>
            <Separator />

            <div className="space-y-2">
                <Label htmlFor="min-stake">Min Stake ($)</Label>
                <Input
                    id="min-stake"
                    type="number"
                    min="1"
                    step="0.1"
                    value={minStake}
                    onChange={(e) => onMinStakeChange(parseFloat(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">Minimum stake per bet (Betfair requirement)</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="min-profit">Min Profit ($)</Label>
                <Input
                    id="min-profit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={minProfit}
                    onChange={(e) => onMinProfitChange(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">Minimum profit per bet</p>
            </div>
        </>
    );
}
