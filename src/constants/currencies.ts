// Common currencies with symbols and locale info
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', locale: 'de-CH' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', locale: 'ko-KR' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', locale: 'es-MX' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', locale: 'ru-RU' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', locale: 'en-ZA' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', locale: 'zh-HK' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', locale: 'sv-SE' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', locale: 'nb-NO' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', locale: 'en-NZ' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]['code'];

// Get currency info by code
export const getCurrencyByCode = (code: string) => {
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
};

// Map locale to currency code (for auto-detection)
export const LOCALE_TO_CURRENCY: Record<string, string> = {
  'en-US': 'USD',
  'en-GB': 'GBP',
  'en-AU': 'AUD',
  'en-CA': 'CAD',
  'en-IN': 'INR',
  'en-NZ': 'NZD',
  'en-SG': 'SGD',
  'en-ZA': 'ZAR',
  'de-DE': 'EUR',
  'de-AT': 'EUR',
  'de-CH': 'CHF',
  'fr-FR': 'EUR',
  'fr-CA': 'CAD',
  'es-ES': 'EUR',
  'es-MX': 'MXN',
  'pt-BR': 'BRL',
  'pt-PT': 'EUR',
  'it-IT': 'EUR',
  'nl-NL': 'EUR',
  'ja-JP': 'JPY',
  'zh-CN': 'CNY',
  'zh-HK': 'HKD',
  'ko-KR': 'KRW',
  'ru-RU': 'RUB',
  'ar-AE': 'AED',
  'sv-SE': 'SEK',
  'nb-NO': 'NOK',
  'hi-IN': 'INR',
};
