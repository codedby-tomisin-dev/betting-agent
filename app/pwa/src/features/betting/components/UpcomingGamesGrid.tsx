"use client";

import { useUpcomingGames } from "../hooks/useUpcomingGames";
import { UpcomingGameCard } from "./UpcomingGameCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

const ITEMS_PER_PAGE = 4;

export function UpcomingGamesGrid() {
    const { games, isLoading } = useUpcomingGames();
    const [page, setPage] = useState(0);

    // Calculate pagination
    const totalPages = Math.ceil(games.length / ITEMS_PER_PAGE);
    const startIndex = page * ITEMS_PER_PAGE;
    const currentGames = games.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePrev = () => {
        setPage(p => Math.max(0, p - 1));
    };

    const handleNext = () => {
        setPage(p => Math.min(totalPages - 1, p + 1));
    };

    if (isLoading) {
        return (
            <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={`skel-${idx}`} className="h-48 bg-gray-50 rounded-2xl animate-pulse border border-gray-100" />
                ))}
            </div>
        );
    }

    if (games.length === 0) {
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentGames.map((game, idx) => (
                    <UpcomingGameCard game={game} />
                ))}

                {/* Fill empty spots to maintain grid structure if simplified */}
                {currentGames.length < ITEMS_PER_PAGE && Array.from({ length: ITEMS_PER_PAGE - currentGames.length }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="hidden md:block" />
                ))}
            </div>
        </div>
    );
}
