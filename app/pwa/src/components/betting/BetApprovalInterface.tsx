"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bet, approveBetIntent } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Check, X, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


interface BetApprovalInterfaceProps {
    bets: Bet[];
}

interface GroupedSelection {
    event: string;
    markets: Array<{
        market: string;
        odds: number;
        stake: number;
        potential_returns: number;
        market_id?: string;
        selection_id?: string;
        stableId: string;
        isOriginal: boolean;
        originalIndex?: number;
        addedIndex?: number;
    }>;
}

export function BetApprovalInterface({ bets }: BetApprovalInterfaceProps) {
    const pendingBets = bets.filter(b => b.status === "analyzed");
    const [approving, setApproving] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);
    const [editedStakes, setEditedStakes] = useState<Record<string, Record<string, number>>>({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [modifiedSelections, setModifiedSelections] = useState<Record<string, any[]>>({});
    const [removedOriginalItems, setRemovedOriginalItems] = useState<Record<string, Set<number>>>({});
    const [addMarketDialogOpen, setAddMarketDialogOpen] = useState(false);
    const [addMatchDialogOpen, setAddMatchDialogOpen] = useState(false);
    const [selectedBetId, setSelectedBetId] = useState<string>("");
    const [selectedEventName, setSelectedEventName] = useState<string>("");

    const handleApprove = async (betId: string) => {
        try {
            setApproving(betId);

            // Get the bet to update
            const bet = pendingBets.find(b => b.id === betId);
            if (!bet) {
                throw new Error("Bet not found");
            }

            // Prepare updated selections
            const originalItems = bet.selections?.items || [];
            const addedItems = modifiedSelections[betId] || [];
            const removedIndices = removedOriginalItems[betId] || new Set();

            // Filter out removed original items and apply stake edits
            const updatedOriginalItems = originalItems
                .filter((_, idx) => !removedIndices.has(idx))
                .map((item, originalIdx) => {
                    // Find the actual original index (before filtering)
                    let actualOriginalIndex = 0;
                    let count = 0;
                    for (let i = 0; i < originalItems.length; i++) {
                        if (!removedIndices.has(i)) {
                            if (count === originalIdx) {
                                actualOriginalIndex = i;
                                break;
                            }
                            count++;
                        }
                    }

                    // Use stable ID for lookup
                    const stableId = `original_${actualOriginalIndex}`;
                    const editedStake = editedStakes[betId]?.[stableId];
                    return editedStake !== undefined ? { ...item, stake: editedStake } : item;
                });

            // Apply edits to added items
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatedAddedItems = addedItems.map((item: any, idx: number) => {
                const stableId = item.id ? `added_${item.id}` : `added_${idx}`;
                const editedStake = editedStakes[betId]?.[stableId];
                return editedStake !== undefined ? { ...item, stake: editedStake } : item;
            });

            // Combine with added items
            const finalItems = [...updatedOriginalItems, ...updatedAddedItems];

            // Call API with modifications instead of updating Firestore directly
            await approveBetIntent(betId, { items: finalItems });

            toast.success("Bet approved and queued for placement!");
        } catch (e: unknown) {
            toast.error("Failed to approve bet: " + (e as Error).message);
        } finally {
            setApproving(null);
        }
    };

    const handleStakeChange = (betId: string, stableId: string, value: string, maxBalance: number) => {
        const numValue = parseFloat(value) || 0;
        // Don't allow stake to exceed available balance
        const cappedValue = Math.min(numValue, maxBalance);
        setEditedStakes(prev => ({
            ...prev,
            [betId]: {
                ...prev[betId],
                [stableId]: cappedValue
            }
        }));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addMarket = (betId: string, eventName: string, market: any, selection: any) => {
        const newMarket = {
            event: eventName,
            market: market.name,
            odds: selection.odds,
            stake: 10, // Default stake
            market_id: market.market_id,
            selection_id: selection.selection_id,
            id: crypto.randomUUID()
        };

        setModifiedSelections(prev => ({
            ...prev,
            [betId]: [...(prev[betId] || []), newMarket]
        }));

        toast.success(`Added ${selection.name} to ${eventName}`);
        setAddMarketDialogOpen(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addMatch = (betId: string, event: any, market: any, selection: any) => {
        const newMarket = {
            event: event.event_name,
            market: market.name,
            odds: selection.odds,
            stake: 10, // Default stake
            market_id: market.market_id,
            selection_id: selection.selection_id,
            id: crypto.randomUUID()
        };

        setModifiedSelections(prev => ({
            ...prev,
            [betId]: [...(prev[betId] || []), newMarket]
        }));

        toast.success(`Added ${event.event_name} - ${selection.name}`);
        setAddMatchDialogOpen(false);
    };

    const removeMarket = (betId: string, absoluteIndex: number, originalItemsLength: number) => {
        if (absoluteIndex >= originalItemsLength) {
            // Removing added item
            const addedIndex = absoluteIndex - originalItemsLength;
            const currentItems = modifiedSelections[betId] || [];
            setModifiedSelections(prev => ({
                ...prev,
                [betId]: currentItems.filter((_, idx) => idx !== addedIndex)
            }));
        } else {
            // Removing original item
            setRemovedOriginalItems(prev => {
                const removed = prev[betId] || new Set();
                const newRemoved = new Set(removed);
                newRemoved.add(absoluteIndex);
                return {
                    ...prev,
                    [betId]: newRemoved
                };
            });
        }
        toast.success("Market removed");
    };

    const getStake = (betId: string, stableId: string, originalStake: number) => {
        return editedStakes[betId]?.[stableId] ?? originalStake;
    };

    if (pendingBets.length === 0) return null;

    return (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <Card className={`${isExpanded ? "bg-white" : "bg-pink-50"}`}>
                <CollapsibleTrigger className="w-full">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CardTitle className="text-lg font-semibold">Pending Approvals</CardTitle>
                                <Badge variant="destructive" className="bg-pink-100 text-pink-700 hover:bg-pink-100">
                                    {pendingBets.length} pending
                                </Badge>
                            </div>
                            <Button variant="ghost" size="sm" className="gap-2">
                                {isExpanded ? (
                                    <>
                                        Collapse
                                        <ChevronUp className="h-4 w-4" />
                                    </>
                                ) : (
                                    <>
                                        Expand
                                        <ChevronDown className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="space-y-4">
                        {pendingBets.map(bet => {
                            // Get current items: original + any modifications
                            const originalItems = bet.selections?.items || [];
                            const addedItems = modifiedSelections[bet.id] || [];
                            const removedIndices = removedOriginalItems[bet.id] || new Set();

                            // Create items with original indices preserved
                            const itemsWithIndices = originalItems
                                .map((item, idx) => ({ ...item, originalIndex: idx, isOriginal: true, stableId: `original_${idx}` }))
                                .filter((_, idx) => !removedIndices.has(idx))
                                .concat(addedItems.map((item, idx) => ({ ...item, addedIndex: idx, isOriginal: false, stableId: item.id ? `added_${item.id}` : `added_${idx}` })));

                            const items = itemsWithIndices;

                            // Group selections by event (removed useMemo to fix hook rendering error)
                            const groups: Record<string, GroupedSelection> = {};
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            items.forEach((item: any) => {
                                const eventName = item.event || "Unknown Event";
                                if (!groups[eventName]) {
                                    groups[eventName] = {
                                        event: eventName,
                                        markets: []
                                    };
                                }
                                groups[eventName].markets.push({
                                    market: item.market,
                                    odds: item.odds,
                                    stake: item.stake,
                                    potential_returns: item.stake * item.odds,
                                    market_id: item.market_id,
                                    selection_id: item.selection_id,
                                    stableId: item.stableId,
                                    isOriginal: item.isOriginal,
                                    originalIndex: item.originalIndex,
                                    addedIndex: item.addedIndex
                                });
                            });
                            const groupedSelections = Object.values(groups);

                            // Calculate totals with edited stakes
                            let totalStake = 0;
                            let totalReturns = 0;

                            groupedSelections.forEach(group => {
                                group.markets.forEach(market => {
                                    const stake = getStake(bet.id, market.stableId, market.stake);
                                    totalStake += stake;
                                    totalReturns += stake * market.odds;
                                });
                            });

                            return (
                                <Card key={bet.id} className="border border-gray-200 shadow-xs">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-base font-semibold">
                                                Proposed Bet Strategy
                                            </CardTitle>
                                            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                                                Review Needed
                                            </Badge>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        {/* AI Analysis */}
                                        {bet.ai_reasoning && (
                                            <div className="p-4 bg-blue-50 rounded-sm border border-blue-100">
                                                <p className="text-sm font-semibold text-blue-900 mb-2">AI Analysis Summary</p>
                                                <div className="text-sm text-blue-800 prose prose-sm max-w-none">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {bet.ai_reasoning}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        )}

                                        {/* Grouped Selections by Event */}
                                        {groupedSelections.map((group, groupIdx) => {
                                            return (
                                                <div key={groupIdx} className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-semibold text-gray-900">{group.event}</h4>
                                                        <Dialog open={addMarketDialogOpen && selectedBetId === bet.id && selectedEventName === group.event} onOpenChange={setAddMarketDialogOpen}>
                                                            <DialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                                                                    onClick={() => {
                                                                        setSelectedBetId(bet.id);
                                                                        setSelectedEventName(group.event);
                                                                        setAddMarketDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Plus className="h-4 w-4 mr-1" />
                                                                    Add Market
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-h-[80vh] flex flex-col">
                                                                <DialogHeader>
                                                                    <DialogTitle>Add Market to {group.event}</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="space-y-4 py-4 overflow-y-auto max-h-[60vh]">
                                                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                                    {bet.events?.find((e: any) => e.event_name === group.event)?.options?.map((option: any, idx: number) => (
                                                                        <div key={idx} className="space-y-2">
                                                                            <p className="font-semibold text-sm">{option.name}</p>
                                                                            <div className="space-y-1">
                                                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                                                {option.options?.map((selection: any, selIdx: number) => (
                                                                                    <Button
                                                                                        key={selIdx}
                                                                                        variant="outline"
                                                                                        className="w-full justify-between"
                                                                                        size="sm"
                                                                                        onClick={() => addMarket(bet.id, group.event, option, selection)}
                                                                                    >
                                                                                        <span>{selection.name}</span>
                                                                                        <span className="font-bold">{selection.odds}</span>
                                                                                    </Button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {group.markets.map((market, marketIdx) => {
                                                            const stake = getStake(bet.id, market.stableId, market.stake);
                                                            const returns = stake * market.odds;

                                                            return (
                                                                <div key={marketIdx} className="bg-gray-50 rounded-md p-3 flex items-center justify-between">
                                                                    <div className="flex-1">
                                                                        <p className="font-medium text-sm">{market.market}</p>
                                                                        <p className="text-xs text-gray-500">
                                                                            Odds: <span className="font-semibold">{market.odds.toFixed(2)}</span>
                                                                            {" • "}
                                                                            Returns: <span className="font-semibold text-green-600">{formatCurrency(returns)}</span>
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-xs text-gray-500">Stake:</span>
                                                                            <Input
                                                                                type="number"
                                                                                value={stake}
                                                                                onChange={(e) => handleStakeChange(bet.id, market.stableId, e.target.value, bet.balance?.starting || 0)}
                                                                                className="w-20 h-8 text-sm"
                                                                                step="0.01"
                                                                                min="0"
                                                                                max={bet.balance?.starting || 0}
                                                                            />
                                                                        </div>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                                                                            onClick={() => {
                                                                                if (market.isOriginal) {
                                                                                    removeMarket(bet.id, market.originalIndex!, originalItems.length);
                                                                                } else {
                                                                                    removeMarket(bet.id, market.addedIndex! + originalItems.length, originalItems.length);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Add New Match Button */}
                                        <Dialog open={addMatchDialogOpen && selectedBetId === bet.id} onOpenChange={setAddMatchDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full border-dashed"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedBetId(bet.id);
                                                        setAddMatchDialogOpen(true);
                                                    }}
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add New Match
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-h-[80vh] flex flex-col">
                                                <DialogHeader>
                                                    <DialogTitle>Select a Match to Add</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4 overflow-y-auto max-h-[60vh]">
                                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                    {bet.events?.filter((e: any) => !groupedSelections.some(g => g.event === e.event_name)).length === 0 ? (
                                                        <p className="text-sm text-gray-500 text-center py-8">All available matches have been added</p>
                                                    ) : (
                                                        bet.events
                                                            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                                            ?.filter((e: any) => !groupedSelections.some(g => g.event === e.event_name))
                                                            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                                            .map((event: any, eventIdx: number) => (
                                                                <div key={eventIdx} className="border rounded-sm p-3 space-y-2">
                                                                    <p className="font-semibold text-sm">{event.event_name}</p>
                                                                    <p className="text-xs text-gray-500">{event.competition_name} • {new Date(event.event_time).toLocaleString()}</p>
                                                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                                    {event.options?.map((option: any, optIdx: number) => (
                                                                        <div key={optIdx} className="space-y-2">
                                                                            <p className="text-xs text-gray-600">{option.name}</p>
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                                                {option.options?.map((selection: any, selIdx: number) => (
                                                                                    <Button
                                                                                        key={selIdx}
                                                                                        variant="outline"
                                                                                        className="justify-between"
                                                                                        size="sm"
                                                                                        onClick={() => addMatch(bet.id, event, option, selection)}
                                                                                    >
                                                                                        <span className="text-xs">{selection.name}</span>
                                                                                        <span className="font-bold text-xs">{selection.odds}</span>
                                                                                    </Button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ))
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        {/* Totals */}
                                        <div className="flex flex-row justify-between">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Total Stake</p>
                                                <p className="text-xl font-bold text-gray-900">
                                                    {formatCurrency(totalStake)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Potential Returns</p>
                                                <p className="text-xl font-bold text-green-600">
                                                    {formatCurrency(totalReturns)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-gray-300"
                                            >
                                                Reject
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-pink-500 hover:bg-pink-600 text-white"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleApprove(bet.id);
                                                }}
                                                disabled={approving === bet.id}
                                            >
                                                {approving === bet.id ? (
                                                    "Approving..."
                                                ) : (
                                                    <>
                                                        <Check className="mr-2 h-4 w-4" />
                                                        Approve & Place
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </CardContent >
                </CollapsibleContent >
            </Card >
        </Collapsible >
    );
}
