/**
 * AI betting agent configuration settings
 */
export interface BettingSettings {
    BANKROLL_PERCENT: number;
    MAX_BANKROLL: number;
    RISK_APPETITE: number;
    USE_RELIABLE_TEAMS: boolean;
    MIN_STAKE: number;
    MIN_PROFIT: number;
}

/**
 * Default settings matching backend constants
 */
export const DEFAULT_SETTINGS: BettingSettings = {
    BANKROLL_PERCENT: 50,
    MAX_BANKROLL: 5000,
    RISK_APPETITE: 1.5,
    USE_RELIABLE_TEAMS: true,
    MIN_STAKE: 1.0,
    MIN_PROFIT: 0.02,
};

/**
 * Risk level labels for UI display
 */
export type RiskLevel =
    | 'Very Conservative'
    | 'Conservative'
    | 'Moderate-Low'
    | 'Balanced'
    | 'Moderate-High'
    | 'Aggressive'
    | 'Very Aggressive';
