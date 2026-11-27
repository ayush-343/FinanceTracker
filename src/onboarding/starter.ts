/** Starter categories offered at onboarding, with a suggested share of a monthly budget. */
export const STARTERS = [
  { key: 'food', name: 'Food & dining', icon: 'coffee', weight: 30 },
  { key: 'rent', name: 'Rent & bills', icon: 'home', weight: 25 },
  { key: 'groceries', name: 'Groceries', icon: 'shopping-cart', weight: 15 },
  { key: 'transport', name: 'Transport', icon: 'truck', weight: 12 },
  { key: 'shopping', name: 'Shopping', icon: 'shopping-bag', weight: 10 },
  { key: 'fun', name: 'Fun', icon: 'film', weight: 8 },
] as const;

/** Splits a total across the chosen starters by weight, in whole units; the last absorbs rounding so the sum is exact. */
export const starterSplit = (total: number, keys: string[]): { key: string; amount: number }[] => {
  const chosen = STARTERS.filter((s) => keys.includes(s.key));
  const weight = chosen.reduce((s, x) => s + x.weight, 0);
  if (!chosen.length) return [];
  const whole = Math.max(0, Math.round(total));
  let used = 0;
  return chosen.map((s, i) => {
    const amount = i === chosen.length - 1 ? whole - used : Math.round((whole * s.weight) / weight);
    used += amount;
    return { key: s.key, amount };
  });
};
