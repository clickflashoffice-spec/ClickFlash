import React, { useState } from 'react';
import { Download, Camera, CheckCircle } from 'lucide-react';
import { volumeExportService, ExportOptions } from '../../services/VolumeExportService';
import { Photo } from '../../types';

export const VolumeExports: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [autoCrop, setAutoCrop] = useState(true);

  // Mock data for demonstration purposes
  const mockPhotos: Photo[] = [
    { id: '1', url: 'https://images.unsplash.com/photo-1519741497674-611481863552', folderPath: '' },
    { id: '2', url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc', folderPath: '' },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setStatus('Initializing...');

    const options: ExportOptions = {
      autoCropFace: autoCrop,
      fileNamePrefix: 'volume_export',
      onProgress: (p, s) => {
        setProgress(p);
        setStatus(s);
      }
    };

    try {
      await volumeExportService.exportBatch(mockPhotos, options);
    } catch (error) {
      console.error(error);
      setStatus('Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 bg-[#0B101E] text-white rounded-2xl border border-white/5 shadow-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif tracking-wide">Volume Batch Export</h2>
          <p className="text-slate-400 mt-1">Export large volumes of photos with optional AI AutoCrop.</p>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
          <Download className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-200">Export Settings</h3>
        
        <label className="flex items-center space-x-3 cursor-pointer group">
          <div className={`w-12 h-6 rounded-full transition-colors relative ${autoCrop ? 'bg-blue-500' : 'bg-slate-700'}`}>
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${autoCrop ? 'translate-x-6' : 'translate-x-0'}`} />
          </div>
          <span className="text-slate-300 group-hover:text-white transition-colors flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Enable AI AutoCrop (Face Centering)
          </span>
          <input 
            type="checkbox" 
            className="hidden" 
            checked={autoCrop} 
            onChange={(e) => setAutoCrop(e.target.checked)} 
          />
        </label>
      </div>

      <div className="pt-4 border-t border-white/10">
        {!isExporting && progress !== 100 ? (
          <button
            onClick={handleExport}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wide shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Start Batch Export ({mockPhotos.length} Photos)
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-slate-300">
              <span>{status}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-white/5">
              <div 
                className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            {progress === 100 && (
              <div className="flex items-center justify-center gap-2 text-emerald-400 mt-4 font-medium">
                <CheckCircle className="w-5 h-5" />
                Export Completed Successfully!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VolumeExports;
