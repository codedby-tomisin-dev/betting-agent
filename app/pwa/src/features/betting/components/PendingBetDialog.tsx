"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bet } from "@/shared/types";
import { PendingBetCard } from "./PendingBetCard";
import { useBetModifications } from "../hooks/useBetModifications";

interface PendingBetDialogProps {
    bet: Bet | null;
    isOpen: boolean;
    onClose: () => void;
    isApproving: boolean;
    onApprove: (finalItems: ReturnType<typeof useBetModifications>['getFinalSelections']) => void;
    onReject: () => void;
}

export function PendingBetDialog({
    bet,
    isOpen,
    onClose,
    isApproving,
    onApprove,
    onReject
}: PendingBetDialogProps) {
    if (!bet) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Review Bet Selection</DialogTitle>
                </DialogHeader>
                <PendingBetCard
                    bet={bet}
                    isApproving={isApproving}
                    onApprove={onApprove}
                    onReject={onReject}
                />
            </DialogContent>
        </Dialog>
    );
}
