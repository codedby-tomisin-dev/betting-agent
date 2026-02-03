import { Bet } from "@/shared/types";
import { formatTimestamp, formatDate } from "../../utils";

interface BetMetadataProps {
    bet: Bet;
}

export function BetMetadata({ bet }: BetMetadataProps) {
    return (
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
                <p className="text-muted-foreground">Bet ID</p>
                <p className="font-mono text-xs">{bet.id}</p>
            </div>
            <div>
                <p className="text-muted-foreground">Target Date</p>
                <p className="font-medium">{formatDate(bet.target_date)}</p>
            </div>
            <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{formatTimestamp(bet.created_at)}</p>
            </div>
            <div>
                <p className="text-muted-foreground">Placed</p>
                <p className="font-medium">{formatTimestamp(bet.placed_at)}</p>
            </div>
        </div>
    );
}
