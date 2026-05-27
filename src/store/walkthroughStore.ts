import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WALKTHROUGH_KEY = '@walkthrough_completed';
const TOTAL_STEPS = 14;

interface WalkthroughState {
  // State
  isWalkthroughCompleted: boolean;
  isWalkthroughActive: boolean;
  currentStep: number;
  totalSteps: number;

  // Async persistence
  loadWalkthroughStatus: () => Promise<void>;

  // Navigation
  startWalkthrough: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;

  // Completion
  skipWalkthrough: () => Promise<void>;
  completeWalkthrough: () => Promise<void>;
  resetWalkthrough: () => Promise<void>;
}

export const useWalkthroughStore = create<WalkthroughState>((set, get) => ({
  // Initial state
  isWalkthroughCompleted: false,
  isWalkthroughActive: false,
  currentStep: 0,
  totalSteps: TOTAL_STEPS,

  // Load persisted completion status
  loadWalkthroughStatus: async () => {
    try {
      const value = await AsyncStorage.getItem(WALKTHROUGH_KEY);
      if (value === 'true') {
        set({ isWalkthroughCompleted: true });
      }
    } catch (error) {
      console.error('[Walkthrough] Failed to load status:', error);
    }
  },

  // Start the walkthrough
  startWalkthrough: () => {
    set({
      isWalkthroughActive: true,
      currentStep: 0,
    });
  },

  // Navigate to next step
  nextStep: () => {
    const { currentStep, totalSteps } = get();
    if (currentStep < totalSteps - 1) {
      set({ currentStep: currentStep + 1 });
    } else {
      // Last step — complete the walkthrough
      get().completeWalkthrough();
    }
  },

  // Navigate to previous step
  previousStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  // Jump to a specific step
  goToStep: (step: number) => {
    const { totalSteps } = get();
    if (step >= 0 && step < totalSteps) {
      set({ currentStep: step });
    }
  },

  // Skip the walkthrough
  skipWalkthrough: async () => {
    try {
      await AsyncStorage.setItem(WALKTHROUGH_KEY, 'true');
      set({
        isWalkthroughCompleted: true,
        isWalkthroughActive: false,
        currentStep: 0,
      });
    } catch (error) {
      console.error('[Walkthrough] Failed to save skip status:', error);
    }
  },

  // Complete the walkthrough
  completeWalkthrough: async () => {
    try {
      await AsyncStorage.setItem(WALKTHROUGH_KEY, 'true');
      set({
        isWalkthroughCompleted: true,
        isWalkthroughActive: false,
        currentStep: 0,
      });
    } catch (error) {
      console.error('[Walkthrough] Failed to save completion status:', error);
    }
  },

  // Reset for replay
  resetWalkthrough: async () => {
    try {
      await AsyncStorage.setItem(WALKTHROUGH_KEY, 'false');
      set({
        isWalkthroughCompleted: false,
        isWalkthroughActive: false,
        currentStep: 0,
      });
    } catch (error) {
      console.error('[Walkthrough] Failed to reset status:', error);
    }
  },
}));
