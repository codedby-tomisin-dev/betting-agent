import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { triggerAutomatedBetting } from '@/shared/api';

/**
 * Hook to handle triggering AI bet analysis
 */
export function useTriggerAnalysis() {
    const [isRunning, setIsRunning] = useState(false);

    const triggerAIBetAnalysis = useCallback(async () => {
        try {
            setIsRunning(true);
            await triggerAutomatedBetting();
            toast.success("AI Analysis triggered successfully! Watch for updates in 'Pending Approvals'.");
        } catch (e: unknown) {
            toast.error("Failed to start analysis: " + (e as Error).message);
            throw e;
        } finally {
            setIsRunning(false);
        }
    }, []);

    return { isRunning, triggerAIBetAnalysis };
}
