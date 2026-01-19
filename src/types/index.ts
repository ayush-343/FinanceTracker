// App Settings
export interface AppSettings {
  id: number;
  biometric_enabled: boolean;
  dark_mode: boolean | null;
  currency_code: string;
  budget_period: 'weekly' | 'monthly';
  onboarding_completed: boolean;
}

// Budget
export interface Budget {
  id: number;
  period_type: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  total_limit: number;
}

// Category
export interface Category {
  id: number;
  name: string;
  color: string;
  icon_name: string;
  budget_limit: number;
}

// Subcategory
export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  budget_limit?: number;
}

// Item
export interface Item {
  id: number;
  subcategory_id: number;
  name: string;
  default_price: number;
}

// Transaction
export interface Transaction {
  id: number;
  item_id: number | null;
  category_id: number;
  subcategory_id: number | null;
  amount: number;
  date: string;
  notes: string;
  created_at: string;
}

// Subscription
export interface Subscription {
  id: number;
  name: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  category_id: number;
  is_active: boolean;
}

// Subscription Skip
export interface SubscriptionSkip {
  id: number;
  subscription_id: number;
  skip_date: string;
}

// Timeframe types
export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'annually';
export type BudgetPeriod = 'weekly' | 'monthly';
export type SubscriptionFrequency = 'daily' | 'weekly' | 'monthly';

// Category with spending data
export interface CategoryWithSpending extends Category {
  spent: number;
  percentage: number;
}

// Transaction with related data
export interface TransactionWithDetails extends Transaction {
  category_name: string;
  category_color: string;
  category_icon: string;
  subcategory_name?: string;
  item_name?: string;
}

// Subscription with category info
export interface SubscriptionWithCategory extends Subscription {
  category_name: string;
  category_color: string;
  category_icon: string;
}

// Chart data types
export interface ChartDataPoint {
  value: number;
  label: string;
  frontColor?: string;
}

export interface PieChartDataPoint {
  value: number;
  color: string;
  text: string;
}

// Navigation types
export type OnboardingStackParamList = {
  Welcome: undefined;
  CurrencySetup: undefined;
  BiometricSetup: undefined;
  CategorySetup: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Analytics: undefined;
  Subscriptions: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Category: { categoryId: number; categoryName: string };
  Subcategory: { subcategoryId: number; subcategoryName: string };
  Items: { subcategoryId?: number; categoryId: number; title: string };
  AddTransaction: { categoryId?: number; subcategoryId?: number };
  EditTransaction: { transactionId: number };
  AddCategory: undefined;
  EditCategory: { categoryId: number };
  AddSubcategory: { categoryId: number };
  AddSubscription: undefined;
  EditSubscription: { subscriptionId: number };
};
