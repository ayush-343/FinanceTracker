import { create } from 'zustand';
import { getSettings, updateSettings } from '../database';
import { AppSettings, BudgetPeriod } from '../types';

interface SettingsState {
  // State
  isLoading: boolean;
  isBiometricEnabled: boolean;
  darkMode: boolean | null;
  currency: string;
  budgetPeriod: BudgetPeriod;
  isOnboardingCompleted: boolean;
  
  // Actions
  loadSettings: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setDarkMode: (mode: boolean | null) => Promise<void>;
  setCurrency: (code: string) => Promise<void>;
  setBudgetPeriod: (period: BudgetPeriod) => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Initial state
  isLoading: true,
  isBiometricEnabled: false,
  darkMode: null,
  currency: 'USD',
  budgetPeriod: 'monthly',
  isOnboardingCompleted: false,

  // Load settings from database
  loadSettings: async () => {
    try {
      set({ isLoading: true });
      const settings = await getSettings();
      if (settings) {
        set({
          isBiometricEnabled: settings.biometric_enabled,
          darkMode: settings.dark_mode,
          currency: settings.currency_code,
          budgetPeriod: settings.budget_period,
          isOnboardingCompleted: settings.onboarding_completed,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  // Update biometric setting
  setBiometricEnabled: async (enabled: boolean) => {
    try {
      await updateSettings({ biometric_enabled: enabled });
      set({ isBiometricEnabled: enabled });
    } catch (error) {
      console.error('Failed to update biometric setting:', error);
    }
  },

  // Update dark mode setting
  setDarkMode: async (mode: boolean | null) => {
    try {
      await updateSettings({ dark_mode: mode });
      set({ darkMode: mode });
    } catch (error) {
      console.error('Failed to update dark mode setting:', error);
    }
  },

  // Update currency code
  setCurrency: async (code: string) => {
    try {
      await updateSettings({ currency_code: code });
      set({ currency: code });
    } catch (error) {
      console.error('Failed to update currency code:', error);
    }
  },

  // Update budget period
  setBudgetPeriod: async (period: BudgetPeriod) => {
    try {
      await updateSettings({ budget_period: period });
      set({ budgetPeriod: period });
    } catch (error) {
      console.error('Failed to update budget period:', error);
    }
  },

  // Update onboarding completed status
  setOnboardingCompleted: async (completed: boolean) => {
    try {
      await updateSettings({ onboarding_completed: completed });
      set({ isOnboardingCompleted: completed });
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
    }
  },

  // Reset onboarding
  resetOnboarding: async () => {
    try {
      await updateSettings({ onboarding_completed: false });
      set({ isOnboardingCompleted: false });
    } catch (error) {
      console.error('Failed to reset onboarding:', error);
    }
  },
}));
