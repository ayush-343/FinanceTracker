import { useState, useCallback, useEffect, useRef } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSettingsStore } from '../store';
import { AppState, AppStateStatus } from 'react-native';

export interface BiometricAuth {
  isAvailable: boolean;
  biometricType: 'fingerprint' | 'faceid' | 'iris' | 'none';
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  isLocked: boolean;
  authenticate: () => Promise<boolean>;
  checkAvailability: () => Promise<void>;
  resetAuth: () => void;
}

export const useBiometricAuth = (): BiometricAuth => {
  const { isBiometricEnabled } = useSettingsStore();
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'faceid' | 'iris' | 'none'>('none');
  const [isAuthenticated, setIsAuthenticated] = useState(!isBiometricEnabled);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const appStateRef = useRef(AppState.currentState);
  const isAuthenticatingRef = useRef(false);
  const hasInitialAuthRun = useRef(false);
  // Tracks whether the app actually went to background (not just app switcher peek)
  const wentToBackgroundRef = useRef(false);

  const checkAvailability = useCallback(async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();

      setIsAvailable(compatible && enrolled);

      if (compatible && enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('faceid');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType('iris');
        }
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setIsAvailable(false);
    }
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    // Prevent multiple simultaneous auth attempts
    if (isAuthenticatingRef.current) {
      return false;
    }

    isAuthenticatingRef.current = true;
    setIsAuthenticating(true);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Finance Tracker',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });

      setIsAuthenticated(result.success);

      if (result.success) {
        setIsLocked(false);
      }

      if (!result.success && result.error) {
        console.log('Authentication failed:', result.error);
      }

      return result.success;
    } catch (error) {
      console.error('Authentication error:', error);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsAuthenticating(false);
      isAuthenticatingRef.current = false;
    }
  }, []);

  // Check availability on mount
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Reset authentication state
  const resetAuth = useCallback(() => {
    setIsAuthenticated(false);
    setIsLocked(true);
    hasInitialAuthRun.current = false;
  }, []);

  // Handle app state changes — WhatsApp-style behavior
  useEffect(() => {
    if (!isBiometricEnabled) {
      setIsAuthenticated(true);
      setIsLocked(false);
      return;
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      // active → inactive: User opened app switcher — show privacy overlay instantly
      if (previousState === 'active' && nextAppState === 'inactive') {
        setIsLocked(true);
        wentToBackgroundRef.current = false;
      }

      // inactive → background: User actually switched away / minimized
      if (previousState === 'inactive' && nextAppState === 'background') {
        wentToBackgroundRef.current = true;
      }

      // Coming back to active
      if (nextAppState === 'active') {
        if (wentToBackgroundRef.current) {
          // Came from actual background — require re-authentication
          wentToBackgroundRef.current = false;
          setIsAuthenticated(false);
          setIsLocked(true);
          // Auto-prompt biometrics after a short delay to avoid system_cancel
          setTimeout(() => {
            if (!isAuthenticatingRef.current) {
              authenticate();
            }
          }, 300);
        } else if (previousState === 'inactive') {
          // Just peeked at app switcher — remove overlay, no auth needed
          setIsLocked(false);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isBiometricEnabled, authenticate]);

  // Initial authentication — show lock on first load
  useEffect(() => {
    if (isBiometricEnabled && !hasInitialAuthRun.current) {
      hasInitialAuthRun.current = true;
      setIsAuthenticated(false);
      setIsLocked(true);
    }
  }, [isBiometricEnabled]);

  return {
    isAvailable,
    biometricType,
    isAuthenticated,
    isAuthenticating,
    isLocked,
    authenticate,
    checkAvailability,
    resetAuth,
  };
};
