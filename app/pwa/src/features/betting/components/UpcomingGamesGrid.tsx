"use client";

import { useUpcomingGames } from "../hooks/useUpcomingGames";
import { UpcomingGameCard } from "./UpcomingGameCard";
import { PickedForYouCard } from "./PickedForYouCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Bet } from "@/shared/types";

const ITEMS_PER_PAGE = 4;

interface UpcomingGamesGridProps {
    pendingBet?: Bet | null;
    onPickedClick?: () => void;
}

export function UpcomingGamesGrid({ pendingBet, onPickedClick }: UpcomingGamesGridProps) {
    const { games, isLoading } = useUpcomingGames();
    const [page, setPage] = useState(0);

    // Calculate pagination - reserve first slot for picked card if it exists on page 0
    const gamesPerPage = (page === 0 && pendingBet) ? ITEMS_PER_PAGE - 1 : ITEMS_PER_PAGE;
    const totalPages = Math.ceil((games.length + (pendingBet ? 1 : 0)) / ITEMS_PER_PAGE);
    const startIndex = page === 0 ? 0 : (page * ITEMS_PER_PAGE) - (pendingBet ? 1 : 0);
    const currentGames = games.slice(startIndex, startIndex + gamesPerPage);

    const handlePrev = () => {
        setPage(p => Math.max(0, p - 1));
    };

    const handleNext = () => {
        setPage(p => Math.min(totalPages - 1, p + 1));
    };

    if (isLoading) {
        return (
            <div className="flex flex-col h-full space-y-4">
                {/* Header skeleton matching actual header */}
                <div className="flex items-center justify-between px-1">
                    <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
                    <div className="flex items-center gap-1">
                        <div className="h-8 w-8 bg-gray-100 rounded animate-pulse" />
                        <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
                        <div className="h-8 w-8 bg-gray-100 rounded animate-pulse" />
                    </div>
                </div>

                {/* Grid skeleton matching actual grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={`skel-${idx}`} className="h-48 bg-gray-50 rounded-2xl animate-pulse border border-gray-100" />
                    ))}
                </div>
            </div>
        );
    }

    if (games.length === 0 && !pendingBet) {
        return (
            <Card className="h-full border-0 shadow-none bg-gray-50/50 flex items-center justify-center">
                <CardContent className="text-gray-400 font-medium">
                    No upcoming games found
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-xl text-gray-900">Upcoming Games</h2>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-gray-900"
                        onClick={handlePrev}
                        disabled={page === 0}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium text-gray-400 tabular-nums">
                        {page + 1} / {totalPages || 1}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-gray-900"
                        onClick={handleNext}
                        disabled={page >= totalPages - 1}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 auto-rows-[12rem]">
                {/* Show PickedForYouCard as first element on page 0 if pending bet exists - spans 2 rows */}
                {page === 0 && pendingBet && (
                    <div className="md:row-span-2 h-full">
                        <PickedForYouCard
                            bet={pendingBet}
                            onClick={onPickedClick || (() => { })}
                        />
                    </div>
                )}

                {currentGames.map((game, idx) => (
                    <UpcomingGameCard key={idx} game={game} />
                ))}

                {/* Fill empty spots to maintain grid structure if simplified */}
                {(currentGames.length + (page === 0 && pendingBet ? 1 : 0)) < ITEMS_PER_PAGE && Array.from({ length: ITEMS_PER_PAGE - currentGames.length - (page === 0 && pendingBet ? 1 : 0) }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="hidden md:block" />
                ))}
            </div>
        </div>
    );
}
