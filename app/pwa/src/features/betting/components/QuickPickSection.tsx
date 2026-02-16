import { BetEvent, MarketOption, SelectionOption } from "@/shared/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";
import { useState, useMemo } from "react";

interface QuickPickSectionProps {
    event: BetEvent;
    markets: MarketOption[];
    onSelection: (market: MarketOption, selection: SelectionOption) => void;
    isInSlip?: (marketId: string, selectionId: string | number) => boolean;
}

export function QuickPickSection({ event, markets, onSelection, isInSlip }: QuickPickSectionProps) {
    const [homeGoals, setHomeGoals] = useState<number | null>(null);
    const [awayGoals, setAwayGoals] = useState<number | null>(null);

    // Parse team names from event name (e.g., "Team A v Team B")
    const teams = useMemo(() => {
        const parts = event.name.split(' v ');
        return {
            home: parts[0]?.trim() || 'Home',
            away: parts[1]?.trim() || 'Away'
        };
    }, [event.name]);

    // Find MATCH_ODDS market
    const matchOddsMarket = useMemo(() =>
        markets.find(m => m.name === 'MATCH_ODDS'),
        [markets]
    );

    // Find DOUBLE_CHANCE market
    const doubleChanceMarket = useMemo(() =>
        markets.find(m => m.name === 'DOUBLE_CHANCE'),
        [markets]
    );

    // Find selections for each outcome
    const homeWin = matchOddsMarket?.options?.find(o =>
        o.name.toLowerCase().includes(teams.home.toLowerCase())
    );
    const draw = matchOddsMarket?.options?.find(o =>
        o.name.toLowerCase().includes('draw')
    );
    const awayWin = matchOddsMarket?.options?.find(o =>
        o.name.toLowerCase().includes(teams.away.toLowerCase())
    );

    // Find DOUBLE_CHANCE selections (Home or Draw, Away or Draw)
    const homeOrDraw = doubleChanceMarket?.options?.find(o =>
        o.name.toLowerCase().includes(teams.home.toLowerCase()) && o.name.toLowerCase().includes('draw')
    );
    const awayOrDraw = doubleChanceMarket?.options?.find(o =>
        o.name.toLowerCase().includes(teams.away.toLowerCase()) && o.name.toLowerCase().includes('draw')
    );

    // Calculate total goals and find appropriate Over/Under markets
    const totalGoals = (homeGoals ?? 0) + (awayGoals ?? 0);
    const suggestedMarkets = useMemo(() => {
        if (homeGoals === null || awayGoals === null) return [];

        // Find exact Over market for totalGoals - 0.5
        // 1 goal → Over 0.5, 2 goals → Over 1.5, 3 goals → Over 2.5
        const overLine = totalGoals - 0.5;
        const overMarketName = `OVER_UNDER_${overLine.toString().replace('.', '')}`;

        // Find Under market on opposite end of spectrum
        // Low prediction → high Under line (1 goal → Under 5.5 or 6.5)
        // High prediction → low Under line (5 goals → Under 1.5 or 0.5)
        const underLine = 6.5 - overLine; // Inverse relationship
        const underMarketName = `OVER_UNDER_${underLine.toString().replace('.', '')}`;

        const foundMarkets: MarketOption[] = [];

        // Find Over market
        const overMarket = markets.find(m =>
            m.name === overMarketName && !m.name.includes('CARD')
        );
        if (overMarket) foundMarkets.push(overMarket);

        // Find Under market
        const underMarket = markets.find(m =>
            m.name === underMarketName && !m.name.includes('CARD')
        );
        if (underMarket) foundMarkets.push(underMarket);

        return foundMarkets;
    }, [markets, totalGoals, homeGoals, awayGoals]);

    const handleWinClick = (team: 'home' | 'away') => {
        const selection = team === 'home' ? homeWin : awayWin;
        const opposingSelection = team === 'home' ? awayWin : homeWin;

        if (selection && matchOddsMarket) {
            // Check if opposing team's win is already selected - if so, remove it first
            if (opposingSelection && isInSlip?.(matchOddsMarket.market_id || '', opposingSelection.selection_id)) {
                // Remove the opposing selection first
                onSelection(matchOddsMarket, opposingSelection);
            }
            // Then add/toggle this selection
            onSelection(matchOddsMarket, selection);
        }
    };

    const handleDoubleChanceClick = (team: 'home' | 'away') => {
        const selection = team === 'home' ? homeOrDraw : awayOrDraw;
        if (selection && doubleChanceMarket) {
            onSelection(doubleChanceMarket, selection);
        }
    };

    const handleDrawClick = () => {
        if (draw && matchOddsMarket) {
            onSelection(matchOddsMarket, draw);
        }
    };

    const handleGoalSelection = (team: 'home' | 'away', goals: number) => {
        if (team === 'home') {
            setHomeGoals(goals);
        } else {
            setAwayGoals(goals);
        }
    };

    return (
        <div className="px-6 py-4 bg-gradient-to-br from-blue-50 to-purple-50 border-b border-gray-200">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Quick Pick</h3>

            {/* Compact Horizontal Team Selection */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                {/* Home Team */}
                <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-800 truncate text-center" title={teams.home}>
                        {teams.home}
                    </p>
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "flex-1 text-[10px] font-semibold py-1.5 px-2",
                                homeWin && isInSlip?.(matchOddsMarket?.market_id || '', homeWin.selection_id)
                                    ? "bg-pink-100 border-pink-400 text-pink-700"
                                    : "bg-white hover:bg-blue-50 hover:border-blue-400"
                            )}
                            onClick={() => handleWinClick('home')}
                            disabled={!homeWin}
                        >
                            Win @ {homeWin?.odds || '-'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "flex-1 text-[10px] font-semibold py-1.5 px-2",
                                homeOrDraw && isInSlip?.(doubleChanceMarket?.market_id || '', homeOrDraw.selection_id)
                                    ? "bg-pink-100 border-pink-400 text-pink-700"
                                    : "bg-white hover:bg-blue-50 hover:border-blue-400"
                            )}
                            onClick={() => handleDoubleChanceClick('home')}
                            disabled={!homeOrDraw}
                        >
                            Draw @ {homeOrDraw?.odds || '-'}
                        </Button>
                    </div>
                </div>

                {/* Center Draw */}
                <div className="flex flex-col justify-center items-center">
                    <p className="text-xs text-gray-400 font-medium mb-2">vs</p>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "w-full text-xs font-semibold",
                            draw && isInSlip?.(matchOddsMarket?.market_id || '', draw.selection_id)
                                ? "bg-pink-100 border-pink-400 text-pink-700"
                                : "bg-white hover:bg-blue-50 hover:border-blue-400"
                        )}
                        onClick={handleDrawClick}
                        disabled={!draw}
                    >
                        Draw
                    </Button>
                </div>

                {/* Away Team */}
                <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-800 truncate text-center" title={teams.away}>
                        {teams.away}
                    </p>
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "flex-1 text-[10px] font-semibold py-1.5 px-2",
                                awayWin && isInSlip?.(matchOddsMarket?.market_id || '', awayWin.selection_id)
                                    ? "bg-pink-100 border-pink-400 text-pink-700"
                                    : "bg-white hover:bg-blue-50 hover:border-blue-400"
                            )}
                            onClick={() => handleWinClick('away')}
                            disabled={!awayWin}
                        >
                            Win @ {awayWin?.odds || '-'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "flex-1 text-[10px] font-semibold py-1.5 px-2",
                                awayOrDraw && isInSlip?.(doubleChanceMarket?.market_id || '', awayOrDraw.selection_id)
                                    ? "bg-pink-100 border-pink-400 text-pink-700"
                                    : "bg-white hover:bg-blue-50 hover:border-blue-400"
                            )}
                            onClick={() => handleDoubleChanceClick('away')}
                            disabled={!awayOrDraw}
                        >
                            Draw @ {awayOrDraw?.odds || '-'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Goal Selectors */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                    <label className="text-[10px] text-gray-500 font-medium">Goals</label>
                    <select
                        className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white"
                        value={homeGoals ?? ''}
                        onChange={(e) => handleGoalSelection('home', parseInt(e.target.value))}
                    >
                        <option value="">-</option>
                        {[0, 1, 2, 3, 4, 5].map(n => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>

                {/* Total Goals Display */}
                <div className="flex flex-col justify-center items-center">
                    {homeGoals !== null && awayGoals !== null && (
                        <div className="text-center">
                            <p className="text-[10px] text-gray-500">Total</p>
                            <p className="text-sm font-bold text-blue-600">{totalGoals}</p>
                        </div>
                    )}
                </div>

                <div>
                    <label className="text-[10px] text-gray-500 font-medium">Goals</label>
                    <select
                        className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white"
                        value={awayGoals ?? ''}
                        onChange={(e) => handleGoalSelection('away', parseInt(e.target.value))}
                    >
                        <option value="">-</option>
                        {[0, 1, 2, 3, 4, 5].map(n => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Over/Under Suggestion */}
            {homeGoals !== null && awayGoals !== null && suggestedMarkets.length > 0 && (
                <div className="text-center p-2 bg-white/60 rounded-lg border border-blue-200">
                    <p className="text-[10px] text-gray-500 mb-1">Suggested based on your prediction:</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                        {suggestedMarkets.map(market =>
                            market.options?.map(option => (
                                <Button
                                    key={`${market.market_id}-${option.selection_id}`}
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "text-xs",
                                        isInSlip?.(market.market_id || '', option.selection_id)
                                            ? "bg-pink-100 border-pink-400 text-pink-700"
                                            : "bg-white hover:bg-blue-50"
                                    )}
                                    onClick={() => onSelection(market, option)}
                                >
                                    {option.name} @ {option.odds}
                                </Button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
