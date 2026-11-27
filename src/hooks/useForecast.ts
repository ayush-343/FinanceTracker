import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '../store/settingsStore';
import { askDb } from '../ai/ask/db';
import { getForecastFrom } from '../ai/forecast/load';
import type { Forecast } from '../ai/forecast/forecast';

/** The current budget period's forecast, recomputed whenever the screen gains focus. */
export const useForecast = () => {
  const budgetPeriod = useSettingsStore((s) => s.budgetPeriod);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const refresh = useCallback(() => {
    getForecastFrom(askDb, new Date(), budgetPeriod)
      .then(setForecast)
      .catch((error) => console.warn('[Forecast] failed:', error));
  }, [budgetPeriod]);
  useFocusEffect(refresh);
  return { forecast, refresh };
};
