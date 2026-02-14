import { useState, useCallback } from "react";
import { fetchEventMarkets } from "@/shared/api/bettingApi";
import { MarketOption } from "@/shared/types";

export function useEventMarkets() {
    const [markets, setMarkets] = useState<MarketOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadMarkets = useCallback(async (providerEventId: string, marketTypes?: string[]) => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await fetchEventMarkets(providerEventId, marketTypes);
            setMarkets(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load event markets");
            setMarkets([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearMarkets = useCallback(() => {
        setMarkets([]);
        setError(null);
    }, []);

    return { markets, isLoading, error, loadMarkets, clearMarkets };
}
