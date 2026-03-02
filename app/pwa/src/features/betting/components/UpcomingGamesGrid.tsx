"use client";

import { useUpcomingGames } from "../hooks/useUpcomingGames";
import { UpcomingGameCard } from "./UpcomingGameCard";
import { PickedForYouCard } from "./PickedForYouCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingUp, Globe2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bet } from "@/shared/types";

const ITEMS_PER_PAGE = 4;

interface UpcomingGamesGridProps {
    pendingBet?: Bet | null;
    onPickedClick?: () => void;
}

export function UpcomingGamesGrid({ pendingBet, onPickedClick }: UpcomingGamesGridProps) {
    const { fixtures, isLoading, actualDate } = useUpcomingGames();
    const [page, setPage] = useState(0);
    const [activeTab, setActiveTab] = useState<"popular" | "all">("popular");

    // Only surface a pending bet if it actually has AI-generated selections.
    const activePendingBet = (pendingBet && (pendingBet.selections?.items?.length ?? 0) > 0)
        ? pendingBet
        : null;

    // Filter fixtures based on active tab and remove any that have already kicked off
    const filteredFixtures = useMemo(() => {
        const now = new Date();
        const notStarted = fixtures.filter(f => {
            const eventTime = f.event?.time ? new Date(f.event.time) : null;
            return eventTime ? eventTime > now : true;
        });
        if (activeTab === "all") return notStarted;
        return notStarted.filter(f => f.metadata?.is_reliable_competition);
    }, [fixtures, activeTab]);

    // Calculate pagination - reserve first slot for picked card if it exists on page 0
    // ONLY show the Picked card on the "popular" tab so it doesn't duplicate awkwardly
    const showPickedCard = page === 0 && activePendingBet && activeTab === "popular";
    const gamesPerPage = showPickedCard ? ITEMS_PER_PAGE - 1 : ITEMS_PER_PAGE;
    const totalPages = Math.ceil((filteredFixtures.length + (showPickedCard ? 1 : 0)) / ITEMS_PER_PAGE);
    const startIndex = page === 0 ? 0 : (page * ITEMS_PER_PAGE) - (activePendingBet && activeTab === "popular" ? 1 : 0);
    const currentFixtures = filteredFixtures.slice(startIndex, startIndex + gamesPerPage);

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

    if (fixtures.length === 0 && !pendingBet) {
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
                <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "popular" | "all"); setPage(0); }} className="w-auto">
                    <TabsList className="bg-gray-100/80 p-1 border border-gray-200/50 shadow-sm h-10">
                        <TabsTrigger
                            value="popular"
                            className="text-xs font-semibold px-4 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all"
                        >
                            <div className="flex items-center gap-1.5">
                                <TrendingUp className="h-3.5 w-3.5" />
                                Popular
                            </div>
                        </TabsTrigger>
                        <TabsTrigger
                            value="all"
                            className="text-xs font-semibold px-4 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all"
                        >
                            <div className="flex items-center gap-1.5">
                                <Globe2 className="h-3.5 w-3.5" />
                                All Matches
                            </div>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

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

            {filteredFixtures.length === 0 && !showPickedCard ? (
                <Card className="h-full border border-dashed border-gray-200 shadow-none bg-gray-50/50 flex flex-col items-center justify-center min-h-[16rem]">
                    <div className="p-3 bg-white rounded-full shadow-sm border border-gray-100 mb-3">
                        <Globe2 className="h-6 w-6 text-gray-300" />
                    </div>
                    <CardContent className="text-gray-500 font-medium text-center p-0">
                        No {activeTab} matches found
                        <p className="text-xs text-gray-400 mt-1 font-normal">Try clearing filters or check back later</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 auto-rows-[12rem]">
                    {/* Show PickedForYouCard as first element on page 0 if pending bet has selections */}
                    {showPickedCard && (
                        <div className="md:row-span-2 h-full">
                            <PickedForYouCard
                                bet={activePendingBet}
                                onClick={onPickedClick || (() => { })}
                            />
                        </div>
                    )}

                    {currentFixtures.map((fixture) => (
                        <UpcomingGameCard
                            key={fixture.id}
                            fixture={fixture}
                            date={actualDate || new Date().toISOString().split('T')[0]}
                        />
                    ))}

                    {/* Fill empty spots to maintain grid structure if simplified */}
                    {(currentFixtures.length + (showPickedCard ? 1 : 0)) < ITEMS_PER_PAGE && Array.from({ length: ITEMS_PER_PAGE - currentFixtures.length - (showPickedCard ? 1 : 0) }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="hidden md:block" />
                    ))}
                </div>
            )}
        </div>
    );
}
