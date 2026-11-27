import { getModelPath, llama, LlamaLanguageModel } from '@react-native-ai/llama';
import { generateText } from 'ai';
import { LanguageEngine } from '../engine';
import { isLocalModelDownloaded } from '../models';

let loaded: { id: string; model: LlamaLanguageModel } | null = null;

const loadModel = async (id: string): Promise<LlamaLanguageModel> => {
  if (loaded?.id === id) return loaded.model;
  const model = llama.languageModel(getModelPath(id));
  await model.prepare();
  loaded = { id, model };
  return model;
};

/** A downloaded GGUF model run with llama.rn. One model instance is kept in memory once loaded. */
export const createLocalEngine = (modelId: string): LanguageEngine => ({
  id: 'local',
  isReady: () => isLocalModelDownloaded(modelId),
  generate: async (prompt, system) => (await generateText({ model: await loadModel(modelId), system, prompt })).text,
});
