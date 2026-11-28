import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '../store/settingsStore';
import { getEngine } from '../ai/engine';

/** True when an on-device language model is ready for the current preference. Re-checked whenever the screen gains focus. */
export const useAiAvailable = (): boolean => {
  const { aiEngine, localModelId } = useSettingsStore();
  const [available, setAvailable] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getEngine(aiEngine, localModelId)
        .then((engine) => { if (!cancelled) setAvailable(engine !== null); })
        .catch(() => { if (!cancelled) setAvailable(false); });
      return () => { cancelled = true; };
    }, [aiEngine, localModelId]),
  );
  return available;
};
