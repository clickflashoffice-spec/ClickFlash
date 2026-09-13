import { useState } from 'react';
import { HardDrive } from 'lucide-react';
import { SessionListPane, type IngestionSession } from './components/SessionListPane';
import { IngestionDetailPane } from './components/IngestionDetailPane';

// Mock data for the UI
const mockSessions: IngestionSession[] = [
  { id: '1', sourceName: 'Edge Node: Main Lobby', type: 'edge', status: 'Syncing', progress: 84, photoCount: 412, time: '2m ago' },
  { id: '2', sourceName: 'Edge Node: Cabana 1', type: 'edge', status: 'Complete', progress: 100, photoCount: 128, time: '15m ago' },
  { id: '3', sourceName: 'Web Upload (Admin)', type: 'web', status: 'Complete', progress: 100, photoCount: 24, time: '1h ago' },
];

export function IngestionStudioPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>('1');

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8">
      {/* Header Bar */}
      <div className="px-8 py-6 border-b border-slate-800 bg-slate-950 flex-none shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Ingestion Studio
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <HardDrive className="w-3.5 h-3.5" /> Master OS Linked
              </span>
            </h1>
            <p className="text-sm font-normal text-slate-400 mt-1">
              Monitor edge node syncing, evaluate AI culling, and manually upload media.
            </p>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3 min-w-fit">
            <div>
              <div className="text-3xl font-bold text-emerald-400">8,412</div>
              <div className="text-sm text-slate-400 mt-1">Total Ingested (Today)</div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3 min-w-fit">
            <div>
              <div className="text-3xl font-bold text-cyan-400">4</div>
              <div className="text-sm text-slate-400 mt-1">Active Edge Nodes</div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3 min-w-fit">
            <div>
              <div className="text-3xl font-bold text-amber-400">12%</div>
              <div className="text-sm text-slate-400 mt-1">AI Culling Drop Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        <SessionListPane 
          sessions={mockSessions} 
          selectedId={selectedSessionId} 
          onSelect={setSelectedSessionId} 
        />
        <IngestionDetailPane 
          selectedId={selectedSessionId} 
        />
      </div>
    </div>
  );
}
