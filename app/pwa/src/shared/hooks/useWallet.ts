import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/shared/api/firebase';

export interface Wallet {
    amount: number;
    currency: string;
}

/**
 * Subscribe to the wallet/current document in Firestore.
 * Returns the live balance synced from Betfair.
 */
export function useWallet() {
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const docRef = doc(db, 'wallets', 'main');

            const unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    setWallet(docSnap.data() as Wallet);
                } else {
                    setWallet(null);
                }
                setLoading(false);
            }, (err) => {
                console.error("Error fetching wallet:", err);
                setError(err.message);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (err: unknown) {
            console.error("Error setting up wallet listener:", err);
            setError((err as Error).message);
            setLoading(false);
        }
    }, []);

    return { wallet, loading, error };
}
