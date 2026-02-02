"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BettingSettings, RiskLevel } from "@/shared/types";
import { RiskAppetiteSlider } from "./RiskAppetiteSlider";
import { BankrollSettingsSection } from "./BankrollSettingsSection";
import { StakeLimitsSection } from "./StakeLimitsSection";
import { Play, Save, Settings as SettingsIcon } from "lucide-react";

interface SettingsFormViewProps {
    formValues: BettingSettings;
    riskLabel: RiskLevel;
    isSaving: boolean;
    isAnalysisRunning: boolean;
    onFieldChange: <K extends keyof BettingSettings>(field: K, value: BettingSettings[K]) => void;
    onSave: () => void;
    onTriggerAnalysis: () => void;
}

export function SettingsFormView({
    formValues,
    riskLabel,
    isSaving,
    isAnalysisRunning,
    onFieldChange,
    onSave,
    onTriggerAnalysis,
}: SettingsFormViewProps) {
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
                <RiskAppetiteSlider
                    value={formValues.RISK_APPETITE}
                    label={riskLabel}
                    onChange={(value) => onFieldChange('RISK_APPETITE', value)}
                />

                <BankrollSettingsSection
                    bankrollPercent={formValues.BANKROLL_PERCENT}
                    maxBankroll={formValues.MAX_BANKROLL}
                    useReliableTeams={formValues.USE_RELIABLE_TEAMS}
                    onBankrollPercentChange={(value) => onFieldChange('BANKROLL_PERCENT', value)}
                    onMaxBankrollChange={(value) => onFieldChange('MAX_BANKROLL', value)}
                    onReliableTeamsChange={(value) => onFieldChange('USE_RELIABLE_TEAMS', value)}
                />

                <StakeLimitsSection
                    minStake={formValues.MIN_STAKE}
                    minProfit={formValues.MIN_PROFIT}
                    onMinStakeChange={(value) => onFieldChange('MIN_STAKE', value)}
                    onMinProfitChange={(value) => onFieldChange('MIN_PROFIT', value)}
                />
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
                <Button
                    className="w-full"
                    variant="outline"
                    onClick={onSave}
                    disabled={isSaving}
                >
                    {isSaving ? "Saving..." : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> Save Settings
                        </>
                    )}
                </Button>
                <Button className="w-full" onClick={onTriggerAnalysis} disabled={isAnalysisRunning}>
                    {isAnalysisRunning ? "Running..." : (
                        <>
                            <Play className="mr-2 h-4 w-4" /> Start Analysis
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
