"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bet, BetEvent, MarketOption, SelectionOption } from "@/shared/types";
import { useBetModifications } from "../hooks/useBetModifications";
import { groupSelectionsByEvent } from "../utils/groupSelectionsByEvent";
import { calculateBetTotals } from "../utils/calculateBetTotals";
import { BetSelectionGroup } from "./BetSelectionGroup";
import { BetTotalsDisplay } from "./BetTotalsDisplay";
import { AddMarketDialog } from "./AddMarketDialog";
import { AddMatchDialog } from "./AddMatchDialog";
import { Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BetAIReasoning } from "./BetAIReasoning";

interface PendingBetCardProps {
    bet: Bet;
    isApproving: boolean;
    onApprove: (finalItems: ReturnType<typeof useBetModifications>['getFinalSelections']) => void;
    onReject: () => void;
}

export function PendingBetCard({
    bet,
    isApproving,
    onApprove,
    onReject,
}: PendingBetCardProps) {
    const {
        addedSelections,
        removedIndices,
        updateSelectionStake,
        addMarketSelectionToBet,
        addNewMatchToBet,
        removeSelectionFromBet,
        getEffectiveStake,
        getFinalSelections,
    } = useBetModifications(bet);

    const [addMarketDialogOpen, setAddMarketDialogOpen] = useState(false);
    const [addMatchDialogOpen, setAddMatchDialogOpen] = useState(false);
    const [selectedEventName, setSelectedEventName] = useState("");

    const originalItems = bet.selections?.items || [];
    const groupedSelections = groupSelectionsByEvent(originalItems, addedSelections, removedIndices);
    const totals = calculateBetTotals(groupedSelections, getEffectiveStake);
    const maxStake = bet.balance?.starting || 0;

    const handleStakeChange = (stableId: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        updateSelectionStake(stableId, numValue, maxStake);
    };

    const handleAddMarket = (eventName: string) => {
        setSelectedEventName(eventName);
        setAddMarketDialogOpen(true);
    };

    const handleSelectMarket = (market: MarketOption, selection: SelectionOption) => {
        addMarketSelectionToBet(selectedEventName, market, selection);
    };

    const handleSelectMatch = (event: BetEvent, market: MarketOption, selection: SelectionOption) => {
        addNewMatchToBet(event, market, selection);
    };

    const selectedEvent = bet.events?.find(e => e.event_name === selectedEventName);
    const existingEventNames = groupedSelections.map(g => g.event);

    return (
        <Card className="border border-gray-200 shadow-xs">
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
                <BetAIReasoning reasoning={bet.ai_reasoning || ""} defaultOpen={true} />

                {groupedSelections.map((group, groupIdx) => (
                    <BetSelectionGroup
                        key={groupIdx}
                        group={group}
                        maxStake={maxStake}
                        getEffectiveStake={getEffectiveStake}
                        onStakeChange={handleStakeChange}
                        onRemoveMarket={removeSelectionFromBet}
                        onAddMarket={() => handleAddMarket(group.event)}
                        originalItemsLength={originalItems.length}
                    />
                ))}

                <Button
                    variant="outline"
                    className="w-full border-dashed"
                    size="sm"
                    onClick={() => setAddMatchDialogOpen(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Match
                </Button>

                <BetTotalsDisplay
                    totalStake={totals.totalStake}
                    totalReturns={totals.totalReturns}
                    isApproving={isApproving}
                    onApprove={() => onApprove(getFinalSelections)}
                    onReject={onReject}
                />
            </CardContent>

            <AddMarketDialog
                isOpen={addMarketDialogOpen}
                onClose={() => setAddMarketDialogOpen(false)}
                eventName={selectedEventName}
                event={selectedEvent}
                onSelectMarket={handleSelectMarket}
            />

            <AddMatchDialog
                isOpen={addMatchDialogOpen}
                onClose={() => setAddMatchDialogOpen(false)}
                availableEvents={bet.events || []}
                existingEventNames={existingEventNames}
                onSelectMatch={handleSelectMatch}
            />
        </Card>
    );
}
