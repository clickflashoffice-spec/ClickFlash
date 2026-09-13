// @ts-nocheck
import { useState } from 'react';
import {
  Bot, Terminal, Database, Play, RefreshCw, CheckCircle2, FileCode, ShieldCheck, Users, Percent, Camera, MessageSquare, Sparkles, Award
} from 'lucide-react';
import { YieldArbitrageEngine, VisionBridge, type GuestCart, type PhotoQualityMetrics } from '@clickflash/ai';

interface AgentLog {
  timestamp: string;
  type: 'info' | 'tool' | 'result' | 'error';
  message: string;
}

export function YieldArbitrageTab() {
  const [cartState, setCartState] = useState<GuestCart>({
    guestId: 'guest_8829',
    guestName: 'Jessica Taylor',
    resortName: 'Grand Hyatt Beach Resort',
    photoCount: 42,
    basePrice: 120,
    hoursSinceAbandonment: 26,
    activityType: 'Parasailing Adventure',
    isVip: false
  });
  const yieldOffer = YieldArbitrageEngine.calculateOffer(cartState);
  const whatsAppMessage = YieldArbitrageEngine.formatWhatsAppPitch(cartState, yieldOffer);

  return (
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
              <Percent className="w-4 h-4" /> Dynamic Yield Elasticity Simulator
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Guest Name:</label>
                <input
                  type="text"
                  value={cartState.guestName}
                  onChange={e => setCartState({ ...cartState, guestName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Photo Count ({cartState.photoCount}):</label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={cartState.photoCount}
                    onChange={e => setCartState({ ...cartState, photoCount: Number(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Hours Elapsed ({cartState.hoursSinceAbandonment}h):</label>
                  <input
                    type="range"
                    min="1"
                    max="72"
                    value={cartState.hoursSinceAbandonment}
                    onChange={e => setCartState({ ...cartState, hoursSinceAbandonment: Number(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Base Price ($):</label>
                  <input
                    type="number"
                    value={cartState.basePrice}
                    onChange={e => setCartState({ ...cartState, basePrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cartState.isVip}
                      onChange={e => setCartState({ ...cartState, isVip: e.target.checked })}
                      className="rounded accent-cyan-500"
                    />
                    VIP Guest Protection
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Discount</span>
                <p className="text-lg font-bold text-cyan-400">{yieldOffer.discountPercent}%</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Offer Price</span>
                <p className="text-lg font-bold text-emerald-400">${yieldOffer.discountedPrice}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Urgency</span>
                <p className="text-lg font-bold text-amber-400">{yieldOffer.urgencyLevel}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> WhatsApp Recovery Pitch Preview
            </h3>
            <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4 font-sans text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {whatsAppMessage}
            </div>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800">
              Magic Link: <span className="text-cyan-400">{yieldOffer.magicLink}</span>
            </div>
          </div>
        </div>
  );
}
