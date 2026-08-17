import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, MessageSquare } from 'lucide-react';
import { VoiceConciergeSession } from '@clickflash/types';

interface VoiceAiConciergeProps {
  guestName?: string;
  totalPhotos?: number;
  onActionTrigger?: (action: string, payload?: any) => void;
}

export const VoiceAiConcierge: React.FC<VoiceAiConciergeProps> = ({
  guestName = 'Guest',
  totalPhotos = 24,
  onActionTrigger
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [conciergeResponse, setConciergeResponse] = useState<string>(
    `Hello ${guestName}! I'm your AI Resort Concierge. I found ${totalPhotos} magical moments from your visit. Would you like me to highlight your best coaster shots or unlock the all-inclusive bundle?`
  );

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Speech Recognition Setup if available in browser
    const windowObj = typeof window !== 'undefined' ? (window as any) : null;
    const SpeechRecognition = windowObj?.SpeechRecognition || windowObj?.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleVoiceQuery(text);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [guestName, totalPhotos]);

  const speak = (text: string) => {
    if (isMuted || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleVoiceQuery = (query: string) => {
    const lower = query.toLowerCase();
    let reply = '';

    if (lower.includes('bundle') || lower.includes('buy') || lower.includes('price') || lower.includes('discount')) {
      reply = `Great choice! The All-Inclusive Digital Pass unlocks all ${totalPhotos} 4K photos plus 1 free AI 3D avatar for only $49.99. I've prepared your checkout link!`;
      if (onActionTrigger) onActionTrigger('NAVIGATE_CHECKOUT', { bundle: 'all-inclusive' });
    } else if (lower.includes('coaster') || lower.includes('ride') || lower.includes('action')) {
      reply = `Filtering your gallery to show the 8 high-speed thrill shots from the coaster apex now!`;
      if (onActionTrigger) onActionTrigger('FILTER_CATEGORY', { category: 'coaster' });
    } else if (lower.includes('enhance') || lower.includes('edit') || lower.includes('filter')) {
      reply = `Applying AI neural enhancement and skin tone balancing across your selected memories!`;
      if (onActionTrigger) onActionTrigger('TRIGGER_AI_ENHANCE');
    } else {
      reply = `I can help you filter coaster moments, unlock discount packages, or generate a 3D hologram from any photo. What would you like to explore?`;
    }

    setConciergeResponse(reply);
    speak(reply);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      // Simulate voice query if browser SpeechRecognition is absent
      const simulatedQueries = [
        'Can you show me my roller coaster photos?',
        'What is the price for the full album bundle?',
        'Enhance my family portrait please'
      ];
      const randomQuery = simulatedQueries[Math.floor(Math.random() * simulatedQueries.length)];
      setTranscript(randomQuery);
      handleVoiceQuery(randomQuery);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <div className="voice-concierge-widget w-full max-w-xl bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-5 shadow-2xl transition-all">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2.5 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/40">
              <Sparkles className="w-5 h-5" />
            </div>
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              AI Voice Concierge
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live
              </span>
            </h4>
            <p className="text-xs text-slate-400">Natural voice guidance & instant package assist</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsMuted(!isMuted);
              if (window.speechSynthesis) window.speechSynthesis.cancel();
            }}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>
        </div>
      </div>

      {/* Speech Output Balloon */}
      <div className="my-4 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-sm text-indigo-100 leading-relaxed flex gap-3 items-start">
        <MessageSquare className="w-4 h-4 text-indigo-400 mt-1 shrink-0" />
        <div>
          <p>{conciergeResponse}</p>
          {transcript && (
            <p className="mt-2 text-xs text-cyan-400 italic">You asked: "{transcript}"</p>
          )}
        </div>
      </div>

      {/* Interactive Push to Talk Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleListening}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
            isListening 
              ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse' 
              : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white'
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="w-4 h-4" /> Listening (Tap to Stop)...
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" /> Tap to Speak with Concierge
            </>
          )}
        </button>
      </div>
    </div>
  );
};
