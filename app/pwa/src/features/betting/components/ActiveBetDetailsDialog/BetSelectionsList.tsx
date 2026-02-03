import { BetSelectionItem } from "@/shared/types";
import { BetSelectionItemView } from "./BetSelectionItemView";

interface BetSelectionsListProps {
    groupedByEvent: Record<string, BetSelectionItem[]>;
}

export function BetSelectionsList({ groupedByEvent }: BetSelectionsListProps) {
    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-base">Selections</h3>
            {Object.entries(groupedByEvent).map(([eventName, eventSelections]) => (
                <div key={eventName} className="space-y-2">
                    <h4 className="font-semibold text-gray-900">{eventName}</h4>
                    <div className="space-y-2">
                        {eventSelections.map((selection, idx) => (
                            <BetSelectionItemView key={idx} selection={selection} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
