import { CloudUpload, HardDrive, CheckCircle2 } from 'lucide-react';

export type IngestionSession = {
  id: string;
  sourceName: string;
  type: 'edge' | 'web';
  status: 'Syncing' | 'Complete' | 'Failed';
  progress: number;
  photoCount: number;
  time: string;
};

export function SessionListPane({ 
  sessions, 
  selectedId, 
  onSelect 
}: { 
  sessions: IngestionSession[], 
  selectedId: string | null, 
  onSelect: (id: string) => void 
}) {
  return (
    <div className="flex flex-col h-full w-[350px] min-w-[320px] bg-slate-950 border-r border-slate-800">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-950 z-10">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ingest Sessions</h3>
        <button 
          onClick={() => onSelect('new')}
          className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5"
        >
          <CloudUpload className="w-3.5 h-3.5" /> New Upload
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sessions.map(session => (
          <div 
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
              selectedId === session.id 
                ? 'bg-slate-800 border-blue-500/60 shadow-lg shadow-blue-500/10 border-l-2 border-l-blue-500' 
                : 'bg-slate-900 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {session.type === 'edge' ? (
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                ) : (
                  <CloudUpload className="w-4 h-4 text-indigo-400" />
                )}
                <span className="text-sm font-semibold text-white truncate max-w-[160px]">
                  {session.sourceName}
                </span>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                session.status === 'Syncing' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                session.status === 'Complete' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                'bg-red-500/20 text-red-300 border-red-500/30'
              }`}>
                {session.status}
              </span>
            </div>
            
            {session.status === 'Syncing' && (
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${session.progress}%` }}
                />
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" /> {session.photoCount} photos
              </span>
              <span>{session.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
