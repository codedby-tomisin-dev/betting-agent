import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BettingSettings, DEFAULT_SETTINGS } from '@/lib/settings';

export function useSettings() {
    const [settings, setSettings] = useState<BettingSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const docRef = doc(db, 'settings', 'betting');

            const unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() } as BettingSettings);
                } else {
                    setSettings(DEFAULT_SETTINGS);
                }
                setLoading(false);
            }, (err) => {
                console.error("Error fetching settings:", err);
                setError(err.message);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (err: unknown) {
            console.error("Error setting up settings listener:", err);
            setError((err as Error).message);
            setLoading(false);
        }
    }, []);

    return { settings, loading, error };
}
