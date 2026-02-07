"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BettingSettings, RiskLevel } from "@/shared/types";
import { RiskAppetiteSlider } from "./RiskAppetiteSlider";
import { BankrollSettingsSection } from "./BankrollSettingsSection";
import { StakeLimitsSection } from "./StakeLimitsSection";
import { Play, Save, Shield, Wallet, Sliders } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

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
        <div className="space-y-6">
            <PageHeader
                title="Settings"
                description="Configure your AI betting agent preferences"
            >
                <Button
                    variant="default"
                    onClick={onSave}
                    disabled={isSaving}
                >
                    {isSaving ? "Saving..." : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> Save Changes
                        </>
                    )}
                </Button>
            </PageHeader>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Risk Profile Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Shield className="h-5 w-5 text-blue-500" />
                            Risk Profile
                        </CardTitle>
                        <CardDescription>
                            Define how aggressive the AI should be with your wagers.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RiskAppetiteSlider
                            value={formValues.RISK_APPETITE}
                            label={riskLabel}
                            onChange={(value) => onFieldChange('RISK_APPETITE', value)}
                        />
                    </CardContent>
                </Card>

                {/* Budget Strategy Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Wallet className="h-5 w-5 text-green-500" />
                            Budget Strategy
                        </CardTitle>
                        <CardDescription>
                            Manage how much of your bankroll is allocated per run.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <BankrollSettingsSection
                            bankrollPercent={formValues.BANKROLL_PERCENT}
                            maxBankroll={formValues.MAX_BANKROLL}
                            useReliableTeams={formValues.USE_RELIABLE_TEAMS}
                            onBankrollPercentChange={(value) => onFieldChange('BANKROLL_PERCENT', value)}
                            onMaxBankrollChange={(value) => onFieldChange('MAX_BANKROLL', value)}
                            onReliableTeamsChange={(value) => onFieldChange('USE_RELIABLE_TEAMS', value)}
                        />
                    </CardContent>
                </Card>

                {/* Betting Preferences & Limits Card */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Sliders className="h-5 w-5 text-purple-500" />
                            Betting Limits
                        </CardTitle>
                        <CardDescription>
                            Set constraints on individual bets to ensure profitability.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <StakeLimitsSection
                            minStake={formValues.MIN_STAKE}
                            minProfit={formValues.MIN_PROFIT}
                            onMinStakeChange={(value) => onFieldChange('MIN_STAKE', value)}
                            onMinProfitChange={(value) => onFieldChange('MIN_PROFIT', value)}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
