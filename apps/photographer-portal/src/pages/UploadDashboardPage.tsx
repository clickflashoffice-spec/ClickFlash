import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, DollarSign, UploadCloud, CheckCircle2, XCircle, Trash2, ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';
import { DropzoneArea } from '../components/DropzoneArea';
import { PhotoGradingPreview } from '../components/PhotoGradingPreview';
import { EventQrScanner } from '../components/EventQrScanner';
import { usePhotographerStore } from '../stores/photographerStore';
import { r2DirectUploadService } from '../services/r2DirectUploadService';

export const UploadDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const session = usePhotographerStore((state) => state.session);
  const batch = usePhotographerStore((state) => state.batch);
  const stats = usePhotographerStore((state) => state.stats);
  const isUploading = usePhotographerStore((state) => state.isUploading);
  const setIsUploading = usePhotographerStore((state) => state.setIsUploading);
  const updateBatchItem = usePhotographerStore((state) => state.updateBatchItem);
  const clearCompletedBatch = usePhotographerStore((state) => state.clearCompletedBatch);
  const setStats = usePhotographerStore((state) => state.setStats);

  const keepers = batch.filter((item) => item.isKeeper);
  const rejects = batch.filter((item) => !item.isKeeper);

  const handleStartUpload = async () => {
    if (!session || keepers.length === 0 || isUploading) return;
    setIsUploading(true);

    for (const item of keepers) {
      if (item.status === 'completed') continue;

      updateBatchItem(item.id, { status: 'uploading', progress: 0 });

      try {
        const result = await r2DirectUploadService.uploadPhoto(
          item.file,
          {
            eventId: session.activeEventName,
            accessCode: session.activeAccessCode,
            photographerId: session.photographerId,
            wristbandId: session.activeWristbandId,
            sharpnessScore: item.sharpnessScore,
          },
          (progress) => {
            updateBatchItem(item.id, { progress });
          }
        );

        updateBatchItem(item.id, { status: 'completed', progress: 100, r2Path: result.r2Path });
      } catch (err: any) {
        updateBatchItem(item.id, { status: 'error', error: err.message });
      }
    }

    setStats({
      totalUploaded: stats.totalUploaded + keepers.length,
      totalKeepers: stats.totalKeepers + keepers.length,
    });

    setIsUploading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-brand-dark text-slate-100 pb-20"
    >
      {/* Top Header Navigation */}
      <header className="p-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Camera size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                {session?.photographerName || 'Freelance Photographer'}
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-normal">
                  Live Edge
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Direct-to-R2 Ingestion Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/earnings')}
              className="px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all text-slate-200"
            >
              <DollarSign size={14} className="text-emerald-400" />
              Earnings & Payouts
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        {/* Active Session QR / Wristband Selector */}
        <EventQrScanner />

        {/* Upload Dropzone */}
        <DropzoneArea />

        {/* Batch Review & Controls */}
        {batch.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 glass-card rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Batch Inspection ({batch.length} Photos)
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={13} /> {keepers.length} Keepers
                  </span>
                  <span className="text-rose-400 flex items-center gap-1">
                    <XCircle size={13} /> {rejects.length} Culled / Discarded
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={clearCompletedBatch}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800/60 transition-colors"
                >
                  Clear Uploaded
                </button>
                <button
                  onClick={handleStartUpload}
                  disabled={isUploading || keepers.length === 0}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {isUploading ? (
                    'Streaming to R2...'
                  ) : (
                    <>
                      <UploadCloud size={16} /> Upload {keepers.length} Keepers to R2
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Photo Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {batch.map((item) => (
                <PhotoGradingPreview key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </main>
    </motion.div>
  );
};
