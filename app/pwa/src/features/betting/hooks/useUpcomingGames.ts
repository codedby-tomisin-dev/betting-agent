import { useState, useEffect } from "react";
import { fetchUpcomingGames } from "@/shared/api/bettingApi";
import { BetEvent } from "@/shared/types";

export function useUpcomingGames(date?: string) {
    const [games, setGames] = useState<BetEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actualDate, setActualDate] = useState<string | undefined>(date);

    useEffect(() => {
        let isMounted = true;

        const loadGames = async () => {
            try {
                setIsLoading(true);

                // Start with provided date or today
                const baseDate = date ? new Date(date) : new Date();
                let currentDate = baseDate.toISOString().split('T')[0];

                // Try to fetch games for the current date
                let data = await fetchUpcomingGames(currentDate);
                let daysChecked = 0;
                const maxDaysToCheck = 7;

                // If no games found, try next days
                while (data.length === 0 && daysChecked < maxDaysToCheck && isMounted) {
                    daysChecked++;

                    // Calculate next date
                    const nextDate = new Date(baseDate);
                    nextDate.setDate(nextDate.getDate() + daysChecked);
                    currentDate = nextDate.toISOString().split('T')[0];

                    console.log(`No games found, trying ${currentDate}...`);
                    data = await fetchUpcomingGames(currentDate);
                }

                if (isMounted) {
                    setGames(data);
                    setActualDate(currentDate);
                    if (data.length === 0) {
                        setError(`No upcoming games found in the next ${maxDaysToCheck} days`);
                    }
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

    return { games, isLoading, error, actualDate };
}
