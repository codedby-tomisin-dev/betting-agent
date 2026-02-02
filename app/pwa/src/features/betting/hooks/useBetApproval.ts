import { useState } from 'react';
import { toast } from 'sonner';
import { approveBetIntent } from '@/shared/api';
import { BetSelectionItem } from '@/shared/types';

/**
 * Hook to manage bet approval state and API interaction
 */
export function useBetApproval() {
    const [approvingBetId, setApprovingBetId] = useState<string | null>(null);

    const submitBetForPlacement = async (
        betId: string,
        finalItems: BetSelectionItem[]
    ) => {
        try {
            setApprovingBetId(betId);
            await approveBetIntent(betId, { items: finalItems });
            toast.success("Bet approved and queued for placement!");
        } catch (e: unknown) {
            toast.error("Failed to approve bet: " + (e as Error).message);
            throw e;
        } finally {
            setApprovingBetId(null);
        }
    };

    return {
        approvingBetId,
        submitBetForPlacement,
    };
}
