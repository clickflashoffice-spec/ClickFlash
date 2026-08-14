import React, { useEffect, useState } from 'react';
import { CloudStatusIndicator } from './common/CloudStatusIndicator';
import NetworkStatusIndicator from './common/NetworkStatusIndicator';

export const HeadlessStatus: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    // Mock incoming Redis/Worker logs
    const interval = setInterval(() => {
      const messages = [
        '[Redis] Event received: new_shoot_registered',
        '[Worker] AI Culling job #1402 completed',
        '[Sync] Pushed 45 records to Cloud D1',
        '[WebRTC] Ping received from Touch Kiosk #01',
        '[AI] Orchestrator dispatched 2 WhatsApp messages'
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      setLogs(prev => {
        const newLogs = [...prev, `[${new Date().toLocaleTimeString()}] ${randomMsg}`];
        if (newLogs.length > 20) newLogs.shift();
        return newLogs;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-emerald-400 font-mono p-8 flex flex-col">
      <div className="flex justify-between items-center border-b border-emerald-900 pb-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-widest text-emerald-500">CLICKFLASH MASTER NODE</h1>
          <p className="text-emerald-700 text-sm mt-1">v6.0 Autonomous Ecosystem Paradigm // Edge Orchestrator</p>
        </div>
        <div className="flex gap-4">
          <NetworkStatusIndicator />
          <CloudStatusIndicator size="normal" />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-8">
        <div className="col-span-2 border border-emerald-900 bg-slate-900/50 p-4 rounded-md">
          <h2 className="text-emerald-600 font-bold mb-4 border-b border-emerald-900/50 pb-2">SYSTEM LOGS</h2>
          <div className="flex flex-col gap-1 text-sm overflow-y-auto h-[600px]">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
            <div className="animate-pulse">_</div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="border border-emerald-900 bg-slate-900/50 p-4 rounded-md">
            <h2 className="text-emerald-600 font-bold mb-4 border-b border-emerald-900/50 pb-2">ACTIVE WORKERS</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span>WebRTC Gateway</span> <span className="text-emerald-300">ONLINE</span></li>
              <li className="flex justify-between"><span>Redis Stream Consumer</span> <span className="text-emerald-300">ONLINE</span></li>
              <li className="flex justify-between"><span>AI Dispatcher (Hunter)</span> <span className="text-emerald-300">ONLINE</span></li>
              <li className="flex justify-between"><span>Local SQLite Sync</span> <span className="text-emerald-300">ONLINE</span></li>
            </ul>
          </div>
          
          <div className="border border-emerald-900 bg-slate-900/50 p-4 rounded-md">
            <h2 className="text-emerald-600 font-bold mb-4 border-b border-emerald-900/50 pb-2">WARNING</h2>
            <p className="text-emerald-700 text-xs">
              This is a Headless Edge Node. All UI interaction should be performed via the Management Hub (Command Center). 
              Do not close this window while the studio is operational.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeadlessStatus;
