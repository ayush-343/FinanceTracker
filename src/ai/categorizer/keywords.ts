/** Starter guesses for merchants the app hasn't learned yet. Each group names the words in a category name it fits. */
const GROUPS: { words: string[]; categoryHints: string[] }[] = [
  { words: ['uber', 'ola', 'rapido', 'metro', 'cab', 'taxi', 'auto', 'petrol', 'fuel', 'parking', 'bus', 'train'], categoryHints: ['transport', 'travel', 'commute'] },
  { words: ['coffee', 'chai', 'tea', 'swiggy', 'zomato', 'lunch', 'dinner', 'breakfast', 'restaurant', 'cafe', 'pizza', 'snack'], categoryHints: ['food', 'dining', 'eat'] },
  { words: ['dmart', 'bigbasket', 'zepto', 'blinkit', 'instamart', 'grocery', 'groceries', 'milk', 'vegetables', 'fruits'], categoryHints: ['grocer'] },
  { words: ['amazon', 'myntra', 'flipkart', 'ajio', 'nykaa', 'clothes', 'shoes'], categoryHints: ['shop'] },
  { words: ['movie', 'pvr', 'inox', 'bookmyshow', 'netflix', 'spotify', 'concert', 'game'], categoryHints: ['fun', 'entertain', 'leisure'] },
  { words: ['rent', 'electricity', 'bill', 'wifi', 'broadband', 'recharge', 'water', 'gas'], categoryHints: ['rent', 'bill', 'utilit'] },
];

/** Returns the category a common word points to, or null. Used only when nothing has been learned yet. */
export const keywordCategory = (text: string, categories: { id: number; name: string }[]): number | null => {
  const words = new Set(text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
  for (const g of GROUPS) {
    if (!g.words.some((w) => words.has(w))) continue;
    const cat = categories.find((c) => g.categoryHints.some((h) => c.name.toLowerCase().includes(h)));
    if (cat) return cat.id;
  }
  return null;
};
