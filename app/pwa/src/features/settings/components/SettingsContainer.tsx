"use client";

import { useSettings } from "@/shared/hooks";
import { useSettingsForm } from "../hooks/useSettingsForm";
import { usePersistSettings } from "../hooks/usePersistSettings";
import { useTriggerAnalysis } from "../hooks/useTriggerAnalysis";
import { resolveRiskAppetiteLabel } from "../utils/resolveRiskAppetiteLabel";
import { SettingsFormView } from "./SettingsFormView";
import { SettingsLoadingSkeleton } from "./SettingsLoadingSkeleton";

export function SettingsContainer() {
    const { settings, loading } = useSettings();
    const { formValues, updateField } = useSettingsForm(settings);
    const { isSaving, persistSettings } = usePersistSettings();
    const { isRunning, triggerAIBetAnalysis } = useTriggerAnalysis();
    const riskLabel = resolveRiskAppetiteLabel(formValues.RISK_APPETITE);

    if (loading) {
        return <SettingsLoadingSkeleton />;
    }

    return (
        <SettingsFormView
            formValues={formValues}
            riskLabel={riskLabel}
            isSaving={isSaving}
            isAnalysisRunning={isRunning}
            onFieldChange={updateField}
            onSave={() => persistSettings(formValues)}
            onTriggerAnalysis={triggerAIBetAnalysis}
        />
    );
}
