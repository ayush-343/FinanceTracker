import { create } from 'zustand';
import { 
  getSubscriptions as dbGetSubscriptions,
  getSubscriptionById,
  createSubscription as dbCreateSubscription,
  updateSubscription as dbUpdateSubscription,
  deleteSubscription as dbDeleteSubscription,
  getSubscriptionSkips,
  addSubscriptionSkip as dbAddSkip,
  removeSubscriptionSkip as dbRemoveSkip,
  isSubscriptionSkipped,
  createTransaction,
} from '../database';
import { Subscription, SubscriptionSkip } from '../types';
import { format, addDays, addWeeks, addMonths, isAfter, isBefore, isEqual, parseISO } from 'date-fns';

interface SubscriptionState {
  // State
  isLoading: boolean;
  subscriptions: Subscription[];
  
  // Actions
  loadSubscriptions: () => Promise<void>;
  addSubscription: (subscription: Omit<Subscription, 'id' | 'is_active'>) => Promise<number>;
  editSubscription: (id: number, subscription: Partial<Omit<Subscription, 'id'>>) => Promise<void>;
  removeSubscription: (id: number) => Promise<void>;
  
  // Skip management
  skipSubscription: (subscriptionId: number, date: string) => Promise<void>;
  unskipSubscription: (subscriptionId: number, date: string) => Promise<void>;
  isSkipped: (subscriptionId: number, date: string) => Promise<boolean>;
  getSkips: (subscriptionId: number) => Promise<SubscriptionSkip[]>;
  
  // Process recurring subscriptions
  processRecurringForDate: (date: string) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  // Initial state
  isLoading: true,
  subscriptions: [],

  // Load all active subscriptions
  loadSubscriptions: async () => {
    try {
      set({ isLoading: true });
      const subscriptions = await dbGetSubscriptions();
      set({ subscriptions, isLoading: false });
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      set({ isLoading: false });
    }
  },

  // Add new subscription
  addSubscription: async (subscription) => {
    const id = await dbCreateSubscription(subscription);
    await get().loadSubscriptions();
    return id;
  },

  // Edit subscription
  editSubscription: async (id, subscription) => {
    await dbUpdateSubscription(id, subscription);
    await get().loadSubscriptions();
  },

  // Remove subscription (soft delete by setting is_active = 0)
  removeSubscription: async (id) => {
    await dbDeleteSubscription(id);
    await get().loadSubscriptions();
  },

  // Skip subscription for a specific date
  skipSubscription: async (subscriptionId, date) => {
    await dbAddSkip(subscriptionId, date);
  },

  // Unskip subscription for a specific date
  unskipSubscription: async (subscriptionId, date) => {
    await dbRemoveSkip(subscriptionId, date);
  },

  // Check if subscription is skipped for date
  isSkipped: async (subscriptionId, date) => {
    return await isSubscriptionSkipped(subscriptionId, date);
  },

  // Get all skips for a subscription
  getSkips: async (subscriptionId) => {
    return await getSubscriptionSkips(subscriptionId);
  },

  // Process recurring subscriptions for a specific date
  // This creates transactions for subscriptions that are due on this date
  processRecurringForDate: async (dateStr: string) => {
    const { subscriptions } = get();
    const targetDate = parseISO(dateStr);

    for (const sub of subscriptions) {
      if (!sub.is_active) continue;

      const startDate = parseISO(sub.start_date);
      
      // Check if subscription should trigger on this date
      let shouldTrigger = false;
      
      switch (sub.frequency) {
        case 'daily':
          // Triggers every day after start date
          shouldTrigger = !isBefore(targetDate, startDate);
          break;
          
        case 'weekly':
          // Triggers on same day of week as start date
          if (!isBefore(targetDate, startDate)) {
            const startDay = startDate.getDay();
            const targetDay = targetDate.getDay();
            shouldTrigger = startDay === targetDay;
          }
          break;
          
        case 'monthly':
          // Triggers on same day of month as start date
          if (!isBefore(targetDate, startDate)) {
            const startDayOfMonth = startDate.getDate();
            const targetDayOfMonth = targetDate.getDate();
            shouldTrigger = startDayOfMonth === targetDayOfMonth;
          }
          break;
      }

      if (shouldTrigger) {
        // Check if skipped
        const skipped = await isSubscriptionSkipped(sub.id, dateStr);
        if (!skipped) {
          // Create transaction for this subscription
          await createTransaction({
            category_id: sub.category_id,
            subcategory_id: null,
            item_id: null,
            amount: sub.amount,
            date: dateStr,
            notes: `Subscription: ${sub.name}`,
          });
        }
      }
    }
  },
}));
