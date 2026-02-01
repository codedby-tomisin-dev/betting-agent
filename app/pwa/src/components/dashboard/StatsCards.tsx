
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bet } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Zap, Wallet, Target, Trophy } from "lucide-react";

interface StatsCardsProps {
    bets: Bet[];
}

export function StatsCards({ bets }: StatsCardsProps) {
    // Calculate stats
    // Filter for finished bets for profit/win rate
    const finishedBets = bets.filter(b => b.status === "finished");
    const activeBets = bets.filter(b => ["placed", "ready", "analyzed"].includes(b.status));

    // Calculate Total Profit (Realized Returns - Stake)
    // This depends on how we store historical data. 
    // Assuming 'balance.ending' tracks cumulative balance or we sum up net profit of settled bets.
    // Ideally, we sum up realized_returns - stake for all finished bets.

    let totalProfit = 0;
    let wins = 0;

    finishedBets.forEach(bet => {
        // Check if settlement results exist
        if (bet.settlement_results) {
            // This logic depends on exact structure of settlement results
            // Based on manager.py: "profit" in settlement result is realized profit
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            const realizedReturn = bet.settlement_results.reduce((acc: number, res: any) => acc + (res.profit || 0), 0);

            totalProfit += realizedReturn;

            if (realizedReturn > 0) wins++;
        }
    });

    const winRate = finishedBets.length > 0 ? (wins / finishedBets.length) * 100 : 0;

    // Total Balance - Use the most recent bet's ending balance or starting balance
    // Or fetch from get_balance API. For now, let's use the most recent bet's balance if available.
    const latestBet = bets[0];
    const currentBalance = latestBet?.balance?.ending ?? latestBet?.balance?.starting ?? 0;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{formatCurrency(currentBalance)}</div>
                    <p className="text-xs text-muted-foreground">
                        +{formatCurrency(totalProfit)}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{winRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                        {wins} wins / {finishedBets.length} placed
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
