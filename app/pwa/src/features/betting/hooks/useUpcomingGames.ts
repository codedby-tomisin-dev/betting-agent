import { useState, useEffect } from "react";
import { subscribeDailyFixtures } from "@/shared/api/bettingApi";
import { DailyFixture } from "@/shared/types";

function utcDateStr(offset = 0): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().split('T')[0];
}

export function useUpcomingGames(date?: string) {
    const [fixtures, setFixtures] = useState<DailyFixture[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actualDate, setActualDate] = useState<string | undefined>(date);

    useEffect(() => {
        setIsLoading(true);
        setError(null);

        // Try today first; fall back to tomorrow if today has no fixtures.
        // The scheduler stores games at midnight UTC under the next day's date,
        // so late-night users would otherwise see an empty grid.
        const todayStr = date ?? utcDateStr(0);
        const tomorrowStr = date ?? utcDateStr(1);

        let unsubscribeCurrent: (() => void) | null = null;
        let switched = false;

        const subscribeDate = (dateStr: string) => {
            setActualDate(dateStr);
            return subscribeDailyFixtures(
                dateStr,
                (newFixtures) => {
                    if (newFixtures.length === 0 && !switched && dateStr === todayStr && todayStr !== tomorrowStr) {
                        // Today is empty — check tomorrow
                        switched = true;
                        if (unsubscribeCurrent) unsubscribeCurrent();
                        unsubscribeCurrent = subscribeDate(tomorrowStr);
                    } else {
                        setFixtures(newFixtures);
                        setIsLoading(false);
                    }
                },
                (err) => {
                    setError(err.message || "Failed to subscribe to daily fixtures");
                    setIsLoading(false);
                    setFixtures([]);
                }
            );
        };

        unsubscribeCurrent = subscribeDate(todayStr);

        return () => {
            if (unsubscribeCurrent) unsubscribeCurrent();
        };
    }, [date]);

    const games = fixtures.map(f => f.event);

    return { fixtures, games, isLoading, error, actualDate };
}
