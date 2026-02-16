import { BetEvent, MarketOption, SelectionOption } from "@/shared/types";
import { cn } from "@/shared/utils";
import { useState, useMemo } from "react";
import { Minus, Plus, Lightbulb, Zap } from "lucide-react";

interface QuickPickSectionProps {
    event: BetEvent;
    markets: MarketOption[];
    onSelection: (market: MarketOption, selection: SelectionOption) => void;
    isInSlip?: (marketId: string, selectionId: string | number) => boolean;
}

export function QuickPickSection({ event, markets, onSelection, isInSlip }: QuickPickSectionProps) {
    const [homeGoals, setHomeGoals] = useState<number>(0);
    const [awayGoals, setAwayGoals] = useState<number>(0);

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

    // Find DOUBLE_CHANCE market (can be named DOUBLE_CHANCE or DOUBLE_OUTCOMES)
    const doubleChanceMarket = useMemo(() =>
        markets.find(m => m.name.includes('DOUBLE_CHANCE') || m.name.includes('DOUBLE_OUTCOMES')),
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

    // Find DOUBLE_CHANCE selections
    // Based on user feedback/screenshot, the options are named exactly "Home or Draw", "Draw or Away", "Home or Away"
    // We should check for these specific strings first, then fallback to team names just in case.
    const homeOrDraw = doubleChanceMarket?.options?.find(o =>
        o.name === 'Home or Draw' || o.name === '1X' ||
        (o.name.includes(teams.home) && o.name.includes('Draw'))
    );
    const awayOrDraw = doubleChanceMarket?.options?.find(o =>
        o.name === 'Draw or Away' || o.name === 'Away or Draw' || o.name === 'X2' ||
        (o.name.includes(teams.away) && o.name.includes('Draw'))
    );
    const homeOrAway = doubleChanceMarket?.options?.find(o =>
        o.name === 'Home or Away' || o.name === '12' ||
        (o.name.includes(teams.home) && o.name.includes(teams.away))
    );

    // Calculate total goals and find appropriate Over/Under markets
    const totalGoals = homeGoals + awayGoals;
    const suggestedMarkets = useMemo(() => {
        // Find exact Over market based on prediction
        // E.g., if predicting 3 goals (2-1), suggest Over 2.5
        const mainLine = totalGoals > 0 ? totalGoals - 0.5 : 0.5;
        const mainMarketName = `OVER_UNDER_${mainLine.toString().replace('.', '')}`;

        // Find alternative/safer Under market
        // E.g., if predicting 3 goals, suggest Under 3.5 or 4.5 as alternative
        const altLine = totalGoals + 0.5;
        const altMarketName = `OVER_UNDER_${altLine.toString().replace('.', '')}`;

        const suggestions: { type: 'top' | 'alt', market: MarketOption, selection: SelectionOption }[] = [];

        // Find Top Pick (Over)
        const topMarket = markets.find(m => m.name === mainMarketName && !m.name.includes('CARD'));
        const topSelection = topMarket?.options?.find(o => o.name.toLowerCase().includes('over'));

        if (topMarket && topSelection) {
            suggestions.push({ type: 'top', market: topMarket, selection: topSelection });
        }

        // Find Alternative (Under)
        const altMarket = markets.find(m => m.name === altMarketName && !m.name.includes('CARD'));
        const altSelection = altMarket?.options?.find(o => o.name.toLowerCase().includes('under'));

        if (altMarket && altSelection) {
            suggestions.push({ type: 'alt', market: altMarket, selection: altSelection });
        }

        return suggestions;
    }, [markets, totalGoals]);

    const handleSelectionClick = (market: MarketOption | undefined, selection: SelectionOption | undefined) => {
        if (market && selection) {
            onSelection(market, selection);
        }
    };

    const isSelected = (marketId: string | undefined, selectionId: string | number | undefined) => {
        if (!marketId || !selectionId) return false;
        return isInSlip?.(marketId, selectionId) || false;
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <Zap className="h-4 w-4 text-pink-500 fill-pink-500" />
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Quick Pick Match Result</h3>
            </div>

            {/* Match Result Grid */}
            <div className="grid grid-cols-3 gap-3">
                {/* Home Win */}
                <button
                    className={cn(
                        "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all bg-white hover:shadow-xs",
                        isSelected(matchOddsMarket?.market_id, homeWin?.selection_id)
                            ? "border-pink-500 ring-2 ring-pink-200 ring-offset-1"
                            : "border-gray-100 hover:border-blue-200"
                    )}
                    onClick={() => handleSelectionClick(matchOddsMarket, homeWin)}
                    disabled={!homeWin}
                >
                    <span className="text-xs font-bold text-gray-700 mb-1 truncate w-full text-center">{teams.home}</span>
                    <span className="text-2xl font-bold text-gray-900 mb-1">{homeWin?.odds.toFixed(2) || '-'}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">WIN</span>

                    {isSelected(matchOddsMarket?.market_id, homeWin?.selection_id) && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            FAVORITED
                        </span>
                    )}
                </button>

                {/* Draw */}
                <button
                    className={cn(
                        "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all bg-white shadow-sm hover:shadow-md",
                        isSelected(matchOddsMarket?.market_id, draw?.selection_id)
                            ? "border-pink-500 ring-2 ring-pink-200 ring-offset-1"
                            : "border-gray-100 hover:border-blue-200"
                    )}
                    onClick={() => handleSelectionClick(matchOddsMarket, draw)}
                    disabled={!draw}
                >
                    <span className="text-xs font-bold text-gray-700 mb-1">Draw</span>
                    <span className="text-2xl font-bold text-gray-900 mb-1">{draw?.odds.toFixed(2) || '-'}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TIE</span>
                    {isSelected(matchOddsMarket?.market_id, draw?.selection_id) && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            FAVORITED
                        </span>
                    )}
                </button>

                {/* Away Win */}
                <button
                    className={cn(
                        "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all bg-white shadow-sm hover:shadow-md",
                        isSelected(matchOddsMarket?.market_id, awayWin?.selection_id)
                            ? "border-pink-500 ring-2 ring-pink-200 ring-offset-1"
                            : "border-gray-100 hover:border-blue-200"
                    )}
                    onClick={() => handleSelectionClick(matchOddsMarket, awayWin)}
                    disabled={!awayWin}
                >
                    <span className="text-xs font-bold text-gray-700 mb-1 truncate w-full text-center">{teams.away}</span>
                    <span className="text-2xl font-bold text-gray-900 mb-1">{awayWin?.odds.toFixed(2) || '-'}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">WIN</span>
                    {isSelected(matchOddsMarket?.market_id, awayWin?.selection_id) && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            FAVORITED
                        </span>
                    )}
                </button>
            </div>

            {/* Double Chance Row */}
            <div className="grid grid-cols-3 gap-3">
                {/* Home or Draw */}
                <button
                    className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-lg border transition-all bg-gray-50/50 hover:bg-white text-center h-full",
                        isSelected(doubleChanceMarket?.market_id, homeOrDraw?.selection_id)
                            ? "border-pink-500 bg-pink-50"
                            : "border-gray-200 hover:border-blue-200"
                    )}
                    onClick={() => handleSelectionClick(doubleChanceMarket, homeOrDraw)}
                    disabled={!homeOrDraw}
                >
                    <span className="text-[10px] font-bold text-gray-700 mb-1">Home or Draw</span>
                    <span className="text-xs font-bold text-gray-900">{homeOrDraw?.odds.toFixed(2) || '-'}</span>
                </button>

                {/* Home or Away */}
                <button
                    className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-lg border transition-all bg-gray-50/50 hover:bg-white text-center h-full",
                        isSelected(doubleChanceMarket?.market_id, homeOrAway?.selection_id)
                            ? "border-pink-500 bg-pink-50"
                            : "border-gray-200 hover:border-blue-200"
                    )}
                    onClick={() => handleSelectionClick(doubleChanceMarket, homeOrAway)}
                    disabled={!homeOrAway}
                >
                    <span className="text-[10px] font-bold text-gray-700 mb-1">Home or Away</span>
                    <span className="text-xs font-bold text-gray-900">{homeOrAway?.odds.toFixed(2) || '-'}</span>
                </button>

                {/* Away or Draw */}
                <button
                    className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-lg border transition-all bg-gray-50/50 hover:bg-white text-center h-full",
                        isSelected(doubleChanceMarket?.market_id, awayOrDraw?.selection_id)
                            ? "border-pink-500 bg-pink-50"
                            : "border-gray-200 hover:border-blue-200"
                    )}
                    onClick={() => handleSelectionClick(doubleChanceMarket, awayOrDraw)}
                    disabled={!awayOrDraw}
                >
                    <span className="text-[10px] font-bold text-gray-700 mb-1">Away or Draw</span>
                    <span className="text-xs font-bold text-gray-900">{awayOrDraw?.odds.toFixed(2) || '-'}</span>
                </button>
            </div>

            {/* Score Estimate */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Score Estimate</h3>
                    </div>
                    <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-400 font-medium">Regular Time Only</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                    {/* Home Controls */}
                    <div className="flex flex-col items-center gap-3">
                        <span className="text-sm font-bold text-gray-800 truncate max-w-[80px] text-center" title={teams.home}>{teams.home}</span>
                        <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-200 p-1">
                            <button
                                onClick={() => setHomeGoals(Math.max(0, homeGoals - 1))}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                                <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center font-bold text-xl text-gray-900">{homeGoals}</span>
                            <button
                                onClick={() => setHomeGoals(homeGoals + 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Total Goals Display */}
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">TOTAL GOALS</span>
                        <span className="text-4xl font-extrabold text-blue-500">{totalGoals}</span>
                    </div>

                    {/* Away Controls */}
                    <div className="flex flex-col items-center gap-3">
                        <span className="text-sm font-bold text-gray-800 truncate max-w-[80px] text-center" title={teams.away}>{teams.away}</span>
                        <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-200 p-1">
                            <button
                                onClick={() => setAwayGoals(Math.max(0, awayGoals - 1))}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                                <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center font-bold text-xl text-gray-900">{awayGoals}</span>
                            <button
                                onClick={() => setAwayGoals(awayGoals + 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-pink-50 text-pink-500 hover:bg-pink-100 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Smart Suggestions */}
            {suggestedMarkets.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl border border-gray-100">
                    {/* Pink glow effect */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -ml-12 -mb-12" />

                    <div className="relative p-5 bg-white/50 backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <h3 className="text-sm font-bold text-gray-800">Smart Suggestions</h3>
                            </div>
                            <span className="text-[10px] text-gray-400">Based on your prediction ({totalGoals} goals)</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {suggestedMarkets.map((suggestion, idx) => (
                                <button
                                    key={`${suggestion.market.market_id}-${suggestion.selection.selection_id}`}
                                    className={cn(
                                        "relative flex justify-between items-center p-4 rounded-xl border transition-all text-left group",
                                        suggestion.type === 'top'
                                            ? "bg-pink-50/50 border-pink-100 hover:border-pink-300"
                                            : "bg-gray-50 border-gray-100 hover:border-gray-300",
                                        isSelected(suggestion.market.market_id, suggestion.selection.selection_id)
                                            ? "ring-2 ring-pink-500 ring-offset-1 border-transparent"
                                            : ""
                                    )}
                                    onClick={() => handleSelectionClick(suggestion.market, suggestion.selection)}
                                >
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
                                                suggestion.type === 'top' ? "bg-pink-100 text-pink-600" : "bg-gray-200 text-gray-500"
                                            )}>
                                                {suggestion.type === 'top' ? 'TOP PICK' : 'Alternative'}
                                            </span>
                                            {suggestion.type === 'top' && <Zap className="h-3 w-3 text-pink-500 fill-pink-500" />}
                                        </div>
                                        <span className="text-sm font-bold text-gray-900 block">{suggestion.selection.name}</span>
                                    </div>

                                    <span className={cn(
                                        "text-lg font-bold px-2 py-1 rounded-lg transition-colors",
                                        suggestion.type === 'top'
                                            ? "bg-pink-500 text-white group-hover:bg-pink-600"
                                            : "bg-gray-200 text-gray-700 group-hover:bg-gray-300"
                                    )}>
                                        {suggestion.selection.odds.toFixed(2)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
