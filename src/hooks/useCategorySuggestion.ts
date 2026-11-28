import { useEffect, useState } from 'react';
import { getCategories, loadCategoryMemory, loadKnownItems } from '../database';
import { KnownItem, MemoryRow, Suggestion, suggestCategory } from '../ai/categorizer';

const DEBOUNCE_MS = 150;

interface SuggestionData {
  memory: MemoryRow[];
  items: KnownItem[];
  validIds: Set<number>;
}

/** Suggests a category for the given text from the user's own history. Loads fresh data on mount. */
export const useCategorySuggestion = (text: string): Suggestion | null => {
  const [data, setData] = useState<SuggestionData | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadCategoryMemory(), loadKnownItems(), getCategories()])
      .then(([memory, items, categories]) => {
        if (!cancelled) setData({ memory, items, validIds: new Set(categories.map((c) => c.id)) });
      })
      .catch((error) => console.warn('[useCategorySuggestion] load failed:', error));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => setSuggestion(suggestCategory(text, data.memory, data.items, data.validIds)), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, data]);

  return suggestion;
};
