import { downloadModel, isModelDownloaded, removeModel, DownloadProgress } from '@react-native-ai/llama';

export interface LocalModel {
  /** owner/repo/filename.gguf on Hugging Face, the id format @react-native-ai/llama expects. */
  id: string;
  label: string;
  sizeMB: number;
}

export const LOCAL_MODELS: LocalModel[] = [
  { id: 'unsloth/Qwen3.5-0.8B-GGUF/Qwen3.5-0.8B-Q4_K_M.gguf', label: 'Qwen3.5 0.8B', sizeMB: 533 },
  { id: 'unsloth/Qwen3.5-2B-GGUF/Qwen3.5-2B-Q4_K_M.gguf', label: 'Qwen3.5 2B', sizeMB: 1281 },
];

export const DEFAULT_LOCAL_MODEL_ID = LOCAL_MODELS[0].id;

export const findLocalModel = (id: string): LocalModel => LOCAL_MODELS.find((m) => m.id === id) ?? LOCAL_MODELS[0];

export const isLocalModelDownloaded = (id: string): Promise<boolean> => isModelDownloaded(id).catch(() => false);

export const downloadLocalModel = (id: string, onProgress: (percent: number) => void): Promise<string> =>
  downloadModel(id, (p: DownloadProgress) => onProgress(Math.round(p.percentage)));

export const deleteLocalModel = (id: string): Promise<void> => removeModel(id);
