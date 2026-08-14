import React, { useState, useEffect } from "react";
import { Webhook, WebhookOff, Activity, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { apiService } from "../../../services/apiService";
import { WebhookEvent } from "../../../services/api/webhooksApi";
import { logger } from '@/utils/logger';

const MarketingWebhooksWidget: React.FC = () => {
  const [logs, setLogs] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const recentLogs = await apiService.getWebhookLogs(5);
      setLogs(recentLogs);
    } catch (e) {
      logger.error("Failed to load webhook logs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleTestTrigger = async (topic: "gallery-created" | "order-completed") => {
    setTesting(true);
    try {
      await apiService.testMarketingDripTrigger(topic);
      await fetchLogs();
    } catch (e) {
      logger.error("Failed to trigger webhook", e);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 border-slate-800/30 bg-slate-900 shadow-xl flex flex-col h-full relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2" />
      
      <div className="flex justify-between items-center mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
            <Webhook className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-black tracking-tight">Webhook Infrastructure</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Marketing Automation Events</p>
          </div>
        </div>
        <button 
          onClick={fetchLogs}
          disabled={loading}
          className="p-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/50 text-slate-400 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-2 mb-6 relative z-10">
        <button 
          onClick={() => handleTestTrigger("gallery-created")}
          disabled={testing}
          className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700 hover:border-purple-500/30 disabled:opacity-50"
        >
          Test Gallery Event
        </button>
        <button 
          onClick={() => handleTestTrigger("order-completed")}
          disabled={testing}
          className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700 hover:border-emerald-500/30 disabled:opacity-50"
        >
          Test Order Event
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 relative z-10 pr-2 custom-scrollbar">
        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 opacity-50">
            <Activity className="w-8 h-8 text-slate-600 animate-pulse mb-2" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Syncing endpoints...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 opacity-50">
            <WebhookOff className="w-8 h-8 text-slate-600 mb-2" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">No webhooks received</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 flex flex-col gap-2 group hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {log.status === "success" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-xs font-bold text-white">{log.topic}</span>
                </div>
                <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider">
                  {log.receivedAt.toLocaleTimeString()}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 bg-slate-900 p-2 rounded-lg break-all border border-slate-800 overflow-hidden line-clamp-2 group-hover:line-clamp-none transition-all">
                {JSON.stringify(log.payload)}
              </div>
              {log.errorMessage && (
                <div className="text-[10px] text-red-400 font-medium">
                  {log.errorMessage}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MarketingWebhooksWidget;
