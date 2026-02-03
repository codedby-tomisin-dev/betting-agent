# ActiveBetDetailsDialog

A dialog component for displaying comprehensive details about placed bets.

## What does this feature do?

Displays detailed information about a placed bet in a modal dialog, including:
- Bet metadata (ID, dates, timestamps)
- AI analysis reasoning
- Selections grouped by event
- Wager totals
- Placement results from the betting platform

## Component Structure

```
ActiveBetDetailsDialog/
├── index.ts                      # Main export
├── ActiveBetDetailsDialog.tsx    # Container component (orchestration)
├── BetMetadata.tsx              # Displays bet ID and timestamps
├── BetAIReasoning.tsx           # Displays AI analysis with markdown
├── BetSelectionItemView.tsx     # Individual selection display
├── BetSelectionsList.tsx        # Groups selections by event
├── BetWagerTotals.tsx           # Total stake, odds, returns
└── BetPlacementResults.tsx      # Platform placement details
```

## Component Responsibilities

### ActiveBetDetailsDialog (Container)
- Orchestrates the dialog layout
- Groups selections by event
- Conditionally renders sections based on data availability

### Presentational Components
Each sub-component is a pure view component that:
- Receives specific props
- Has a single responsibility
- Contains no business logic
- Is easily testable and reusable

## Usage

```tsx
import { ActiveBetDetailsDialog } from "./ActiveBetDetailsDialog";

<ActiveBetDetailsDialog 
    bet={selectedBet}
    isOpen={isDialogOpen}
    onClose={handleClose}
/>
```

## Design Principles

Following React coding standards:
- **One Component, One Responsibility**: Each component has a clear, single purpose
- **Separation of Concerns**: Container handles orchestration, views handle presentation
- **Reusability**: Sub-components can be used independently if needed
- **Maintainability**: Small, focused components are easier to understand and modify
