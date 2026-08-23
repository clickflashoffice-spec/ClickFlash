import { useState } from 'react';
import { Bot, Sparkles, BookOpen, RefreshCw } from 'lucide-react';
import { MOCK_AI_COACHING_CARDS, MOCK_RESORT_BLOGS } from '../services/concessionService';
import { AICoachingCard, ResortBlogPostItem } from '@clickflash/types';

export function AICoachingView() {
  const [activeTab, setActiveTab] = useState<'coaching' | 'blogs'>('coaching');
  const [cards, setCards] = useState<AICoachingCard[]>(MOCK_AI_COACHING_CARDS);
  const [blogs] = useState<ResortBlogPostItem[]>(MOCK_RESORT_BLOGS);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const handleRunEvaluation = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      const newCard: AICoachingCard = {
        id: `coach-${Date.now()}`,
        photographerId: 'usr-102',
        photographerName: 'Sophie Dubois',
        photoUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600',
        compositionScore: 98,
        smileEyeContactScore: 94,
        horizonTiltDegrees: 0.1,
        lightingScore: 96,
        overallGrade: 'A+',
        coachingTips: [
          'Exemplary golden hour backlight control with sharp focal isolation.',
          'Natural genuine laughter captured — prime candidate for premium 3D crystal keepsake.'
        ],
        evaluatedAt: new Date().toISOString()
      };
      setCards([newCard, ...cards]);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-rose-400">
            AI Photographer Coaching & SEO Resort Blog
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time VLM composition grading, smile/horizon analysis, and automated inbound SEO resort stories.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('coaching')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'coaching' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            AI Photographer Coach
          </button>
          <button
            onClick={() => setActiveTab('blogs')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'blogs' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            SEO Resort Blog Generator
          </button>
        </div>
      </div>

      {/* Tab 1: AI Photographer Coach */}
      {activeTab === 'coaching' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-pink-950/20 border border-pink-800/30 rounded-xl">
            <div>
              <h3 className="font-semibold text-white text-sm">Automated Edge VLM Framing & Smile Evaluator</h3>
              <p className="text-xs text-slate-400">
                Instantly analyzes newly ingested burst photos and provides non-punitive coaching recommendations directly to the photographer's field device.
              </p>
            </div>
            <button
              onClick={handleRunEvaluation}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Evaluating Ingest Stream...' : 'Grade Latest Photos'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map((card) => (
              <div key={card.id} className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="relative">
                    <img src={card.photoUrl} alt="Evaluated shot" className="w-full h-56 object-cover" />
                    <span className={`absolute top-3 right-3 px-3 py-1 text-sm font-bold rounded-lg ${
                      card.overallGrade === 'A+' || card.overallGrade === 'A'
                        ? 'bg-emerald-500 text-slate-950 shadow-lg'
                        : 'bg-amber-500 text-slate-950 shadow-lg'
                    }`}>
                      Grade: {card.overallGrade}
                    </span>
                    <span className="absolute bottom-3 left-3 px-2.5 py-1 text-xs font-semibold rounded bg-slate-950/80 backdrop-blur text-white">
                      Photographer: {card.photographerName}
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Score Meters */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px]">Composition</span>
                        <p className="text-base font-bold text-white mt-0.5">{card.compositionScore}/100</p>
                      </div>
                      <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px]">Smile / Emotion</span>
                        <p className="text-base font-bold text-white mt-0.5">{card.smileEyeContactScore}/100</p>
                      </div>
                      <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px]">Horizon Tilt</span>
                        <p className={`text-base font-bold mt-0.5 ${(card.horizonTiltDegrees ?? 0) > 1.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {card.horizonTiltDegrees ?? 0}°
                        </p>
                      </div>
                    </div>

                    {/* AI Coaching Tips */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-xs text-pink-400 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Actionable Coaching Tips:
                      </span>
                      <ul className="space-y-1.5">
                        {(card.coachingTips || card.actionableFeedback || []).map((tip, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-pink-400 font-bold">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
                  <span>Evaluated via ClickFlash VLM</span>
                  <span>{new Date(card.createdAt || Date.now()).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: SEO Resort Blog Generator */}
      {activeTab === 'blogs' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white text-sm">Autonomous Resort Travel Blog Writer</h3>
              <p className="text-xs text-slate-400">
                Generates high-ranking travel & photography guides to drive organic search reservations.
              </p>
            </div>
            <button className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-semibold transition-colors">
              + Generate New Article with Gemini
            </button>
          </div>

          <div className="space-y-4">
            {blogs.map((blog) => (
              <div key={blog.id} className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 rounded">
                        SEO Score: {blog.seoScore}/100
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-300 rounded">
                        {blog.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-lg">{blog.title}</h3>
                    <p className="text-xs text-slate-400 font-mono">/blog/{blog.slug}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{blog.summary}</p>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {blog.keywords.map((kw) => (
                    <span key={kw} className="px-2.5 py-0.5 text-[11px] bg-slate-800/80 border border-slate-700 text-slate-300 rounded-full">
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
