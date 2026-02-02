# Dashboard Feature

## Overview

Main dashboard displaying betting performance metrics, charts, and active bets.

## Components

### Container (Smart)
- `DashboardContainer` - Owns bet data via `useBets`, orchestrates all dashboard components

### Views (Dumb)
- `StatsCardsView` - Balance and win rate stat cards
- `PerformanceChartView` - Historical performance area chart

## Hooks

- `useDashboardStats` - Calculates profit, win rate, and balance from bet history

## Types

- `DashboardStats` - Calculated statistics (totalProfit, winRate, currentBalance, wins, finishedBetsCount)
- `ChartDataPoint` - Data point for performance chart (date, balance)

## Data Flow

```
useBets (shared)
    → DashboardContainer
        → useDashboardStats (calculated metrics)
        → StatsCardsView (stats display)
        → PerformanceChartView (chart)
        → BetApprovalContainer (from betting feature)
        → ActiveBetsListView (from betting feature)
```

## Metrics Calculation

### Total Profit
Sum of `settlement_results[].profit` for all finished bets.

### Win Rate
```
(Bets with positive profit) / (Total finished bets) * 100
```

### Current Balance
Latest bet's `balance.ending` or `balance.starting` if ending not available.

## Usage

```tsx
import { DashboardContainer } from '@/features/dashboard';

// As the main page content
export default function Home() {
    return <DashboardContainer />;
}
```

## Chart Data

The performance chart shows:
- X-axis: Target dates of finished bets
- Y-axis: Balance at each point
- Starts from "Start" at $0 to show growth

Only bets with `status === "finished"` and `balance.ending` defined are included.
