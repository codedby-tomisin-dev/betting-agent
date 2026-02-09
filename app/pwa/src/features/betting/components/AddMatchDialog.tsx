"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BetEvent, MarketOption, SelectionOption } from "@/shared/types";

interface AddMatchDialogProps {
    isOpen: boolean;
    onClose: () => void;
    availableEvents: BetEvent[];
    existingEventNames: string[];
    onSelectMatch: (event: BetEvent, market: MarketOption, selection: SelectionOption) => void;
}

export function AddMatchDialog({
    isOpen,
    onClose,
    availableEvents,
    existingEventNames,
    onSelectMatch,
}: AddMatchDialogProps) {
    const filteredEvents = availableEvents.filter(
        e => !existingEventNames.includes(e.name)
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select a Match to Add</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 overflow-y-auto max-h-[60vh]">
                    {filteredEvents.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">
                            All available matches have been added
                        </p>
                    ) : (
                        filteredEvents.map((event, eventIdx) => (
                            <div key={eventIdx} className="border rounded-sm p-3 space-y-2">
                                <p className="font-semibold text-sm">{event.name}</p>
                                <p className="text-xs text-gray-500">
                                    {event.competition?.name} • {new Date(event.time).toLocaleString()}
                                </p>
                                {event.options?.map((option, optIdx) => (
                                    <div key={optIdx} className="space-y-2">
                                        <p className="text-xs text-gray-600">{option.name}</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {option.options?.map((selection, selIdx) => (
                                                <Button
                                                    key={selIdx}
                                                    variant="outline"
                                                    className="justify-between"
                                                    size="sm"
                                                    onClick={() => {
                                                        onSelectMatch(event, option, selection);
                                                        onClose();
                                                    }}
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
    );
}
