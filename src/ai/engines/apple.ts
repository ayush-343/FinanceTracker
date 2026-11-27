import { apple } from '@react-native-ai/apple';
import { generateText } from 'ai';
import { Platform } from 'react-native';
import { LanguageEngine } from '../engine';

/** Apple Foundation Models (iOS 26+, Apple Intelligence on). getModelInfo rejects on older iOS, which counts as not ready. */
export const appleEngine: LanguageEngine = {
  id: 'apple',
  isReady: async () => {
    if (Platform.OS !== 'ios') return false;
    try {
      return (await apple.getModelInfo()).availability === 'available';
    } catch {
      return false;
    }
  },
  generate: async (prompt, system) => (await generateText({ model: apple(), system, prompt })).text,
};
