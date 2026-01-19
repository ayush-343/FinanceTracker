import { Timeframe } from '../types';

export const TIMEFRAMES: { key: Timeframe; label: string; shortLabel: string }[] = [
  { key: 'daily', label: 'Daily', shortLabel: 'Day' },
  { key: 'weekly', label: 'Weekly', shortLabel: 'Week' },
  { key: 'monthly', label: 'Monthly', shortLabel: 'Month' },
  { key: 'annually', label: 'Annually', shortLabel: 'Year' },
];

export const BUDGET_PERIODS = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
] as const;

export const SUBSCRIPTION_FREQUENCIES = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
] as const;
