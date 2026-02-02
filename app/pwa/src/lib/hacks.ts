
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { toast } from "sonner";

/**
 * HACK: Manually settle a bet as successful to mimic backend job.
 * This effectively "forces" a win for all selections in the bet.
 */
export async function hack_simulateSuccessfulBet(betId: string = "hHp4wVJ1empws7MxJSEC") {
    try {
        console.log(`[HACK] Attempting to force-settle bet: ${betId}`);
        const betRef = doc(db, "bet_slips", betId);
        const betSnap = await getDoc(betRef);

        if (!betSnap.exists()) {
            throw new Error(`Bet ${betId} not found`);
        }

        const betData = betSnap.data();
        const items = betData.selections?.items || [];
        const startingBalance = betData.balance?.starting || 0;

        if (items.length === 0) {
            throw new Error("No selections found in bet to settle");
        }

        // Calculate "won" results for all items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const settlementResults = items.map((item: any) => {
            const stake = item.stake || 0;
            const odds = item.odds || 0;
            // Profit on Betfair is (stake * (odds - 1)) - commission, but let's simplify to stake * (odds - 1)
            const profit = stake * (odds - 1);

            return {
                market_id: item.market_id,
                selection_id: item.selection_id,
                status: "WIN", // Betfair status
                profit: profit,
                sizeMatched: stake,
                betId: item.bet_id || "simulated_bet_id"
            };
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const totalProfit = settlementResults.reduce((sum: number, res: any) => sum + res.profit, 0);
        const endingBalance = startingBalance + totalProfit + getTotalStake(items); // Balance includes returned stake + profit

        // Wait, "profit" in the backend manager seemed to imply "realized profit". 
        // Manager logic: "ending": starting_balance + total_realized_profit
        // If "profit" on Betfair is net profit, then we should add original stake back?
        // Usually Betfair "profit" in API responses is P&L. If you win, you get P&L + Stake returned?
        // Let's check manager.py again. 
        // 539: total_realized_profit = sum(r.get('profit', 0) for r in merged_results)
        // 550: "ending": starting_balance + total_realized_profit
        // If starting_balance was *before* the bet (and funds were not deducted?), then ending balance is simply start + result.
        // If funds *were* deducted, then we need to add back stake + profit.
        // The architecture usually implies funds are "reserved" or deducted.
        // But looking at manager, it takes `balance.starting`.
        // Let's assume `profit` is the NET positive change. If I bet 10 and win 5 profit. total return is 15.
        // If my bal was 100. I place 10. Bal is 90.
        // Settlement: I get 15 back. Bal becomes 105. Net change +5.
        // If `starting_balance` recorded in doc is the balance *at creation* (100).
        // Then ending should be 100 + 5 = 105.
        // So `profit` in `settlement_results` should be the NET PROFIT.
        // BUT, Betfair API usually returns profit/loss.
        // I will stick to `profit = stake * (odds - 1)`.

        const updates = {
            status: "finished",
            settlement_results: settlementResults,
            last_settled_at: serverTimestamp(),
            finished_at: serverTimestamp(),
            "balance.ending": startingBalance + totalProfit,
            // Also ensure placement_results exists if it doesn't
            ...(!betData.placement_results ? {
                placement_results: {
                    status: "success",
                    bets: items.map((item: any) => ({
                        bet_id: "simulated_" + Math.random().toString(36),
                        market_id: item.market_id,
                        selection_id: item.selection_id,
                        placed_date: new Date().toISOString()
                    }))
                }
            } : {})
        };

        console.log("[HACK] Applying updates:", updates);
        await updateDoc(betRef, updates);

        toast.success("HACK: Simluated successful bet!");
        window.location.reload();

    } catch (e) {
        console.error(e);
        toast.error("Hack failed: " + (e as Error).message);
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTotalStake(items: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return items.reduce((sum: number, item: any) => sum + (item.stake || 0), 0);
}
