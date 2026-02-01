import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface BettingSettings {
    BANKROLL_PERCENT: number;
    MAX_BANKROLL: number;
    RISK_APPETITE: number;
    USE_RELIABLE_TEAMS: boolean;
    MIN_STAKE: number;
    MIN_PROFIT: number;
}

export const getSettings = async (): Promise<BettingSettings | null> => {
    try {
        const docRef = doc(db, 'settings', 'betting');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as BettingSettings;
        }
        return null;
    } catch (error) {
        console.error('Error fetching settings:', error);
        throw error;
    }
};

export const updateSettings = async (settings: Partial<BettingSettings>): Promise<void> => {
    try {
        const docRef = doc(db, 'settings', 'betting');
        await setDoc(docRef, settings, { merge: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
};

// Default values matching backend constants
export const DEFAULT_SETTINGS: BettingSettings = {
    BANKROLL_PERCENT: 50,
    MAX_BANKROLL: 5000,
    RISK_APPETITE: 1.5,
    USE_RELIABLE_TEAMS: true,
    MIN_STAKE: 1.0,
    MIN_PROFIT: 0.02,
};
