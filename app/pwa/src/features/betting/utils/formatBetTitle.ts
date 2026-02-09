import { BetSelectionItem, EventInfo } from "@/shared/types";
import { parseEventInfo, LegacyEventData } from "../models/BetSelectionModel";

export function formatBetTitle(selections: BetSelectionItem[] | undefined): string {
    if (!selections || selections.length === 0) {
        return "No selections";
    }

    const firstEvent = parseEventInfo(selections[0].event as LegacyEventData | EventInfo);
    const otherCount = selections.length - 1;

    if (otherCount > 0) {
        return `${firstEvent.name} + ${otherCount} other${otherCount === 1 ? '' : 's'}`;
    }

    return firstEvent.name;
}
