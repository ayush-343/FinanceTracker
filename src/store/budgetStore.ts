import { create } from 'zustand';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { 
  getCategories, 
  getCategoriesWithSpending, 
  getTotalSpending,
  getDailySpending,
  getTransactions,
  getTransactionsByDate,
  createCategory as dbCreateCategory,
  updateCategory as dbUpdateCategory,
  deleteCategory as dbDeleteCategory,
  createTransaction as dbCreateTransaction,
  updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction,
  getSubcategories as dbGetSubcategories,
  createSubcategory as dbCreateSubcategory,
  updateSubcategory as dbUpdateSubcategory,
  deleteSubcategory as dbDeleteSubcategory,
} from '../database';
import { Category, CategoryWithSpending, TransactionWithDetails, Timeframe, Subcategory } from '../types';

interface BudgetState {
  // State
  isLoading: boolean;
  categories: Category[];
  categoriesWithSpending: CategoryWithSpending[];
  transactions: TransactionWithDetails[];
  totalSpending: number;
  totalBudget: number;
  dailySpending: { date: string; total: number }[];
  currentDate: Date;
  selectedTimeframe: Timeframe;
  
  // Computed date ranges
  dateRange: { start: string; end: string };
  
  // Actions
  loadCategories: () => Promise<void>;
  loadSpendingData: () => Promise<void>;
  loadTransactions: (startDate?: string, endDate?: string) => Promise<void>;
  loadTransactionsByDate: (date: string) => Promise<TransactionWithDetails[]>;
  
  // Category CRUD
  addCategory: (category: Omit<Category, 'id'>) => Promise<number>;
  editCategory: (id: number, category: Partial<Omit<Category, 'id'>>) => Promise<void>;
  removeCategory: (id: number) => Promise<void>;
  
  // Subcategory CRUD
  getSubcategories: (categoryId: number) => Promise<Subcategory[]>;
  addSubcategory: (subcategory: Omit<Subcategory, 'id'>) => Promise<number>;
  editSubcategory: (id: number, subcategory: Partial<Omit<Subcategory, 'id'>>) => Promise<void>;
  removeSubcategory: (id: number) => Promise<void>;
  
  // Transaction CRUD
  addTransaction: (transaction: { category_id: number; subcategory_id?: number; item_id?: number; amount: number; date: string; notes?: string }) => Promise<number>;
  editTransaction: (id: number, transaction: Partial<{ amount: number; date: string; notes: string }>) => Promise<void>;
  removeTransaction: (id: number) => Promise<void>;
  
  // Navigation
  setCurrentDate: (date: Date) => void;
  setSelectedTimeframe: (timeframe: Timeframe) => void;
  refreshData: () => Promise<void>;
}

const getDateRange = (date: Date, timeframe: Timeframe): { start: string; end: string } => {
  const dateFormat = 'yyyy-MM-dd';
  
  switch (timeframe) {
    case 'daily':
      const dayStr = format(date, dateFormat);
      return { start: dayStr, end: dayStr };
    case 'weekly':
      return {
        start: format(startOfWeek(date, { weekStartsOn: 1 }), dateFormat),
        end: format(endOfWeek(date, { weekStartsOn: 1 }), dateFormat),
      };
    case 'monthly':
      return {
        start: format(startOfMonth(date), dateFormat),
        end: format(endOfMonth(date), dateFormat),
      };
    case 'annually':
      return {
        start: format(startOfYear(date), dateFormat),
        end: format(endOfYear(date), dateFormat),
      };
  }
};

export const useBudgetStore = create<BudgetState>((set, get) => ({
  // Initial state
  isLoading: true,
  categories: [],
  categoriesWithSpending: [],
  transactions: [],
  totalSpending: 0,
  totalBudget: 0,
  dailySpending: [],
  currentDate: new Date(),
  selectedTimeframe: 'monthly',
  dateRange: getDateRange(new Date(), 'monthly'),

  // Load categories
  loadCategories: async () => {
    try {
      const categories = await getCategories();
      const totalBudget = categories.reduce((sum, cat) => sum + cat.budget_limit, 0);
      set({ categories, totalBudget });
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  },

  // Load spending data with current date range
  loadSpendingData: async () => {
    try {
      set({ isLoading: true });
      const { currentDate, selectedTimeframe } = get();
      const dateRange = getDateRange(currentDate, selectedTimeframe);
      
      const [categoriesWithSpending, totalSpending, dailySpending] = await Promise.all([
        getCategoriesWithSpending(dateRange.start, dateRange.end),
        getTotalSpending(dateRange.start, dateRange.end),
        getDailySpending(dateRange.start, dateRange.end),
      ]);

      const totalBudget = categoriesWithSpending.reduce((sum, cat) => sum + cat.budget_limit, 0);
      
      set({ 
        categoriesWithSpending, 
        totalSpending, 
        totalBudget,
        dailySpending,
        dateRange,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load spending data:', error);
      set({ isLoading: false });
    }
  },

  // Load transactions for date range
  loadTransactions: async (startDate?: string, endDate?: string) => {
    try {
      const { dateRange } = get();
      const start = startDate || dateRange.start;
      const end = endDate || dateRange.end;
      const transactions = await getTransactions(start, end);
      set({ transactions });
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  },

  // Load transactions for specific date
  loadTransactionsByDate: async (date: string) => {
    try {
      return await getTransactionsByDate(date);
    } catch (error) {
      console.error('Failed to load transactions by date:', error);
      return [];
    }
  },

  // Category CRUD
  addCategory: async (category) => {
    const id = await dbCreateCategory(category);
    await get().loadCategories();
    await get().loadSpendingData();
    return id;
  },

  editCategory: async (id, category) => {
    await dbUpdateCategory(id, category);
    await get().loadCategories();
    await get().loadSpendingData();
  },

  removeCategory: async (id) => {
    await dbDeleteCategory(id);
    await get().loadCategories();
    await get().loadSpendingData();
  },

  // Subcategory CRUD
  getSubcategories: async (categoryId) => {
    return await dbGetSubcategories(categoryId);
  },

  addSubcategory: async (subcategory) => {
    return await dbCreateSubcategory(subcategory);
  },

  editSubcategory: async (id, subcategory) => {
    await dbUpdateSubcategory(id, subcategory);
  },

  removeSubcategory: async (id) => {
    await dbDeleteSubcategory(id);
  },

  // Transaction CRUD
  addTransaction: async (transaction) => {
    const id = await dbCreateTransaction({
      ...transaction,
      item_id: transaction.item_id || null,
      subcategory_id: transaction.subcategory_id || null,
      notes: transaction.notes || '',
    });
    await get().loadSpendingData();
    return id;
  },

  editTransaction: async (id, transaction) => {
    await dbUpdateTransaction(id, transaction);
    await get().loadSpendingData();
  },

  removeTransaction: async (id) => {
    await dbDeleteTransaction(id);
    await get().loadSpendingData();
  },

  // Navigation
  setCurrentDate: (date) => {
    const { selectedTimeframe } = get();
    const dateRange = getDateRange(date, selectedTimeframe);
    set({ currentDate: date, dateRange });
  },

  setSelectedTimeframe: (timeframe) => {
    const { currentDate } = get();
    const dateRange = getDateRange(currentDate, timeframe);
    set({ selectedTimeframe: timeframe, dateRange });
  },

  // Refresh all data
  refreshData: async () => {
    await Promise.all([
      get().loadCategories(),
      get().loadSpendingData(),
    ]);
  },
}));
