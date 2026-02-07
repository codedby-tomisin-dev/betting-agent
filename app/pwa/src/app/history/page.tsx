import { BetHistoryContainer } from "@/features/betting";

export default function BetHistoryPage() {
    return (
        <div className="space-y-8 max-w-4xl">
            {/* 
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Bet History</h1>
                <p className="text-gray-500">View and manage all your past bets</p>
            </div>
            */}
            {/* Header is now handled inside container or global header, keeping it clean */}

            <BetHistoryContainer />
        </div>
    );
}
