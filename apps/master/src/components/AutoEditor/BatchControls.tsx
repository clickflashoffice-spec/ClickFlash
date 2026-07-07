import React, { useState } from 'react';
import { Layers, Wand2, Loader2, CheckCircle2 } from 'lucide-react';
import { apiService } from '@/services/apiService';
import type { Photo } from '@clickflash/types';
import { logger } from '../../utils/logger';

interface BatchControlsProps {
  albumId: string;
  photos: Photo[];
  onBatchComplete: () => void;
}

export const BatchControls: React.FC<BatchControlsProps> = ({
  albumId: _albumId,
  photos,
  onBatchComplete,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [_progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  // Find photos that have autoEdits computed but not yet applied
  const autoEditablePhotos = photos.filter(p => p.autoEdits != null);

  const handleApplyAutoEdits = async () => {
    if (autoEditablePhotos.length === 0) {
      alert("No auto-edits available to apply.");
      return;
    }

    if (!confirm(`Apply auto-enhancements to ${autoEditablePhotos.length} photos? This will overwrite existing manual edits for these specific adjustments.`)) {
      return;
    }

    setIsProcessing(true);
    setStatus('processing');
    setProgress({ current: 0, total: autoEditablePhotos.length });

    try {
      const updates = autoEditablePhotos.map(p => {
        // Merge autoEdits over existing manualEdits
        const newManualEdits = {
          ...(p.manualEdits || {}),
          ...p.autoEdits,
        };
        
        return {
          id: p.id,
          manualEdits: newManualEdits,
          autoEnhanced: true, // Mark it as enhanced
        };
      });

      // Send to batch endpoint
      await apiService.batchSavePhotos(updates as Partial<Photo>[]);

      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        onBatchComplete();
      }, 2000);

    } catch (error) {
      logger.error('Failed to batch apply auto-edits', error);
      alert("An error occurred while applying auto-edits in batch.");
      setStatus('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-blue-500" />
            Batch Auto-Enhance
          </h3>
          <p className="text-xs text-slate-400">
            Apply computed auto-edits to all eligible photos in this album.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {status === 'processing' && (
            <div className="flex items-center gap-2 text-xs text-blue-400 font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex items-center gap-2 text-xs text-green-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Applied Successfully
            </div>
          )}

          <button
            onClick={handleApplyAutoEdits}
            disabled={isProcessing || autoEditablePhotos.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            Apply to {autoEditablePhotos.length} Photos
          </button>
        </div>
      </div>
    </div>
  );
};
