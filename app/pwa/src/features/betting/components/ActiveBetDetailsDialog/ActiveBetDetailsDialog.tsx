"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bet } from "@/shared/types";
import { BetMetadata } from "./BetMetadata";
import { BetAIReasoning } from "../BetAIReasoning";
import { BetSelectionsList } from "./BetSelectionsList";
import { BetWagerTotals } from "./BetWagerTotals";
import { BetPlacementResults } from "./BetPlacementResults";

interface ActiveBetDetailsDialogProps {
    bet: Bet | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ActiveBetDetailsDialog({ bet, isOpen, onClose }: ActiveBetDetailsDialogProps) {
    if (!bet) return null;

    const selections = bet.selections?.items || [];
    const groupedByEvent = selections.reduce((acc, selection) => {
        if (!acc[selection.event]) {
            acc[selection.event] = [];
        }
        acc[selection.event].push(selection);
        return acc;
    }, {} as Record<string, typeof selections>);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>Bet Details</DialogTitle>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Placed
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    <BetMetadata bet={bet} />

                    <Separator />

                    {bet.ai_reasoning && (
                        <>
                            <BetAIReasoning reasoning={bet.ai_reasoning} defaultOpen={false} />
                            <Separator />
                        </>
                    )}

                    <BetSelectionsList groupedByEvent={groupedByEvent} />

                    <Separator />

                    {bet.selections?.wager && (
                        <BetWagerTotals wager={bet.selections.wager} />
                    )}

                    {bet.placement_results && bet.placement_results.length > 0 && (
                        <>
                            <Separator />
                            <BetPlacementResults results={bet.placement_results} />
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
