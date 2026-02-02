import { httpsCallable } from 'firebase/functions';
import { functions } from '@/shared/api/firebase';
import { BettingSettings } from '@/shared/types';

/**
 * Update betting settings using Cloud Function
 */
export const updateSettings = async (settings: Partial<BettingSettings>): Promise<void> => {
    try {
        const saveSettings = httpsCallable(functions, 'save_settings');
        await saveSettings(settings);
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
};
