import { PlacementResult } from "@/shared/types";
import { formatDate } from "../../utils";

interface BetPlacementResultsProps {
    results: PlacementResult[];
}

export function BetPlacementResults({ results }: BetPlacementResultsProps) {
    return (
        <div className="space-y-2">
            <h3 className="font-semibold text-base">Placement Details</h3>
            <div className="space-y-2">
                {results.map((result, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-md p-3 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <p className="text-muted-foreground">Bet ID</p>
                                <p className="font-mono">{result.bet_id}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Market ID</p>
                                <p className="font-mono">{result.market_id}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Selection ID</p>
                                <p className="font-mono">{result.selection_id}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Placed Date</p>
                                <p className="font-medium">{formatDate(result.placed_date)}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
