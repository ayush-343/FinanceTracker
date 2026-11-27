import { useCallback } from 'react';
import { useSettingsStore } from '../store';
import { getCurrencyByCode } from '../constants';

interface CurrencyFormatter {
  format: (amount: number) => string;
  formatCompact: (amount: number) => string;
  /** Rounded to whole units, e.g. ₹4,093 — for estimates where decimals add false precision. */
  formatWhole: (amount: number) => string;
  symbol: string;
  code: string;
}

export const useCurrency = (): CurrencyFormatter => {
  const { currency: currencyCode } = useSettingsStore();
  const currency = getCurrencyByCode(currencyCode);

  const format = useCallback((amount: number): string => {
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency.symbol}${amount.toFixed(2)}`;
    }
  }, [currency]);

  const formatCompact = useCallback((amount: number): string => {
    try {
      if (amount >= 1000000) {
        return new Intl.NumberFormat(currency.locale, {
          style: 'currency',
          currency: currency.code,
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(amount);
      }
      if (amount >= 1000) {
        return new Intl.NumberFormat(currency.locale, {
          style: 'currency',
          currency: currency.code,
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(amount);
      }
      return format(amount);
    } catch {
      return `${currency.symbol}${amount.toFixed(0)}`;
    }
  }, [currency, format]);

  const formatWhole = useCallback((amount: number): string => {
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency.symbol}${Math.round(amount)}`;
    }
  }, [currency]);

  return {
    format,
    formatCompact,
    formatWhole,
    symbol: currency.symbol,
    code: currency.code,
  };
};
