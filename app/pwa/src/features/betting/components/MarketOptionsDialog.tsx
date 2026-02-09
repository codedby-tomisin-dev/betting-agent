"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BetEvent, MarketOption, SelectionOption } from "@/shared/types";
import { Check } from "lucide-react";
import { cn } from "@/shared/utils";

interface MarketOptionsDialogProps {
    event: BetEvent;
    isOpen: boolean;
    onClose: () => void;
    onSelectSelection?: (event: BetEvent, market: MarketOption, selection: SelectionOption) => void;
    isInSlip?: (marketId: string, selectionId: string | number) => boolean;
}

export function MarketOptionsDialog({
    event,
    isOpen,
    onClose,
    onSelectSelection,
    isInSlip
}: MarketOptionsDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[80vh] flex flex-col max-w-md">
                <DialogHeader>
                    <DialogTitle>{event.name}</DialogTitle>
                    <p className="text-xs text-gray-500">
                        {event.competition?.name} • {event.time ? new Date(event.time).toLocaleString() : 'TBD'}
                    </p>
                </DialogHeader>

                <div className="space-y-6 py-4 overflow-y-auto max-h-[60vh] pr-2">
                    {(!event.options || event.options.length === 0) ? (
                        <p className="text-sm text-gray-500 text-center py-8">
                            No markets available for this event
                        </p>
                    ) : (
                        event.options.map((option, optIdx) => (
                            <div key={`${option.market_id || optIdx}`} className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-700 sticky top-0 bg-white py-1">{option.name}</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {option.options?.map((selection) => {
                                        const inSlip = isInSlip?.(option.market_id || '', selection.selection_id || '');
                                        return (
                                            <Button
                                                key={`${option.market_id}-${selection.selection_id}`}
                                                variant="outline"
                                                className={cn(
                                                    "justify-between h-auto py-2 px-3",
                                                    inSlip
                                                        ? "bg-pink-50 border-pink-300 text-pink-700 hover:bg-pink-100 hover:border-pink-400"
                                                        : "hover:border-blue-300 hover:bg-blue-50"
                                                )}
                                                size="sm"
                                                onClick={() => {
                                                    if (onSelectSelection) {
                                                        onSelectSelection(event, option, selection);
                                                    }
                                                }}
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    {inSlip && <Check className="h-3 w-3 text-pink-600" />}
                                                    <span className="text-xs font-medium truncate" title={selection.name}>{selection.name}</span>
                                                </span>
                                                <span className={cn(
                                                    "font-bold text-xs",
                                                    inSlip ? "text-pink-600" : "text-blue-600"
                                                )}>{selection.odds}</span>
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

