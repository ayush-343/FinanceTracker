# Finance Tracker

A comprehensive personal finance and budget tracking app built with React Native and Expo for iOS. Track your spending, manage budgets across categories, monitor subscriptions, and gain insights into your financial habits.

![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-black)
![Platform](https://img.shields.io/badge/Platform-iOS-lightgrey)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 📊 Budget Management

- **Category-based Budgets** - Create and manage spending categories with custom budget limits
- **Nested Subcategories** - Organize spending with subcategories and individual items
- **Weekly/Monthly Tracking** - Switch between weekly and monthly budget periods
- **Real-time Progress** - Visual progress bars showing spending vs. budget

### 💰 Transaction Tracking

- **Quick Add Transactions** - Easily log expenses with category, amount, and notes
- **Item Names** - Track specific items for each transaction
- **Edit & Delete** - Full control over your transaction history
- **Date-based Filtering** - View transactions by date

### 📅 Calendar View

- **Visual Spending Calendar** - See daily spending at a glance
- **Monthly Navigation** - Browse through past months
- **Daily Breakdown** - Tap any day to see detailed transactions

### 📈 Analytics Dashboard

- **Spending Charts** - Beautiful visualizations of your spending patterns
- **Category Breakdown** - Pie charts showing spending by category
- **Trend Analysis** - Track spending trends over time

### 🔄 Subscription Management

- **Track Recurring Expenses** - Manage Netflix, Spotify, gym memberships, etc.
- **Billing Cycle Reminders** - Never miss a subscription payment
- **Monthly Cost Overview** - See total subscription costs

### ⚙️ Settings & Customization

- **Multiple Currencies** - Support for USD, EUR, GBP, INR, JPY, and more
- **Dark Mode** - Automatic dark/light theme based on system preference
- **Biometric Lock** - Secure your financial data with Face ID/Touch ID
- **PDF Export** - Generate detailed spending reports
- **Adjustable Budget** - Change total budget with proportional category updates

### 🔒 Security

- **Biometric Authentication** - Face ID and Touch ID support
- **Secure Storage** - Sensitive data stored securely
- **Local-first** - All data stored on device with SQLite

## 🛠️ Tech Stack

- **Framework:** React Native 0.81.5 with Expo SDK 54
- **Language:** TypeScript
- **Navigation:** React Navigation (Bottom Tabs + Native Stack)
- **State Management:** Zustand with persistence
- **Database:** Expo SQLite
- **Charts:** react-native-gifted-charts
- **Animations:** react-native-reanimated
- **Icons:** @expo/vector-icons (Feather)

## 📱 Screenshots

_Add screenshots of your app here_

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **Xcode** 15+ (for iOS development)
- **CocoaPods** (`sudo gem install cocoapods`)
- **iOS Device** or Simulator

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/Finance_Tracker.git
   cd Finance_Tracker
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Install iOS pods**
   ```bash
   cd ios && pod install && cd ..
   ```

### Running the App

#### On iOS Simulator

```bash
npx expo run:ios
```

#### On Physical iPhone

1. **Connect your iPhone** via USB cable

2. **Find your device ID**

   ```bash
   xcrun xctrace list devices
   ```

3. **Run on device**

   ```bash
   npx expo run:ios --device YOUR_DEVICE_ID
   ```

   Or open in Xcode:

   ```bash
   open ios/FinanceTracker.xcworkspace
   ```

   Then select your device and press ⌘R

#### First Time on Physical Device

If deploying to a physical device for the first time:

1. **Trust Developer Certificate on iPhone:**
   - Go to **Settings → General → VPN & Device Management**
   - Tap on your developer profile
   - Tap **Trust**

2. **Configure Signing in Xcode (if needed):**
   - Open `ios/FinanceTracker.xcworkspace` in Xcode
   - Select the FinanceTracker project
   - Go to **Signing & Capabilities**
   - Enable **"Automatically manage signing"**
   - Select your Apple ID team

## 📁 Project Structure

```
Finance_Tracker/
├── App.tsx                 # Main app component
├── index.ts               # Entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── BudgetCard.tsx
│   │   ├── CalendarDay.tsx
│   │   ├── CategoryCard.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── SubscriptionCard.tsx
│   │   └── TransactionItem.tsx
│   ├── constants/         # App constants
│   │   └── index.ts       # Currencies, categories, etc.
│   ├── database/          # SQLite database layer
│   │   ├── index.ts       # Database initialization
│   │   └── queries.ts     # CRUD operations
│   ├── hooks/             # Custom React hooks
│   │   ├── useBiometricAuth.ts
│   │   ├── useCurrency.ts
│   │   └── useHaptics.ts
│   ├── navigation/        # Navigation configuration
│   │   └── RootNavigator.tsx
│   ├── screens/           # App screens
│   │   ├── forms/         # Form screens
│   │   │   ├── AddCategoryScreen.tsx
│   │   │   ├── AddSubscriptionScreen.tsx
│   │   │   ├── AddTransactionScreen.tsx
│   │   │   ├── EditCategoryScreen.tsx
│   │   │   └── EditTransactionScreen.tsx
│   │   └── main/          # Main tab screens
│   │       ├── AnalyticsScreen.tsx
│   │       ├── CalendarScreen.tsx
│   │       ├── HomeScreen.tsx
│   │       ├── SettingsScreen.tsx
│   │       └── SubscriptionsScreen.tsx
│   ├── store/             # Zustand stores
│   │   ├── budgetStore.ts
│   │   └── settingsStore.ts
│   ├── theme/             # Theming
│   │   └── index.ts       # Colors, typography, spacing
│   ├── types/             # TypeScript types
│   │   └── index.ts
│   └── utils/             # Utility functions
│       └── index.ts       # Date helpers, formatters
├── assets/                # Images, icons, fonts
└── ios/                   # Native iOS project
```

## 🗄️ Database Schema

The app uses SQLite with the following tables:

- **categories** - Budget categories with limits and colors
- **subcategories** - Nested subcategories
- **items** - Individual trackable items
- **transactions** - All spending records
- **subscriptions** - Recurring payments
- **settings** - App preferences
- **daily_spending_cache** - Cached daily totals
- **monthly_spending_cache** - Cached monthly totals

## 🔧 Configuration

### Environment Variables

No environment variables required - all configuration is stored locally.

### Customizing Currencies

Edit `src/constants/index.ts` to add more currencies:

```typescript
export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  // Add more currencies here
];
```

### Customizing Categories

Default categories are defined in `src/constants/index.ts`:

```typescript
export const DEFAULT_CATEGORIES = [
  { name: "Food & Dining", icon: "coffee", color: "#FF6B6B" },
  { name: "Transportation", icon: "truck", color: "#4ECDC4" },
  // Add more categories here
];
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Expo](https://expo.dev/) - React Native development platform
- [React Navigation](https://reactnavigation.org/) - Navigation library
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [react-native-gifted-charts](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts) - Beautiful charts

---

**Built with ❤️ using React Native and Expo**
