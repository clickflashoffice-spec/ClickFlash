import { useState } from 'react';
import { ShoppingBag, Trophy, ShieldCheck, Star, Sparkles, Zap } from 'lucide-react';
import { MOCK_KEEPSAKE_PRODUCTS, MOCK_GAMIFICATION_PROFILES, MOCK_REVIEW_INTERCEPTIONS } from '../services/concessionService';
import { KeepsakeProductItem, GamificationProfile, ReviewInterceptionLog } from '@clickflash/types';

export function KeepsakeStoreView() {
  const [activeTab, setActiveTab] = useState<'store' | 'gamification' | 'reviews'>('store');
  const [products] = useState<KeepsakeProductItem[]>(MOCK_KEEPSAKE_PRODUCTS);
  const [leaderboard] = useState<GamificationProfile[]>(MOCK_GAMIFICATION_PROFILES);
  const [reviews] = useState<ReviewInterceptionLog[]>(MOCK_REVIEW_INTERCEPTIONS);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">
            Merchandise Keepsakes, Gamification & Review Defense
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            3D laser crystal & figurine catalog, live shift XP leaderboards, and AI review interceptor.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('store')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'store' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Keepsakes & 3D Store
          </button>
          <button
            onClick={() => setActiveTab('gamification')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'gamification' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Live Gamification XP
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'reviews' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Review Protection
          </button>
        </div>
      </div>

      {/* Tab 1: Keepsake Store */}
      {activeTab === 'store' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((prod) => (
            <div key={prod.id} className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <img src={prod.previewImageUrl} alt={prod.name} className="w-full h-48 object-cover" />
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 rounded">
                      {prod.fulfillmentLab} LAB FULFILLMENT
                    </span>
                    <span className="text-xs text-emerald-400 font-semibold">{prod.grossMarginPercent}% Margin</span>
                  </div>
                  <h3 className="font-semibold text-white text-base">{prod.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{prod.description}</p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[10px] text-slate-500">Retail Guest Price</span>
                    <p className="text-base font-bold text-white">€{prod.retailPrice.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500">Lab Production Cost</span>
                    <p className="text-sm font-semibold text-slate-400">€{prod.labCostPrice.toFixed(2)}</p>
                  </div>
                </div>

                <button className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white rounded-lg transition-colors flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Configure Upsell Bundle
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Gamification XP & Leaderboards */}
      {activeTab === 'gamification' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leaderboard.map((user) => (
              <div key={user.id} className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={user.userAvatar} alt={user.userName} className="w-12 h-12 rounded-full object-cover border-2 border-amber-500/40" />
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                        #{user.rankPosition}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base">{user.userName}</h3>
                      <p className="text-xs text-amber-400 font-medium flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Level {user.currentLevel} • {user.currentXp.toLocaleString()} XP
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Shift Revenue:</span>
                    <p className="text-lg font-bold text-emerald-400">€{user.dailyRevenueGenerated.toFixed(2)}</p>
                  </div>
                </div>

                {/* Progress bar to next level */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Progress to Level {user.currentLevel + 1}</span>
                    <span>{user.currentXp} / {user.nextLevelXp} XP</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: `${(user.currentXp / user.nextLevelXp) * 100}%` }} />
                  </div>
                </div>

                {/* Badges */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-medium">Earned Shift Badges:</span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {user.badges.map(b => (
                      <span key={b.id} className="px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 flex items-center gap-1.5" title={b.description}>
                        <span>{b.icon}</span>
                        <span className="font-medium">{b.title}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Review Protection */}
      {activeTab === 'reviews' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white text-base">Review Protection Gatekeeper</h2>
              <p className="text-xs text-slate-400">Intercepts low satisfaction ratings before they hit Google / TripAdvisor.</p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
              4.9/5 Average Resort Rating
            </span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {reviews.map((rev) => (
              <div key={rev.id} className="p-5 flex items-start justify-between hover:bg-slate-800/20 transition-colors">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white text-sm">{rev.guestName}</h3>
                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < rev.ratingScore ? 'fill-amber-400' : 'text-slate-700'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 italic leading-relaxed">"{rev.feedbackText}"</p>
                  {rev.compensationOffered && (
                    <p className="text-xs text-emerald-400 font-medium">🎁 Automated Resolution: {rev.compensationOffered}</p>
                  )}
                </div>

                <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
                  rev.routingResult === 'GOOGLE_TRIPADVISOR_REDIRECT'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {rev.routingResult === 'GOOGLE_TRIPADVISOR_REDIRECT' ? 'Public Review Allowed' : 'Intercepted & Resolved'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
