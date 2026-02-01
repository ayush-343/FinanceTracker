import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScannedItem } from '../services/receiptService';

export interface PendingScannedItem extends ScannedItem {
    id: string; // Unique ID for tracking
}

interface ScanState {
    // State
    pendingItems: PendingScannedItem[];
    receiptDate: string;
    hydrated: boolean;

    // Actions
    addPendingItems: (items: ScannedItem[], date: string) => void;
    removeItem: (itemId: string) => void;
    clearAll: () => void;
    setReceiptDate: (date: string) => void;
    setHydrated: (value: boolean) => void;

    // Computed
    pendingCount: () => number;
    getCurrentItem: () => PendingScannedItem | null;
}

/**
 * Generate a unique ID for scanned items
 */
const generateItemId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const useScanStore = create<ScanState>()(
    persist(
        (set, get) => ({
            // Initial state
            pendingItems: [],
            receiptDate: new Date().toISOString().split('T')[0],
            hydrated: false,

            // Add new pending items from a scan
            addPendingItems: (items: ScannedItem[], date: string) => {
                const pendingItems: PendingScannedItem[] = items.map((item) => ({
                    ...item,
                    id: generateItemId(),
                }));

                set({
                    pendingItems,
                    receiptDate: date,
                });
            },

            // Remove a single item (after adding or skipping)
            removeItem: (itemId: string) => {
                set((state) => ({
                    pendingItems: state.pendingItems.filter((item) => item.id !== itemId),
                }));
            },

            // Clear all pending items
            clearAll: () => {
                set({
                    pendingItems: [],
                    receiptDate: new Date().toISOString().split('T')[0],
                });
            },

            // Update the receipt date
            setReceiptDate: (date: string) => {
                set({ receiptDate: date });
            },

            // Mark store as hydrated (loaded from storage)
            setHydrated: (value: boolean) => {
                set({ hydrated: value });
            },

            // Get count of pending items
            pendingCount: () => get().pendingItems.length,

            // Get the current item to review (first in queue)
            getCurrentItem: () => {
                const items = get().pendingItems;
                return items.length > 0 ? items[0] : null;
            },
        }),
        {
            name: 'scan-store',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                pendingItems: state.pendingItems,
                receiptDate: state.receiptDate,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHydrated(true);
            },
        }
    )
);
