import { format, subDays, subYears, isAfter } from 'date-fns';

export interface PreParsed {
  amount: number | null;
  date: string; // yyyy-MM-dd
  dateFound: boolean; // true when the text contained a date phrase
  merchant: string | null;
  item: string | null;
  amountsInText: number[];
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';
const FILLERS = new Set(['for', 'on', 'spent', 'paid', 'bought', 'a', 'an', 'the', 'and', 'of']);

const AMOUNT_RE = /(?:₹|\brs\.?|\binr|\$|\busd)?\s*(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.(\d+))?\s*(k)?\b/gi;

const isoDay = (d: Date) => format(d, 'yyyy-MM-dd');

/** Resolves a date phrase, returning the date and the text with that phrase removed. */
const extractDate = (text: string, today: Date): { date: string; rest: string; found?: boolean } => {
  const lower = text.toLowerCase();
  const fixed: [RegExp, number][] = [
    [/\bday before yesterday\b/, 2],
    [/\byesterday\b/, 1],
    [/\btoday\b/, 0],
  ];
  for (const [re, back] of fixed) {
    const m = lower.match(re);
    if (m && m.index !== undefined) return { date: isoDay(subDays(today, back)), rest: cut(text, m.index, m[0].length) };
  }

  const last = lower.match(new RegExp(`\\blast (${WEEKDAYS.join('|')})\\b`));
  if (last && last.index !== undefined) {
    const target = WEEKDAYS.indexOf(last[1]);
    const back = (today.getDay() - target + 7) % 7 || 7;
    return { date: isoDay(subDays(today, back)), rest: cut(text, last.index, last[0].length) };
  }

  const dayMonth = lower.match(new RegExp(`\\b(?:on\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE}\\b`));
  const monthDay = lower.match(new RegExp(`\\b(?:on\\s+)?${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`));
  const m = dayMonth ?? monthDay;
  if (m && m.index !== undefined) {
    const day = Number(dayMonth ? m[1] : m[2]);
    const month = MONTHS.indexOf((dayMonth ? m[2] : m[1]).slice(0, 3));
    let d = new Date(today.getFullYear(), month, day);
    if (isAfter(d, today)) d = subYears(d, 1);
    return { date: isoDay(d), rest: cut(text, m.index, m[0].length) };
  }

  return { date: isoDay(today), rest: text, found: false };
};

const cut = (text: string, index: number, length: number) => `${text.slice(0, index)} ${text.slice(index + length)}`;

/** Deterministic parse of a one-line purchase. Always runs, with or without a language model. */
export const preParse = (text: string, today: Date): PreParsed => {
  const { date, rest: afterDate, found } = extractDate(text, today);

  const amountsInText: number[] = [];
  const afterAmount = afterDate.replace(AMOUNT_RE, (_match, whole: string, decimals?: string, k?: string) => {
    let value = Number(`${whole.replace(/,/g, '')}${decimals ? `.${decimals}` : ''}`);
    if (k) value *= 1000;
    amountsInText.push(value);
    return ' ';
  });

  let merchant: string | null = null;
  let itemPart = afterAmount;
  const at = afterAmount.match(/(?:^|\s)(?:at|from|@)\s*(.+)$/i);
  if (at && at.index !== undefined) {
    merchant = at[1].trim().replace(/\s+/g, ' ') || null;
    itemPart = afterAmount.slice(0, at.index);
  }

  const item = itemPart
    .split(/\s+/)
    .filter((w) => w && !FILLERS.has(w.toLowerCase()))
    .join(' ');

  return { amount: amountsInText[0] ?? null, date, dateFound: found !== false, merchant, item: item || null, amountsInText };
};
