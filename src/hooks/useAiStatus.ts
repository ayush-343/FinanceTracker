import { useCallback, useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { appleEngine } from '../ai/engines/apple';
import { downloadLocalModel, deleteLocalModel, findLocalModel, isLocalModelDownloaded } from '../ai/models';

export type LocalModelState = 'missing' | 'downloading' | 'ready';

/** Live status of on-device AI for the Settings screen: which engine will run, and the local model's download state. */
export const useAiStatus = () => {
  const { aiEngine, localModelId } = useSettingsStore();
  const [appleReady, setAppleReady] = useState(false);
  const [localState, setLocalState] = useState<LocalModelState>('missing');
  const [progress, setProgress] = useState(0);

  const refresh = useCallback(async () => {
    setAppleReady(await appleEngine.isReady());
    setLocalState((await isLocalModelDownloaded(localModelId)) ? 'ready' : 'missing');
  }, [localModelId]);

  useEffect(() => { refresh(); }, [refresh]);

  const download = async () => {
    setLocalState('downloading');
    setProgress(0);
    try {
      await downloadLocalModel(localModelId, setProgress);
      setLocalState('ready');
    } catch (error) {
      console.warn('[AI] model download failed:', error);
      setLocalState('missing');
      throw error;
    }
  };

  const remove = async () => {
    await deleteLocalModel(localModelId);
    setLocalState('missing');
  };

  const model = findLocalModel(localModelId);
  const active =
    aiEngine === 'off' ? 'Off'
    : (aiEngine === 'apple' || aiEngine === 'auto') && appleReady ? 'Apple Intelligence · ready'
    : (aiEngine === 'local' || aiEngine === 'auto') && localState === 'ready' ? `${model.label} · ready`
    : 'Not available · rule-based only';

  return { aiEngine, model, appleReady, localState, progress, active, download, remove };
};
