import { useState, useCallback, useEffect, useRef } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSettingsStore } from '../store';
import { AppState, AppStateStatus } from 'react-native';

export interface BiometricAuth {
  isAvailable: boolean;
  biometricType: 'fingerprint' | 'faceid' | 'iris' | 'none';
  isAuthenticated: boolean;
  isAuthenticating: boolean;
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
  const appStateRef = useRef(AppState.currentState);
  const isAuthenticatingRef = useRef(false);
  const hasInitialAuthRun = useRef(false);

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
    hasInitialAuthRun.current = false;
  }, []);

  // Handle app state changes for re-authentication
  useEffect(() => {
    if (!isBiometricEnabled) {
      setIsAuthenticated(true);
      return;
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      // Only trigger re-auth when coming from background to active
      if (
        previousState === 'background' &&
        nextAppState === 'active' &&
        !isAuthenticatingRef.current
      ) {
        setIsAuthenticated(false);
        // Small delay to ensure UI is ready
        setTimeout(() => {
          authenticate();
        }, 100);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isBiometricEnabled, authenticate]);

  // Initial authentication - runs only once on mount
  useEffect(() => {
    if (isBiometricEnabled && !hasInitialAuthRun.current) {
      hasInitialAuthRun.current = true;
      authenticate();
    }
  }, [isBiometricEnabled, authenticate]);

  return {
    isAvailable,
    biometricType,
    isAuthenticated,
    isAuthenticating,
    authenticate,
    checkAvailability,
    resetAuth,
  };
};
