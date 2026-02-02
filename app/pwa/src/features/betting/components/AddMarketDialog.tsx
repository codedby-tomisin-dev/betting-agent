"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BetEvent, MarketOption, SelectionOption } from "@/shared/types";

interface AddMarketDialogProps {
    isOpen: boolean;
    onClose: () => void;
    eventName: string;
    event: BetEvent | undefined;
    onSelectMarket: (market: MarketOption, selection: SelectionOption) => void;
}

export function AddMarketDialog({
    isOpen,
    onClose,
    eventName,
    event,
    onSelectMarket,
}: AddMarketDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Add Market to {eventName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 overflow-y-auto max-h-[60vh]">
                    {event?.options?.map((option, idx) => (
                        <div key={idx} className="space-y-2">
                            <p className="font-semibold text-sm">{option.name}</p>
                            <div className="space-y-1">
                                {option.options?.map((selection, selIdx) => (
                                    <Button
                                        key={selIdx}
                                        variant="outline"
                                        className="w-full justify-between"
                                        size="sm"
                                        onClick={() => {
                                            onSelectMarket(option, selection);
                                            onClose();
                                        }}
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
    );
}
