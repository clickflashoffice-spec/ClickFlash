import { useState, useCallback } from 'react';
import { Vibration } from 'react-native';
import { logger } from "@/utils/logger";

export interface VoiceTagSession {
  isListening: boolean;
  activeVoiceTags: string[];
  lastTranscript: string | null;
  tagHistory: string[];
}

export function useVoiceTagging() {
  const [isListening, setIsListening] = useState(false);
  const [activeVoiceTags, setActiveVoiceTags] = useState<string[]>(['VIP Guest', 'Front Row']);
  const [lastTranscript, setLastTranscript] = useState<string | null>('VIP Guest, Front Row');

  // simulated natural language tag extraction
  const extractTagsFromSpeech = (speechText: string): string[] => {
    const cleanText = speechText.replace(/^tag(s)?:\s*/i, '').trim();
    return cleanText
      .split(/[,&|\n]+|and /i)
      .map(t => t.trim())
      .filter(t => t.length > 1)
      .map(t => t.charAt(0).toUpperCase() + t.slice(1));
  };

  const startVoiceRecording = useCallback(async () => {
    setIsListening(true);
    try {
      Vibration.vibrate(50);
      logger.info('[VoiceTagging] Listening for hands-free headset speech... say "Tag: [keywords]"');
    } catch {
      // ignore
    }
  }, []);

  const stopVoiceRecordingAndTag = useCallback(async (simulatedSpeechInput?: string) => {
    setIsListening(false);
    try {
      Vibration.vibrate([0, 50, 50, 50]);
      // If no speech passed, simulate typical photographer headset speech
      const sampleSpeeches = [
        'Tag: Family of four, matching red sweaters, VIP',
        'Tag: Couple celebrating anniversary, sunset lighting',
        'Tag: Action shot, snowboard jump, high speed',
        'Tag: Group photo, corporate retreat, main entrance',
        'Tag: Candid smile, kids playing near fountain'
      ];
      const speech = simulatedSpeechInput || sampleSpeeches[Math.floor(Math.random() * sampleSpeeches.length)];
      setLastTranscript(speech);

      const extracted = extractTagsFromSpeech(speech);
      setActiveVoiceTags(extracted);
      logger.info('[VoiceTagging] Extracted tags from voice:', extracted);
      return extracted;
    } catch (err) {
      logger.error('[VoiceTagging] Error processing speech:', err);
      return activeVoiceTags;
    }
  }, [activeVoiceTags]);

  const addTagManually = useCallback((tag: string) => {
    if (!tag.trim()) return;
    const formatted = tag.trim().charAt(0).toUpperCase() + tag.trim().slice(1);
    setActiveVoiceTags(prev => prev.includes(formatted) ? prev : [...prev, formatted]);
  }, []);

  const removeTag = useCallback((tagToRemove: string) => {
    setActiveVoiceTags(prev => prev.filter(t => t !== tagToRemove));
  }, []);

  const clearTags = useCallback(() => {
    setActiveVoiceTags([]);
    setLastTranscript(null);
  }, []);

  return {
    isListening,
    activeVoiceTags,
    lastTranscript,
    startVoiceRecording,
    stopVoiceRecordingAndTag,
    addTagManually,
    removeTag,
    clearTags
  };
}
