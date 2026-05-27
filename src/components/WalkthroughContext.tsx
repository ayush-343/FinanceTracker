import React, { createContext, useContext, useCallback, useRef } from 'react';
import { LayoutRectangle, View } from 'react-native';

interface WalkthroughContextType {
  // Tab navigation callback — set by TabsLayout
  navigateToTab: (tabName: string) => void;
  setNavigateToTab: (fn: (tabName: string) => void) => void;

  // Ref registry for spotlight positioning (measured on-demand for fresh values)
  registerRef: (key: string, ref: React.RefObject<View | null>) => void;
  measureRef: (key: string) => Promise<LayoutRectangle | null>;
}

const WalkthroughContext = createContext<WalkthroughContextType | null>(null);

export const WalkthroughProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const refs = useRef<Map<string, React.RefObject<View | null>>>(new Map());
  const navigateToTabRef = useRef<(tabName: string) => void>(() => {});

  const navigateToTab = useCallback((tabName: string) => {
    navigateToTabRef.current(tabName);
  }, []);

  const setNavigateToTab = useCallback((fn: (tabName: string) => void) => {
    navigateToTabRef.current = fn;
  }, []);

  const registerRef = useCallback((key: string, ref: React.RefObject<View | null>) => {
    refs.current.set(key, ref);
  }, []);

  // Measure a registered ref on-demand — always returns fresh absolute coordinates
  const measureRef = useCallback((key: string): Promise<LayoutRectangle | null> => {
    return new Promise((resolve) => {
      const ref = refs.current.get(key);
      if (!ref?.current) {
        resolve(null);
        return;
      }
      ref.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          resolve({ x, y, width, height });
        } else {
          resolve(null);
        }
      });
    });
  }, []);

  return (
    <WalkthroughContext.Provider
      value={{
        navigateToTab,
        setNavigateToTab,
        registerRef,
        measureRef,
      }}
    >
      {children}
    </WalkthroughContext.Provider>
  );
};

export const useWalkthroughContext = (): WalkthroughContextType => {
  const context = useContext(WalkthroughContext);
  if (!context) {
    throw new Error('useWalkthroughContext must be used within a WalkthroughProvider');
  }
  return context;
};
