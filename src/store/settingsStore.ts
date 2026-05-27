import { create } from 'zustand';
import { getSettings, resetAllData, updateSettings } from '../database';
import { AppSettings, BudgetPeriod } from '../types';
import * as SecureStore from 'expo-secure-store';

const GEMINI_API_KEY_STORE = 'gemini_api_key';

interface SettingsState {
  // State
  isLoading: boolean;
  isBiometricEnabled: boolean;
  darkMode: boolean | null;
  currency: string;
  budgetPeriod: BudgetPeriod;
  isOnboardingCompleted: boolean;
  geminiApiKey: string | null;
  
  // Actions
  loadSettings: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setDarkMode: (mode: boolean | null) => Promise<void>;
  setCurrency: (code: string) => Promise<void>;
  setBudgetPeriod: (period: BudgetPeriod) => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  setGeminiApiKey: (key: string | null) => Promise<void>;
  resetAppData: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Initial state
  isLoading: true,
  isBiometricEnabled: false,
  darkMode: null,
  currency: 'USD',
  budgetPeriod: 'monthly',
  isOnboardingCompleted: false,
  geminiApiKey: null,

  // Load settings from database
  loadSettings: async () => {
    try {
      set({ isLoading: true });
      const settings = await getSettings();
      let geminiKey = null;
      try {
        geminiKey = await SecureStore.getItemAsync(GEMINI_API_KEY_STORE);
      } catch (e) {
        console.error('Failed to load API key', e);
      }
      
      if (settings) {
        set({
          isBiometricEnabled: settings.biometric_enabled,
          darkMode: settings.dark_mode,
          currency: settings.currency_code,
          budgetPeriod: settings.budget_period,
          isOnboardingCompleted: settings.onboarding_completed,
          geminiApiKey: geminiKey,
          isLoading: false,
        });
      } else {
        set({ geminiApiKey: geminiKey, isLoading: false });
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

  // Save Gemini API key
  setGeminiApiKey: async (key: string | null) => {
    try {
      if (key) {
        await SecureStore.setItemAsync(GEMINI_API_KEY_STORE, key);
      } else {
        await SecureStore.deleteItemAsync(GEMINI_API_KEY_STORE);
      }
      set({ geminiApiKey: key });
    } catch (error) {
      console.error('Failed to save API key:', error);
      throw error;
    }
  },

  // Reset app data and settings
  resetAppData: async () => {
    try {
      await resetAllData();
      try {
        await SecureStore.deleteItemAsync(GEMINI_API_KEY_STORE);
      } catch (e) {
        console.error('Failed to clear API key on reset', e);
      }
      set({
        isBiometricEnabled: false,
        darkMode: null,
        currency: 'USD',
        budgetPeriod: 'monthly',
        isOnboardingCompleted: false,
        geminiApiKey: null,
      });
    } catch (error) {
      console.error('Failed to reset app data:', error);
    }
  },
}));
