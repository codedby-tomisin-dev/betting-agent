import { useState, useEffect, useCallback } from 'react';
import { BettingSettings } from '@/shared/types';

/**
 * Hook to manage local form state for settings, synced with remote settings
 */
export function useSettingsForm(initialSettings: BettingSettings) {
    const [formValues, setFormValues] = useState<BettingSettings>(initialSettings);

    useEffect(() => {
        setFormValues(initialSettings);
    }, [initialSettings]);

    const updateField = useCallback(<K extends keyof BettingSettings>(
        field: K,
        value: BettingSettings[K]
    ) => {
        setFormValues(prev => ({ ...prev, [field]: value }));
    }, []);

    const resetForm = useCallback(() => {
        setFormValues(initialSettings);
    }, [initialSettings]);

    return { formValues, updateField, resetForm };
}
