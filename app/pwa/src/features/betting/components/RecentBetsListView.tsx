"use client";

import { useState, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bet } from "@/shared/types";
import { ActiveBetDetailsDialog } from "./ActiveBetDetailsDialog";
import { BetModel } from "../models/BetModel";
import { RecentBetCard } from "./RecentBetCard";

interface RecentBetsListViewProps {
    bets: Bet[];
}

export function RecentBetsListView({ bets }: RecentBetsListViewProps) {
    const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { recentBets, wins, losses } = useMemo(() => {
        const sorted = bets
            .filter(b => b.status !== "intent")
            .sort((a, b) => {
                const dateA = new Date(a.created_at as Date).getTime();
                const dateB = new Date(b.created_at as Date).getTime();
                return dateB - dateA;
            })
            .slice(0, 5);

        let wins = 0;
        let losses = 0;

        // Count wins/losses from the last 7 days using the full bet list
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        bets.forEach(bet => {
            // Use BetModel for consistent logic
            const model = new BetModel(bet);

            // Logic for "7 days ago" check using placed_at
            if (model.isFinished && bet.placed_at) {
                const placeDate = new Date(bet.placed_at as Date);
                if (placeDate >= sevenDaysAgo) {
                    if (model.isWin) {
                        wins++;
                    } else {
                        losses++;
                    }
                }
            }
        });

        return { recentBets: sorted, wins, losses };
    }, [bets]);

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
            <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                    <CardTitle>Recent Activity</CardTitle>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 font-medium">
                        View More <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {recentBets.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No recent betting activity.</p>
                    ) : (
                        recentBets.map((bet) => (
                            <RecentBetCard
                                key={bet.id}
                                betModel={new BetModel(bet)}
                                onClick={() => handleBetClick(bet)}
                            />
                        ))
                    )}
                </CardContent>
                <CardFooter className="flex items-center justify-between border-t pt-6">
                    <p className="text-sm text-muted-foreground">Last 7 days</p>
                    <div className="flex items-center gap-4 text-sm font-medium">
                        <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            {wins} Won
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            {losses} Lost
                        </span>
                    </div>
                </CardFooter>
            </Card>

            <ActiveBetDetailsDialog
                bet={selectedBet}
                isOpen={isDialogOpen}
                onClose={handleCloseDialog}
            />
        </>
    );
}
