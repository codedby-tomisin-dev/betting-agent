"use client";

import { useState, useEffect } from "react";
import { getBetHistory } from "@/shared/api";
import { Bet } from "@/shared/types";
import { RecentBetCard } from "./RecentBetCard";
import { BetModel } from "../models/BetModel";
import { Button } from "@/components/ui/button";
import { Loader2, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActiveBetDetailsDialog } from "./ActiveBetDetailsDialog";
import { PageHeader } from "@/components/layout/PageHeader";

export function BetHistoryContainer() {
    const [bets, setBets] = useState<Bet[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastDocId, setLastDocId] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        loadHistory(true);
    }, [statusFilter]);

    const loadHistory = async (reset: boolean = false) => {
        if (reset) {
            setLoading(true);
            setBets([]);
            setLastDocId(null);
            setHasMore(true);
        } else {
            setLoadingMore(true);
        }

        setError(null);

        try {
            const startAfter = reset ? undefined : (lastDocId || undefined);
            const result = await getBetHistory(
                20, // Limit
                startAfter,
                statusFilter === "all" ? undefined : statusFilter
            );

            if (reset) {
                setBets(result.items);
            } else {
                setBets(prev => [...prev, ...result.items]);
            }

            setLastDocId(result.last_doc_id);
            setHasMore(!!result.last_doc_id);

        } catch (err: unknown) {
            console.error("Failed to load bet history:", err);
            setError("Failed to load bet history. Please try again.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleBetClick = (bet: Bet) => {
        setSelectedBet(bet);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <PageHeader title="History">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Bets</SelectItem>
                        <SelectItem value="placed">Active (Placed)</SelectItem>
                        <SelectItem value="finished">Finished (Settled)</SelectItem>
                        <SelectItem value="intent">Pending Approval</SelectItem>
                    </SelectContent>
                </Select>
            </PageHeader>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#8a2be2] mb-2" />
                    <p className="text-gray-500">Loading history...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-center">
                    {error}
                    <Button variant="outline" size="sm" onClick={() => loadHistory(true)} className="ml-2 mt-2">Retry</Button>
                </div>
            ) : bets.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-gray-500">No bets found{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {bets.map((bet) => (
                        <RecentBetCard
                            key={bet.id}
                            betModel={new BetModel(bet)}
                            onClick={() => handleBetClick(bet)}
                        />
                    ))}

                    {hasMore && (
                        <div className="flex justify-center pt-4">
                            <Button
                                variant="outline"
                                onClick={() => loadHistory(false)}
                                disabled={loadingMore}
                                className="w-full sm:w-auto min-w-[150px]"
                            >
                                {loadingMore ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    "Load More"
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            <ActiveBetDetailsDialog
                bet={selectedBet}
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
            />
        </div>
    );
}
