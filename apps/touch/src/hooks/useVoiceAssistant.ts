import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';

export type VoiceCommand = 'SHOW_PHOTOS' | 'SEARCH_FACE' | 'CHECKOUT' | 'HELP' | 'UNKNOWN';

interface VoiceState {
  isListening: boolean;
  transcript: string;
  command: VoiceCommand | null;
  isSpeaking: boolean;
  error: string | null;
}

const detectCommand = (transcript: string): VoiceCommand => {
    const text = transcript.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (/show photos|open gallery|mostrar fotos|abrir galeria|montrer photos|galerie|fotos zeigen|mostra foto|galleria|عرض الصور|المعرض/.test(text)) {
        return 'SHOW_PHOTOS';
    }
    if (/search face|buscar cara|chercher visage|gesicht suchen|cerca viso|buscar rosto|البحث بالوجه/.test(text)) {
        return 'SEARCH_FACE';
    }
    if (/checkout|pay|pagar|payer|kasse|cassa|الدفع/.test(text)) {
        return 'CHECKOUT';
    }
    if (/help|ayuda|aide|hilfe|aiuto|ajuda|مساعدة/.test(text)) {
        return 'HELP';
    }
    return 'UNKNOWN';
};

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
    command: null,
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
    // Leaving lang unspecified allows browser to fallback gracefully to system/default or handle some mixed content

    recognitionInstance.onstart = () => {
      setState(s => ({ ...s, isListening: true, error: null, command: null, transcript: '' }));
      logger.info('[VoiceAssistant] Listening started...');
    };

    recognitionInstance.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcriptStr = event.results[current][0].transcript;
      
      const detected = detectCommand(transcriptStr);
      logger.info(`[VoiceAssistant] Heard: "${transcriptStr}", Command: ${detected}`);
      
      setState(s => ({ ...s, transcript: transcriptStr, command: detected }));
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
