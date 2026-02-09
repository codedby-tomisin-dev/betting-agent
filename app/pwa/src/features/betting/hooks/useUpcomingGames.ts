import { useState, useEffect } from "react";
import { fetchUpcomingGames } from "@/shared/api/bettingApi";
import { BetEvent } from "@/shared/types";

export function useUpcomingGames(date?: string) {
    const [games, setGames] = useState<BetEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadGames = async () => {
            try {
                setIsLoading(true);
                const data = await fetchUpcomingGames(date);
                if (isMounted) {
                    setGames(data);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : "Failed to load upcoming games");
                    setGames([]);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadGames();

        return () => {
            isMounted = false;
        };
    }, [date]);

    return { games, isLoading, error };
}
