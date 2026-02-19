"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bet } from "@/shared/types";
import { ActiveBetDetailsDialog } from "./ActiveBetDetailsDialog";
import { BetModel } from "../models/BetModel";
import { RecentActivityRow } from "./RecentActivityRow";

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
            <Card className="h-full bg-transparent border-0 shadow-none rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                    <CardTitle className="text-xl font-[400] text-gray-900">Recent Activity</CardTitle>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 font-medium" asChild>
                        <Link href="/history">
                            View More <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {recentBets.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No recent betting activity.</p>
                    ) : (
                        recentBets.map((bet, index) => (
                            <RecentActivityRow
                                key={bet.id}
                                betModel={new BetModel(bet)}
                                onClick={() => handleBetClick(bet)}
                                isLast={index === recentBets.length - 1}
                            />
                        ))
                    )}
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
