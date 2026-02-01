"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { triggerAutomatedBetting } from "@/lib/api";
import { updateSettings } from "@/lib/settings";
import { useSettings } from "@/lib/hooks/useSettings";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Play, Save, Settings as SettingsIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

export function ConfigurationPanel() {
    const { settings, loading: settingsLoading } = useSettings();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Local state for form
    const [bankrollPercent, setBankrollPercent] = useState(settings.BANKROLL_PERCENT);
    const [maxBankroll, setMaxBankroll] = useState(settings.MAX_BANKROLL);
    const [riskAppetite, setRiskAppetite] = useState(settings.RISK_APPETITE);
    const [useReliableTeams, setUseReliableTeams] = useState(settings.USE_RELIABLE_TEAMS);
    const [minStake, setMinStake] = useState(settings.MIN_STAKE);
    const [minProfit, setMinProfit] = useState(settings.MIN_PROFIT);

    // Sync form with settings when they load
    useEffect(() => {
        setBankrollPercent(settings.BANKROLL_PERCENT);
        setMaxBankroll(settings.MAX_BANKROLL);
        setRiskAppetite(settings.RISK_APPETITE);
        setUseReliableTeams(settings.USE_RELIABLE_TEAMS);
        setMinStake(settings.MIN_STAKE);
        setMinProfit(settings.MIN_PROFIT);
    }, [settings]);

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            await updateSettings({
                BANKROLL_PERCENT: bankrollPercent,
                MAX_BANKROLL: maxBankroll,
                RISK_APPETITE: riskAppetite,
                USE_RELIABLE_TEAMS: useReliableTeams,
                MIN_STAKE: minStake,
                MIN_PROFIT: minProfit,
            });
            toast.success("Settings saved successfully!");
        } catch (e: unknown) {
            toast.error("Failed to save settings: " + (e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const handleStartAnalysis = async () => {
        try {
            setLoading(true);
            await triggerAutomatedBetting();
            toast.success("AI Analysis triggered successfully! Watch for updates in 'Pending Approvals'.");
        } catch (e: unknown) {
            toast.error("Failed to start analysis: " + (e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const getRiskLabel = (value: number) => {
        if (value <= 1.5) return "Very Conservative";
        if (value <= 2) return "Conservative";
        if (value <= 2.5) return "Moderate-Low";
        if (value <= 3) return "Balanced";
        if (value <= 3.5) return "Moderate-High";
        if (value <= 4) return "Aggressive";
        return "Very Aggressive";
    };

    if (settingsLoading) {
        return (
            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle>AI Configuration</CardTitle>
                    <CardDescription>Loading settings...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="col-span-1">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <SettingsIcon className="h-5 w-5" />
                            AI Configuration
                        </CardTitle>
                        <CardDescription>Control the betting agent</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="risk">Risk Appetite</Label>
                        <Badge variant="outline">{getRiskLabel(riskAppetite)}</Badge>
                    </div>
                    <Slider
                        id="risk"
                        min={1}
                        max={5}
                        step={0.5}
                        value={[riskAppetite]}
                        onValueChange={(value) => setRiskAppetite(value[0])}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Conservative (1)</span>
                        <span className="font-medium">{riskAppetite.toFixed(1)}</span>
                        <span>Aggressive (5)</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="bankroll-percent">Bankroll % to Use</Label>
                    <Input
                        id="bankroll-percent"
                        type="number"
                        min="1"
                        max="100"
                        value={bankrollPercent}
                        onChange={(e) => setBankrollPercent(parseFloat(e.target.value) || 0)}
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
                        onChange={(e) => setMaxBankroll(parseFloat(e.target.value) || 0)}
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
                        onValueChange={(val) => setUseReliableTeams(val === "true")}
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

                <Separator />

                <div className="space-y-2">
                    <Label htmlFor="min-stake">Min Stake ($)</Label>
                    <Input
                        id="min-stake"
                        type="number"
                        min="1"
                        step="0.1"
                        value={minStake}
                        onChange={(e) => setMinStake(parseFloat(e.target.value) || 1)}
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
                        onChange={(e) => setMinProfit(parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">Minimum profit per bet</p>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
                <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleSaveSettings}
                    disabled={saving}
                >
                    {saving ? "Saving..." : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> Save Settings
                        </>
                    )}
                </Button>
                <Button className="w-full" onClick={handleStartAnalysis} disabled={loading}>
                    {loading ? "Running..." : (
                        <>
                            <Play className="mr-2 h-4 w-4" /> Start Analysis
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
