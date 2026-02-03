"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bet } from "@/shared/types";
import { formatCurrency } from "@/shared/utils";
import { formatBetTitle } from "../utils";
import { ActiveBetDetailsDialog } from "./ActiveBetDetailsDialog";

interface ActiveBetsListViewProps {
    bets: Bet[];
}

export function ActiveBetsListView({ bets }: ActiveBetsListViewProps) {
    const activeBets = bets.filter(b => b.status === "placed");
    const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleBetClick = (bet: Bet) => {
        setSelectedBet(bet);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setSelectedBet(null);
    };

    return (
        <>
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
                            activeBets.map((bet) => {
                                const title = formatBetTitle(bet.selections?.items);

                                return (
                                    <div
                                        key={bet.id}
                                        className="flex items-center justify-between border-b pb-2 last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-md transition-colors"
                                        onClick={() => handleBetClick(bet)}
                                    >
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {title}
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
                                );
                            })
                        )}
                    </div>
                </CardContent>
            </Card>

            <ActiveBetDetailsDialog
                bet={selectedBet}
                isOpen={isDialogOpen}
                onClose={handleCloseDialog}
            />
        </>
    );
}
