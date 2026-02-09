"use client";

import { useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bet, BetSelectionItem, EventInfo } from "@/shared/types";
import { BetMetadata } from "./BetMetadata";
import { BetSelectionsList } from "./BetSelectionsList";
import { BetWagerTotals } from "./BetWagerTotals";
import { BetPlacementResults } from "./BetPlacementResults";
import { getEventId } from "../../models/BetSelectionModel";

interface ActiveBetDetailsDialogProps {
    bet: Bet | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ActiveBetDetailsDialog({ bet, isOpen, onClose }: ActiveBetDetailsDialogProps) {
    const groupedByEvent = useMemo(() => {
        if (!bet?.selections?.items) return [];

        const groups: Record<string, { event: EventInfo; selections: BetSelectionItem[] }> = {};

        bet.selections.items.forEach((item) => {
            const eventId = getEventId(item.event);
            if (!groups[eventId]) {
                groups[eventId] = {
                    event: item.event,
                    selections: []
                };
            }
            groups[eventId].selections.push(item);
        });

        return Object.values(groups);
    }, [bet?.selections?.items]);

    if (!bet) return null;

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
