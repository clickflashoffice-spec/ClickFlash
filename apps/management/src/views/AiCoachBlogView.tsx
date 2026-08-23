import { useState } from 'react';
import { Eye, FileText, Sparkles, Compass, Smile, Sun, Copy, Check, Wand2 } from 'lucide-react';

interface CoachAnalysisItem {
  id: string;
  photoId: string;
  photographerId: string;
  photographerName: string;
  thumbnail: string;
  ruleOfThirdsScore: number;
  horizonTiltDegrees: number;
  smileClarityPercent: number;
  exposureQualityScore: number;
  actionableFeedback: string[];
  suggestedRetouchPreset: string;
}

const mockAnalyses: CoachAnalysisItem[] = [
  {
    id: 'coach-1001',
    photoId: 'photo_1001',
    photographerId: 'P-01',
    photographerName: 'Sarah M. (Beach Sector A)',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    ruleOfThirdsScore: 94,
    horizonTiltDegrees: -0.2,
    smileClarityPercent: 98,
    exposureQualityScore: 92,
    actionableFeedback: [
      'Exceptional eye-line placement on the upper-third horizontal axis.',
      'Slight backlight on subject hair creates pleasing separation.',
      'Recommend lowering fill flash by 0.3 EV for more natural skin tones.',
    ],
    suggestedRetouchPreset: 'Golden Hour Radiance',
  },
  {
    id: 'coach-1002',
    photoId: 'photo_1002',
    photographerId: 'P-04',
    photographerName: 'James K. (Waterpark)',
    thumbnail: 'https://images.unsplash.com/photo-1538964173425-93884d739596?w=400',
    ruleOfThirdsScore: 72,
    horizonTiltDegrees: 2.8,
    smileClarityPercent: 88,
    exposureQualityScore: 85,
    actionableFeedback: [
      'Horizon is tilted +2.8° clockwise — enable in-EVF electronic level.',
      'Great action timing on splash apex, high emotional value.',
      'Step 1 foot back to avoid tight cropping on subject fingertips.',
    ],
    suggestedRetouchPreset: 'Vivid Water Splash',
  },
];

const mockBlogSample = `# Top 5 Sunset Photo Spots at Paradise Bay Resort

*By ClickFlash Autonomous Media Engine — August 2026*

Planning your dream vacation at **Paradise Bay Resort**? Capturing memories that last a lifetime shouldn't feel like a chore. Our resort's professional photography team and autonomous AI lenses are stationed at the most breathtaking vantage points.

Here are the top 5 spots you simply cannot miss:

### 1. The Infinity Archway at Sunset
Positioned directly facing the golden horizon, the Infinity Archway creates a natural frame for couples and families alike. Our edge AI sensors automatically track the sun's altitude to recommend optimal exposure timing.

### 2. Splash Haven Waterslide Apex
Looking for pure thrill? High-speed synchronized burst cameras capture the exact second your family hits the crystal plunge pool, with zero motion blur.

### 3. The Private Cabana Palm Grove
Soft, dappled natural lighting filtered through coconut palms creates timeless, editorial-grade portraits.

---
*Ready to view your resort memories? Scan your room key or use your instant WhatsApp Magic Link for seamless digital downloads and custom 3D keepsakes!*
`;

export function AiCoachBlogView() {
  const [activeTab, setActiveTab] = useState<'coaching' | 'seoBlog'>('coaching');
  const [analyses] = useState(mockAnalyses);
  const [blogContent, setBlogContent] = useState(mockBlogSample);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateNewBlog = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setBlogContent(`# Experience Pure Magic: Summer Highlights at Paradise Bay

*Generated autonomously via ClickFlash AI — August 2026*

From sunrise paddleboarding to starlit beachfront dinners, this week our photographers captured over **12,400 unforgettable smiles**.

### AI-Curated Guest Favorites of the Week:
- **Family Dolphin Encounter**: Unrehearsed laughter and crisp water refractions.
- **Beachside Engagement Magic Shot**: Dynamic 3D lighting synthesized at twilight.
- **Kids Adventure Quest**: Expressive, spontaneous action shots on the pirate galleon.

*Book your complimentary photographer session at the front desk or via your guest web portal!*
`);
      setIsGenerating(false);
    }, 1200);
  };

  const handleCopyBlog = () => {
    navigator.clipboard.writeText(blogContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3 text-white">
            <Sparkles className="w-8 h-8 text-amber-400" />
            AI Photographer Coach & Autonomous SEO Blog
          </h2>
          <p className="text-slate-400 mt-1">
            Real-time algorithmic composition feedback for field photographers and autonomous resort travel content marketing.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('coaching')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'coaching'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Coach Feed ({analyses.length})
          </button>
          <button
            onClick={() => setActiveTab('seoBlog')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'seoBlog'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Autonomous SEO Blog
          </button>
        </div>
      </div>

      {/* AI Photographer Coach Tab */}
      {activeTab === 'coaching' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analyses.map(item => (
              <div key={item.photoId} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/40">
                  <div>
                    <span className="font-semibold text-white">{item.photographerName}</span>
                    <div className="text-xs text-slate-400 font-mono">Photo ID: {item.photoId}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Preset: {item.suggestedRetouchPreset}
                  </span>
                </div>

                <div className="p-5 flex flex-col sm:flex-row gap-4">
                  <img
                    src={item.thumbnail}
                    alt="Analyzed Capture"
                    className="w-full sm:w-36 h-36 object-cover rounded-lg border border-slate-700 flex-shrink-0"
                  />
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/40">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Compass className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Rule of Thirds</span>
                      </div>
                      <p className="text-lg font-bold text-white mt-0.5">{item.ruleOfThirdsScore}/100</p>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/40">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Horizon Tilt</span>
                      </div>
                      <p className={`text-lg font-bold mt-0.5 ${Math.abs(item.horizonTiltDegrees) > 1.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {item.horizonTiltDegrees > 0 ? `+${item.horizonTiltDegrees}°` : `${item.horizonTiltDegrees}°`}
                      </p>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/40">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Smile className="w-3.5 h-3.5 text-pink-400" />
                        <span>Smile Clarity</span>
                      </div>
                      <p className="text-lg font-bold text-emerald-400 mt-0.5">{item.smileClarityPercent}%</p>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/40">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Sun className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Exposure Score</span>
                      </div>
                      <p className="text-lg font-bold text-white mt-0.5">{item.exposureQualityScore}/100</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/20 border-t border-slate-800 flex-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Algorithmic Coaching Tips</span>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
                    {item.actionableFeedback?.map((tip: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Autonomous SEO Resort Travel Blog */}
      {activeTab === 'seoBlog' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                Resort Content Marketing Engine
              </h3>
              <p className="text-xs text-slate-400">
                Generates search-engine optimized travel stories from weekly resort guest metadata to drive inbound website visitors
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGenerateNewBlog}
                disabled={isGenerating}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                <Wand2 className="w-4 h-4" /> {isGenerating ? 'Synthesizing...' : 'Generate New Article'}
              </button>
              <button
                onClick={handleCopyBlog}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Markdown'}
              </button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <div className="prose prose-invert max-w-none text-slate-200 text-sm whitespace-pre-line leading-relaxed font-sans">
              {blogContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
