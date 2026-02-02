# Betting Feature

## Overview

Handles the bet approval workflow including reviewing AI-suggested bets, modifying stakes/selections, and submitting for placement.

## Components

### Container (Smart)
- `BetApprovalContainer` - Orchestrates approval flow, manages which bet is being approved

### Views (Dumb)
- `BetApprovalView` - Renders the collapsible approval panel
- `PendingBetCard` - Individual bet review card with modification capabilities
- `BetSelectionGroup` - Grouped market selections for an event
- `BetTotalsDisplay` - Shows totals and action buttons
- `AddMarketDialog` - Dialog for adding a market to an existing event
- `AddMatchDialog` - Dialog for adding a new match/event
- `ActiveBetsListView` - List of currently placed bets

## Hooks

- `useBetApproval` - Manages approval state and API interaction
- `useBetModifications` - Tracks stake edits and selection changes per bet

## Utils

- `groupSelectionsByEvent` - Groups selections by event name for display
- `calculateBetTotals` - Calculates total stake and potential returns

## Data Flow

```
useBets (shared)
    → BetApprovalContainer
        → useBetApproval (approval state)
        → PendingBetCard
            → useBetModifications (per-bet modifications)
            → BetSelectionGroup, BetTotalsDisplay, Dialogs
```

## Key Business Rules

1. Only bets with status `"analyzed"` appear in pending approvals
2. Stakes cannot exceed available balance (`bet.balance.starting`)
3. Selections can be added/removed before approval
4. Approval triggers `approveBetIntent` API call which queues for placement
5. Each bet card manages its own modification state independently

## Usage

```tsx
import { BetApprovalContainer, ActiveBetsListView } from '@/features/betting';

// In a page or parent component
<BetApprovalContainer bets={bets} />
<ActiveBetsListView bets={bets} />
```

## Types

- `Bet` - Main bet interface
- `BetSelectionItem` - Individual selection within a bet
- `SelectionEventGroup` - Grouped selections for UI display
- `AddedSelectionItem` - Selection added by user (has unique ID)
