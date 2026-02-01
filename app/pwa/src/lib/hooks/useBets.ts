import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Bet } from '@/lib/api';

export function useBets() {
    const [bets, setBets] = useState<Bet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const q = query(
                collection(db, 'bet_slips'),
                orderBy('created_at', 'desc')
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const betsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Bet[];
                setBets(betsData);
                setLoading(false);
            }, (err) => {
                console.error("Error fetching bets:", err);
                setError(err.message);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (err: unknown) {
            console.error("Error setting up bet listener:", err);
            setError((err as Error).message);
            setLoading(false);
        }
    }, []);

    return { bets, loading, error };
}
