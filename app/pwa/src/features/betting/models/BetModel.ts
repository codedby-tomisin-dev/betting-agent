import { Bet } from "@/shared/types";
import { formatBetTitle } from "../utils";

export class BetModel {
    private bet: Bet;

    constructor(bet: Bet) {
        this.bet = bet;
    }

    get id(): string {
        return this.bet.id;
    }

    get title(): string {
        return formatBetTitle(this.bet.selections?.items);
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

        // Fallback if balance snapshots aren't available
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
}
