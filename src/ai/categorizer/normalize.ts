const NOISE_WORDS = new Set(['order', 'pvt', 'private', 'ltd', 'limited', 'inc', 'llc', 'store', 'online', 'india']);

/** Turns a merchant/note/item string into a stable lookup key. */
export const normalizeKey = (text: string): string =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/#\s*\w*\d\w*/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t && !/^\p{N}+$/u.test(t) && !NOISE_WORDS.has(t))
    .join(' ');

export const tokens = (key: string): Set<string> => new Set(key.split(' ').filter(Boolean));
