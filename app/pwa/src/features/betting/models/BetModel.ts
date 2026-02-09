import { Bet } from "@/shared/types";
import { BetSelectionModel, parseEventInfo } from "./BetSelectionModel";

export class BetModel {
    private readonly bet: Bet;

    constructor(bet: Bet) {
        this.bet = bet;
    }

    get id(): string {
        return this.bet.id;
    }

    get title(): string {
        const items = this.bet.selections?.items;
        if (!items || items.length === 0) {
            return "No selections";
        }

        const firstEvent = parseEventInfo(items[0].event);
        const otherCount = items.length - 1;

        if (otherCount > 0) {
            return `${firstEvent.name} + ${otherCount} other${otherCount === 1 ? '' : 's'}`;
        }

        return firstEvent.name;
    }

    get targetDate(): Date | null {
        return this.bet.target_date ? new Date(this.bet.target_date) : null;
    }

    get status(): string {
        return this.bet.status;
    }

    get stake(): number {
        return this.bet.selections?.wager.stake || 0;
    }

    get potentialReturns(): number {
        return this.bet.selections?.wager.potential_returns || 0;
    }

    get realizedReturns(): number {
        return this.bet.realized_returns || 0;
    }

    get endingBalance(): number {
        return this.bet.balance?.ending || 0;
    }

    get startingBalance(): number {
        return this.bet.balance?.starting || 0;
    }

    get isFinished(): boolean {
        return this.bet.status === 'finished';
    }

    get profit(): number {
        if (!this.isFinished) return 0;

        if (this.bet.balance?.ending != null && this.bet.balance?.starting != null) {
            return this.endingBalance - this.startingBalance;
        }

        return this.realizedReturns - this.stake;
    }

    get isWin(): boolean {
        return this.profit >= 0;
    }

    get displayPot(): number {
        if (this.isFinished) {
            return this.bet.balance?.ending != null ? this.endingBalance : this.realizedReturns;
        }
        return this.potentialReturns;
    }

    get selections(): BetSelectionModel[] {
        return (this.bet.selections?.items || []).map(BetSelectionModel.from);
    }

    get selectionCount(): number {
        return this.bet.selections?.items?.length || 0;
    }

    get eventNames(): string[] {
        const items = this.bet.selections?.items || [];
        // Deduplicate event names
        const names = new Set<string>();
        items.forEach(item => {
            const eventInfo = parseEventInfo(item.event);
            names.add(eventInfo.name);
        });
        return Array.from(names);
    }

    get rawData(): Bet {
        return this.bet;
    }

    static from(bet: Bet): BetModel {
        return new BetModel(bet);
    }
}
