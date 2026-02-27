// Predefined icons from @expo/vector-icons (Feather icon set)
export const CATEGORY_ICONS = [
  { name: 'shopping-cart', label: 'Shopping' },
  { name: 'home', label: 'Home' },
  { name: 'truck', label: 'Transport' },
  { name: 'zap', label: 'Electricity' },
  { name: 'droplet', label: 'Water' },
  { name: 'tv', label: 'Entertainment' },
  { name: 'music', label: 'Music' },
  { name: 'wifi', label: 'Internet' },
  { name: 'credit-card', label: 'Finance' },
  { name: 'coffee', label: 'Cafe' },
  { name: 'scissors', label: 'Grooming' },
  { name: 'book', label: 'Education' },
  { name: 'heart', label: 'Health' },
  { name: 'gift', label: 'Gifts' },
  { name: 'briefcase', label: 'Work' },
  { name: 'phone', label: 'Phone' },
  { name: 'film', label: 'Movies' },
  { name: 'package', label: 'Deliveries' },
  { name: 'tool', label: 'Repairs' },
  { name: 'shield', label: 'Insurance' },
  { name: 'dollar-sign', label: 'Bills' },
  { name: 'users', label: 'Family' },
  { name: 'map-pin', label: 'Travel' },
  { name: 'activity', label: 'Fitness' },
] as const;

type CategoryIconName = typeof CATEGORY_ICONS[number]['name'];
