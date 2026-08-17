import React from 'react';
import { useIngestionStore } from '../stores/ingestionStore';
import { Loader2, XCircle } from 'lucide-react';

export function UploadProgress() {
  const { uploadProgress, files, clearFiles } = useIngestionStore();

  if (files.length === 0 || uploadProgress === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl mt-6">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-white font-bold flex items-center gap-2">
          {uploadProgress < 100 ? <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" /> : null}
          {uploadProgress < 100 ? 'Uploading & Grading...' : 'Upload Complete'}
        </h4>
        <button onClick={clearFiles} className="text-slate-400 hover:text-red-400 transition-colors">
          <XCircle className="w-5 h-5" />
        </button>
      </div>
      
      <div className="w-full bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
        <div 
          className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${uploadProgress}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between text-xs text-slate-400">
        <span>{Math.round(uploadProgress)}% Complete</span>
        <span>~ 2 mins remaining (45 MB/s)</span>
      </div>
    </div>
  );
}
