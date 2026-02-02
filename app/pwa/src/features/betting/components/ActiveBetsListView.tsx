"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bet } from "@/shared/types";
import { formatCurrency } from "@/shared/utils";

interface ActiveBetsListViewProps {
    bets: Bet[];
}

export function ActiveBetsListView({ bets }: ActiveBetsListViewProps) {
    const activeBets = bets.filter(b => b.status === "placed");

    return (
        <Card>
            <CardHeader>
                <CardTitle>Active Betslips</CardTitle>
                <CardDescription>
                    {activeBets.length} betslips currently active
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activeBets.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No active bets.</p>
                    ) : (
                        activeBets.map((bet) => (
                            <div key={bet.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        {bet.events && bet.events.length > 0 ? bet.events[0].event_name : "Multiple Events"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Target Date: {bet.target_date}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-sm font-medium">{formatCurrency(bet.selections?.wager.stake || 0)}</p>
                                        <p className="text-xs text-green-500">
                                            Potential: {formatCurrency(bet.selections?.wager.potential_returns || 0)}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                        Placed
                                    </Badge>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
