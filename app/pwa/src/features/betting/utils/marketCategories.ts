import { MarketOption } from "@/shared/types";

export type MarketCategory = 'Cards' | 'Corners' | 'Double Outcomes' | 'Goals' | 'Match Odds' | 'Other';

const MARKET_CATEGORIES: Record<MarketCategory, string[]> = {
    'Match Odds': ['MATCH_ODDS', 'MONEY_LINE'],
    'Double Outcomes': ['DOUBLE_CHANCE'],
    'Goals': [
        'OVER_UNDER_05', 'OVER_UNDER_15', 'OVER_UNDER_25',
        'OVER_UNDER_35', 'OVER_UNDER_45', 'OVER_UNDER_55', 'OVER_UNDER_65',
        'BOTH_TEAMS_TO_SCORE', 'TOTAL_POINTS'
    ],
    'Cards': [
        'TOTAL_CARDS', 'BOOKING_POINTS', 'OVER_UNDER_05_CARDS',
        'OVER_UNDER_15_CARDS', 'OVER_UNDER_25_CARDS', 'OVER_UNDER_35_CARDS',
        'OVER_UNDER_45_CARDS', 'OVER_UNDER_55_CARDS', 'OVER_UNDER_65_CARDS'
    ],
    'Corners': ['CORNER_KICKS', 'CORNER_MATCH_BET'],
    'Other': []
};

export function categorizeMarket(marketName: string): MarketCategory {
    // Check for card markets first (more specific)
    if (marketName.includes('CARD')) {
        return 'Cards';
    }

    // Then check other categories
    for (const [category, patterns] of Object.entries(MARKET_CATEGORIES)) {
        if (patterns.some(pattern => marketName.includes(pattern))) {
            return category as MarketCategory;
        }
    }
    return 'Other';
}

export function groupMarketsByCategory(markets: MarketOption[]): Map<MarketCategory, MarketOption[]> {
    const grouped = new Map<MarketCategory, MarketOption[]>();

    // Initialize all categories
    const categories: MarketCategory[] = ['Match Odds', 'Double Outcomes', 'Cards', 'Corners', 'Goals', 'Other'];
    categories.forEach(cat => grouped.set(cat, []));

    // Group markets
    markets.forEach(market => {
        const category = categorizeMarket(market.name);
        grouped.get(category)?.push(market);
    });

    // Sort markets alphabetically within each category
    grouped.forEach((marketList) => {
        marketList.sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
}
