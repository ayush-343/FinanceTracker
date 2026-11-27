import { useEffect, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

/** On-device dictation. `available` is false when permission is denied or on-device recognition isn't supported. */
export const useDictation = () => {
  const [available, setAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setAvailable(ExpoSpeechRecognitionModule.isRecognitionAvailable() && ExpoSpeechRecognitionModule.supportsOnDeviceRecognition());
    } catch {
      setAvailable(false);
    }
  }, []);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (event) => setTranscript(event.results[0]?.transcript ?? ''));
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    if (event.error !== 'aborted' && event.error !== 'no-speech') setError(event.message || 'Dictation stopped.');
  });

  const start = async () => {
    setError(null);
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setAvailable(false);
      setError('Microphone or speech permission is off. You can still type.');
      return;
    }
    setTranscript('');
    ExpoSpeechRecognitionModule.start({ lang: 'en-IN', interimResults: true, requiresOnDeviceRecognition: true });
  };

  const stop = () => ExpoSpeechRecognitionModule.stop();

  return { available, listening, transcript, error, start, stop };
};
