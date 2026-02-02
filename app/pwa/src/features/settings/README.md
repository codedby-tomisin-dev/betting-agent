# Settings Feature

## Overview

Configuration panel for AI betting agent parameters including risk appetite, bankroll limits, and stake constraints.

## Components

### Container (Smart)
- `SettingsContainer` - Composes hooks and orchestrates settings management

### Views (Dumb)
- `SettingsFormView` - Main form layout with all sections
- `RiskAppetiteSlider` - Risk level selection slider with label
- `BankrollSettingsSection` - Bankroll percentage and max amount inputs
- `StakeLimitsSection` - Minimum stake and profit inputs
- `SettingsLoadingSkeleton` - Loading state placeholder

## Hooks

- `useSettingsForm` - Manages local form state, syncs with remote settings
- `usePersistSettings` - Handles saving settings to Firestore
- `useTriggerAnalysis` - Handles triggering AI bet analysis

## Utils

- `resolveRiskAppetiteLabel` - Converts numeric risk value to human-readable label

## Risk Levels

| Range | Label |
|-------|-------|
| 1 - 1.5 | Very Conservative |
| 1.5 - 2 | Conservative |
| 2 - 2.5 | Moderate-Low |
| 2.5 - 3 | Balanced |
| 3 - 3.5 | Moderate-High |
| 3.5 - 4 | Aggressive |
| 4 - 5 | Very Aggressive |

## Data Flow

```
useSettings (shared)
    → SettingsContainer
        → useSettingsForm (local form state)
        → usePersistSettings (save operation)
        → useTriggerAnalysis (analysis trigger)
        → SettingsFormView
            → RiskAppetiteSlider
            → BankrollSettingsSection
            → StakeLimitsSection
```

## Usage

```tsx
import { SettingsContainer } from '@/features/settings';

// In a page component
<SettingsContainer />
```

## Settings Fields

| Field | Type | Description |
|-------|------|-------------|
| `RISK_APPETITE` | number | 1-5 scale for risk tolerance |
| `BANKROLL_PERCENT` | number | % of balance to use for betting |
| `MAX_BANKROLL` | number | Maximum amount even if balance is higher |
| `USE_RELIABLE_TEAMS` | boolean | Only bet on top-tier teams |
| `MIN_STAKE` | number | Minimum stake per bet (Betfair requirement) |
| `MIN_PROFIT` | number | Minimum profit per bet |
