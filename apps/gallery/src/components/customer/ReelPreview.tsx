import React, { useState, useEffect } from 'react';
import { X, Film, Music, Clock, Smartphone, Download, Share2, PlayCircle, Loader2 } from 'lucide-react';

export interface ReelOptions {
  genre: 'upbeat' | 'cinematic' | 'chill';
  duration: 15 | 30 | 60;
  format: 'vertical' | 'square';
}

interface ReelPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  galleryId: string;
  photoCount: number;
  onGenerate: (options: ReelOptions) => void;
}

export default function ReelPreview({
  isOpen,
  onClose,
  galleryId,
  photoCount,
  onGenerate,
}: ReelPreviewProps) {
  const [genre, setGenre] = useState<ReelOptions['genre']>('upbeat');
  const [duration, setDuration] = useState<ReelOptions['duration']>(15);
  const [format, setFormat] = useState<ReelOptions['format']>('vertical');
  
  const [status, setStatus] = useState<'idle' | 'generating' | 'done'>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      setProgress(0);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: number;
    if (status === 'generating') {
      interval = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setStatus('done');
            return 100;
          }
          return prev + 5;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [status]);

  if (!isOpen) return null;

  const handleGenerateClick = () => {
    setStatus('generating');
    setProgress(0);
    onGenerate({ genre, duration, format });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Film className="w-6 h-6 text-purple-500" />
            AI Highlight Reel
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Placeholder Section */}
        <div className="p-6 bg-slate-900 border-b border-slate-800 flex justify-center">
          <div 
            className={`relative bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center transition-all ${
              format === 'vertical' ? 'w-48 h-80' : 'w-72 h-72'
            }`}
          >
            {status === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <PlayCircle className="w-12 h-12 text-slate-600" />
                <div className="text-slate-500 text-sm font-medium">Preview Ready</div>
                
                {/* Simulated filmstrip */}
                <div className="absolute bottom-4 left-0 w-full px-4">
                  <div className="grid grid-cols-5 gap-1 opacity-50">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="aspect-square bg-slate-800 rounded-sm" />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {status === 'generating' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/80 backdrop-blur-sm">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                <div className="text-purple-400 font-medium">Rendering Reel...</div>
                
                {/* Progress bar */}
                <div className="w-3/4 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-200" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
                <div className="text-xs text-slate-500">{progress}%</div>
              </div>
            )}

            {status === 'done' && (
              <div className="absolute inset-0 flex items-center justify-center bg-purple-900/20">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto text-white">
                    <PlayCircle className="w-8 h-8 ml-1" />
                  </div>
                  <div className="text-purple-300 font-medium text-sm mt-2">Ready to Watch</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="p-6 space-y-8">
          
          {/* Music Genre */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Music className="w-4 h-4" /> Vibe & Music
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'upbeat', icon: '🔥', label: 'Upbeat / Pop' },
                { id: 'cinematic', icon: '🎬', label: 'Cinematic' },
                { id: 'chill', icon: '☕', label: 'Chill / Lo-Fi' },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGenre(g.id as any)}
                  disabled={status !== 'idle'}
                  className={`p-3 rounded-xl border transition-all text-sm font-medium flex flex-col items-center gap-2 ${
                    genre === g.id
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  } ${status !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-xl">{g.icon}</span>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Duration
            </label>
            <div className="flex gap-3">
              {([15, 30, 60] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  disabled={status !== 'idle'}
                  className={`flex-1 py-2 rounded-full border transition-all text-sm font-medium ${
                    duration === d
                      ? 'border-purple-500 bg-purple-500 text-slate-950'
                      : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                  } ${status !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Smartphone className="w-4 h-4" /> Format
            </label>
            <div className="flex gap-3">
              {[
                { id: 'vertical', label: 'Vertical (9:16)', desc: 'TikTok / Reels' },
                { id: 'square', label: 'Square (1:1)', desc: 'Instagram Feed' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id as any)}
                  disabled={status !== 'idle'}
                  className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                    format === f.id
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                  } ${status !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`font-semibold ${format === f.id ? 'text-white' : 'text-slate-200'}`}>
                    {f.label}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-900 rounded-b-2xl">
          {status === 'idle' && (
            <button
              onClick={handleGenerateClick}
              className="w-full py-4 px-6 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition-colors shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center justify-center gap-2"
            >
              <Film className="w-5 h-5" />
              Generate My Reel
            </button>
          )}

          {status === 'generating' && (
            <button
              disabled
              className="w-full py-4 px-6 bg-slate-800 text-slate-400 font-bold rounded-xl flex items-center justify-center gap-2 cursor-wait"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </button>
          )}

          {status === 'done' && (
            <div className="flex gap-4">
              <button className="flex-1 py-3 px-4 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                Download MP4
              </button>
              <button className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                <Share2 className="w-5 h-5" />
                Share
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
