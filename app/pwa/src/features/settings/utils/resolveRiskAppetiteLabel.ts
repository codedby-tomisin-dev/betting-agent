import { RiskLevel } from '@/shared/types';

/**
 * Resolve risk appetite value to human-readable label
 */
export function resolveRiskAppetiteLabel(value: number): RiskLevel {
    if (value <= 1.5) return "Very Conservative";
    if (value <= 2) return "Conservative";
    if (value <= 2.5) return "Moderate-Low";
    if (value <= 3) return "Balanced";
    if (value <= 3.5) return "Moderate-High";
    if (value <= 4) return "Aggressive";
    return "Very Aggressive";
}
