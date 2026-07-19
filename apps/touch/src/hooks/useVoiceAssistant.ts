import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface VoiceState {
  isListening: boolean;
  transcript: string;
  isSpeaking: boolean;
  error: string | null;
}

/**
 * Hook for Pillar 1: Hybrid Physical Layer (Voice UI)
 * 
 * Implements a Voice Assistant using the browser's native Web Speech API.
 * This allows guests to interact with the kiosk without touching the screen
 * (e.g., "Show me my log flume photos", "Checkout").
 */
export const useVoiceAssistant = () => {
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    transcript: '',
    isSpeaking: false,
    error: null,
  });

  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Initialize SpeechRecognition if supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setState(s => ({ ...s, error: 'Web Speech API is not supported in this browser.' }));
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false; // Stop after a single utterance
    recognitionInstance.interimResults = false;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onstart = () => {
      setState(s => ({ ...s, isListening: true, error: null }));
      logger.info('[VoiceAssistant] Listening started...');
    };

    recognitionInstance.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcriptStr = event.results[current][0].transcript;
      
      logger.info(`[VoiceAssistant] Heard: "${transcriptStr}"`);
      setState(s => ({ ...s, transcript: transcriptStr }));
      
      // In a real implementation, we would route this transcript
      // to an LLM or command parser to trigger UI state changes.
    };

    recognitionInstance.onerror = (event: any) => {
      logger.error(`[VoiceAssistant] Error occurred: ${event.error}`);
      setState(s => ({ ...s, error: event.error, isListening: false }));
    };

    recognitionInstance.onend = () => {
      setState(s => ({ ...s, isListening: false }));
      logger.info('[VoiceAssistant] Listening ended.');
    };

    setRecognition(recognitionInstance);
  }, []);

  const listen = useCallback(() => {
    if (recognition && !state.isListening) {
      try {
        recognition.start();
      } catch (err: any) {
        logger.error(`[VoiceAssistant] Failed to start listening: ${err.message}`);
      }
    }
  }, [recognition, state.isListening]);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      logger.warn('[VoiceAssistant] Speech Synthesis not supported.');
      return;
    }

    const utterance = new window.SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => setState(s => ({ ...s, isSpeaking: true }));
    utterance.onend = () => setState(s => ({ ...s, isSpeaking: false }));
    utterance.onerror = () => setState(s => ({ ...s, isSpeaking: false }));

    logger.info(`[VoiceAssistant] Speaking: "${text}"`);
    window.speechSynthesis.speak(utterance);
  }, []);

  return {
    ...state,
    listen,
    speak,
  };
};
