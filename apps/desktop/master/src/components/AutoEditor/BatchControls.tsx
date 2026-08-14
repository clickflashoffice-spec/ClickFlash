import React, { useState } from 'react';
import { Layers, Wand2, Loader2, CheckCircle2 } from 'lucide-react';
import { apiService } from '@/services/apiService';
import type { Photo } from '@clickflash/types';
import { logger } from '../../utils/logger';
import { motion, AnimatePresence } from 'framer-motion';

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
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-5 mb-6 shadow-xl relative overflow-hidden group"
    >
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="flex items-center justify-between relative z-10">
        <div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            Batch Auto-Enhance
          </h3>
          <p className="text-xs text-slate-400 ml-8">
            Apply computed auto-edits to all eligible photos in this album.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence mode="wait">
            {status === 'processing' && (
              <motion.div 
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 text-xs text-blue-400 font-bold bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20"
              >
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Loader2 className="w-4 h-4" />
                </motion.div>
                Processing...
              </motion.div>
            )}
            
            {status === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 text-xs text-green-400 font-bold bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                Applied Successfully
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={!isProcessing && autoEditablePhotos.length > 0 ? { scale: 1.02 } : {}}
            whileTap={!isProcessing && autoEditablePhotos.length > 0 ? { scale: 0.98 } : {}}
            onClick={handleApplyAutoEdits}
            disabled={isProcessing || autoEditablePhotos.length === 0}
            className="relative overflow-hidden group/btn flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg border border-transparent"
          >
            {/* Shimmer effect */}
            {!isProcessing && autoEditablePhotos.length > 0 && (
              <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" />
            )}
            <Wand2 className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Apply to {autoEditablePhotos.length} Photos</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
