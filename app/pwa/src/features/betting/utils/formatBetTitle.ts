import { BetSelectionItem } from "@/shared/types";

export function formatBetTitle(selections: BetSelectionItem[] | undefined): string {
    if (!selections || selections.length === 0) {
        return "No selections";
    }

    const firstSelectionName = selections[0].event;
    const otherCount = selections.length - 1;

    if (otherCount > 0) {
        return `${firstSelectionName} + ${otherCount} other${otherCount === 1 ? '' : 's'}`;
    }

    return firstSelectionName;
}
