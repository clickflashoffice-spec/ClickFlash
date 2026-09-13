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
                  onChange={e => setCartState({ ...cartState, guestName: e.target.value }
  );
}
