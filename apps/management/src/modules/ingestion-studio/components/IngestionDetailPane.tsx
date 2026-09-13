import { DropZone } from './DropZone';
import { UploadProgress } from './UploadProgress';
import { GradingGrid } from './GradingGrid';
import { SharpnessPreview } from './SharpnessPreview';
import { MousePointerClick } from 'lucide-react';

export function IngestionDetailPane({ 
  selectedId 
}: { 
  selectedId: string | null 
}) {
  if (!selectedId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/30">
        <MousePointerClick className="w-12 h-12 text-slate-700 mb-3" />
        <h3 className="text-base font-medium text-slate-400">Select a session</h3>
        <p className="text-sm text-slate-600 mt-1 max-w-sm text-center">
          Click an active or completed session on the left to view the ingestion progress and photo grid.
        </p>
      </div>
    );
  }

  // If "new" is selected, show the Dropzone to start a Web Upload
  if (selectedId === 'new') {
    return (
      <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-slate-900/50">
        <h2 className="text-2xl font-bold text-white mb-6">New Web Upload</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-3xl">
            <DropZone />
          </div>
        </div>
      </div>
    );
  }

  // Otherwise show the active session details (Progress & Grid)
  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-slate-900/30 relative">
      <div className="mb-6">
        <UploadProgress />
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="xl:col-span-2 overflow-y-auto pr-2">
          <GradingGrid />
        </div>
        <div className="overflow-y-auto pl-2 border-l border-slate-800/60">
          <SharpnessPreview />
        </div>
      </div>
    </div>
  );
}
