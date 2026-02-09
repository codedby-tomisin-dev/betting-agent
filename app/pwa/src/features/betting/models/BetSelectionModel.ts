import { BetSelectionItem, EventInfo, BetEvent, MarketOption } from "@/shared/types";

export interface LegacyEventData {
    name?: string;
    time?: string;
    competition?: { name: string };
    event_name?: string;
    event_time?: string;
    competition_name?: string;
    options?: MarketOption[];
}

export function parseEventInfo(data: LegacyEventData | EventInfo | undefined | null): EventInfo {
    if (!data) {
        return {
            name: 'Unknown Event',
            time: '',
            competition: { name: 'Unknown Competition' }
        };
    }
    if ('name' in data && 'time' in data && 'competition' in data && data.competition) {
        return data as EventInfo;
    }
    const legacy = data as LegacyEventData;
    return {
        name: legacy.event_name || legacy.name || 'Unknown Event',
        time: legacy.event_time || legacy.time || '',
        competition: {
            name: legacy.competition_name || legacy.competition?.name || 'Unknown Competition'
        }
    };
}

export function parseBetEvent(data: LegacyEventData | BetEvent): BetEvent {
    const eventInfo = parseEventInfo(data);
    return {
        ...eventInfo,
        options: data.options
    };
}

export class BetSelectionModel {
    private selection: BetSelectionItem;

    constructor(selection: BetSelectionItem) {
        this.selection = selection;
    }

    get event(): EventInfo {
        // Use parser to handle legacy data
        return parseEventInfo(this.selection.event as LegacyEventData | EventInfo);
    }

    get eventName(): string {
        return this.event.name;
    }

    get eventTime(): string {
        return this.event.time;
    }

    get competitionName(): string {
        return this.event.competition.name;
    }

    get market(): string {
        return this.selection.market;
    }

    get odds(): number {
        return this.selection.odds;
    }

    get stake(): number {
        return this.selection.stake;
    }

    get reasoning(): string | undefined {
        return this.selection.reasoning;
    }

    get eventId(): string {
        return getEventId(this.event);
    }

    isSameEvent(other: BetSelectionModel): boolean {
        return this.eventId === other.eventId;
    }

    toData(): BetSelectionItem {
        return this.selection;
    }

    static from(selection: BetSelectionItem): BetSelectionModel {
        return new BetSelectionModel(selection);
    }
}

/**
 * Generate unique ID for an event
 */
export function getEventId(event: EventInfo | LegacyEventData): string {
    const parsed = parseEventInfo(event);
    return `${parsed.name}_${parsed.time}`;
}
