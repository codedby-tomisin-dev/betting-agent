"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface BankrollSettingsSectionProps {
    bankrollPercent: number;
    maxBankroll: number;
    useReliableTeams: boolean;
    onBankrollPercentChange: (value: number) => void;
    onMaxBankrollChange: (value: number) => void;
    onReliableTeamsChange: (value: boolean) => void;
}

export function BankrollSettingsSection({
    bankrollPercent,
    maxBankroll,
    useReliableTeams,
    onBankrollPercentChange,
    onMaxBankrollChange,
    onReliableTeamsChange,
}: BankrollSettingsSectionProps) {
    return (
        <>
            <div className="space-y-2">
                <Label htmlFor="bankroll-percent">Bankroll % to Use</Label>
                <Input
                    id="bankroll-percent"
                    type="number"
                    min="1"
                    max="100"
                    value={bankrollPercent}
                    onChange={(e) => onBankrollPercentChange(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">Percentage of balance to use for betting</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="max-bankroll">Max Bankroll ($)</Label>
                <Input
                    id="max-bankroll"
                    type="number"
                    min="0"
                    value={maxBankroll}
                    onChange={(e) => onMaxBankrollChange(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">Maximum amount to use even if balance is higher</p>
            </div>

            <Separator />

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="reliable-teams">Use Reliable Teams Only</Label>
                    <Badge variant={useReliableTeams ? "default" : "secondary"}>
                        {useReliableTeams ? "Enabled" : "Disabled"}
                    </Badge>
                </div>
                <Select
                    value={useReliableTeams.toString()}
                    onValueChange={(val) => onReliableTeamsChange(val === "true")}
                >
                    <SelectTrigger id="reliable-teams">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="true">Yes - Only top teams</SelectItem>
                        <SelectItem value="false">No - All teams</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </>
    );
}
