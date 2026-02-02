import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { updateSettings } from '@/shared/api';
import { BettingSettings } from '@/shared/types';

/**
 * Hook to handle persisting settings to Firestore
 */
export function usePersistSettings() {
    const [isSaving, setIsSaving] = useState(false);

    const persistSettings = useCallback(async (settings: Partial<BettingSettings>) => {
        try {
            setIsSaving(true);
            await updateSettings(settings);
            toast.success("Settings saved successfully!");
        } catch (e: unknown) {
            toast.error("Failed to save settings: " + (e as Error).message);
            throw e;
        } finally {
            setIsSaving(false);
        }
    }, []);

    return { isSaving, persistSettings };
}
