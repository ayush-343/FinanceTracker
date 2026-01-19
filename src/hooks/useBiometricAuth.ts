import { useState, useCallback, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSettingsStore } from '../store';
import { Alert, AppState, AppStateStatus } from 'react-native';

export interface BiometricAuth {
  isAvailable: boolean;
  biometricType: 'fingerprint' | 'faceid' | 'iris' | 'none';
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authenticate: () => Promise<boolean>;
  checkAvailability: () => Promise<void>;
}

export const useBiometricAuth = (): BiometricAuth => {
  const { isBiometricEnabled } = useSettingsStore();
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'faceid' | 'iris' | 'none'>('none');
  const [isAuthenticated, setIsAuthenticated] = useState(!isBiometricEnabled);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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
    if (!isAvailable) {
      setIsAuthenticated(true);
      return true;
    }

    setIsAuthenticating(true);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Finance Tracker',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });

      setIsAuthenticated(result.success);
      setIsAuthenticating(false);
      
      if (!result.success && result.error) {
        console.log('Authentication failed:', result.error);
      }

      return result.success;
    } catch (error) {
      console.error('Authentication error:', error);
      setIsAuthenticating(false);
      setIsAuthenticated(false);
      return false;
    }
  }, [isAvailable]);

  // Check availability on mount
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Handle app state changes for re-authentication
  useEffect(() => {
    if (!isBiometricEnabled) {
      setIsAuthenticated(true);
      return;
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && !isAuthenticated) {
        authenticate();
      } else if (nextAppState === 'background') {
        // Lock when going to background
        setIsAuthenticated(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isBiometricEnabled, isAuthenticated, authenticate]);

  return {
    isAvailable,
    biometricType,
    isAuthenticated,
    isAuthenticating,
    authenticate,
    checkAvailability,
  };
};
