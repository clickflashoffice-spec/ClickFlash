// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Download, HardDrive, CheckCircle, Clock, AlertTriangle, RefreshCw, Filter, FileText, Layers } from 'lucide-react';
import { logger } from '@/utils/logger';

interface ExportJob {
  id: string;
  event_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_files: number;
  processed_files: number;
  export_r2_path: string;
  filter_tags: string | null;
  created_at: string;
  completed_at: string | null;
}

export const RAWBatchExporter: React.FC = () => {
  const [eventId, setEventId] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'RAW_ORIGINAL' | 'HIGH_RES_JPEG'>('RAW_ORIGINAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableTags = ['best', 'portrait', 'action', 'hdr', 'vip', 'candids', 'landscape'];

  const fetchJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const baseUrl = import.meta.env.VITE_CLOUD_API_URL || 'http://localhost:8787';
      const res = await fetch(`${baseUrl}/api/photos/raw/export-jobs`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
        }
      }
    } catch (err) {
      logger.error('Failed to fetch export jobs:', err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleStartExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId.trim()) {
      setErrorMessage('Please enter a valid Event ID.');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const baseUrl = import.meta.env.VITE_CLOUD_API_URL || 'http://localhost:8787';
      const response = await fetch(`${baseUrl}/api/photos/raw/export-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: eventId.trim().toLowerCase().replace(/\s+/g, '-'),
          filterTags: selectedTags,
          format: exportFormat
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to start batch export');
      }

      await fetchJobs();
      setEventId('');
      setSelectedTags([]);
    } catch (err: any) {
      logger.error('Export job creation error:', err);
      setErrorMessage(err.message || 'Error triggering batch export job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadManifest = async (jobId: string) => {
    const baseUrl = import.meta.env.VITE_CLOUD_API_URL || 'http://localhost:8787';
    window.open(`${baseUrl}/api/photos/raw/export-jobs/${jobId}/manifest`, '_blank');
  };

  return (
    <div className="p-6 bg-[#0B101E] text-white rounded-2xl border border-white/10 shadow-2xl space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-wider text-xs uppercase mb-1">
            <HardDrive className="w-4 h-4" /> Cloud RAW Delivery Engine
          </div>
          <h2 className="text-3xl font-extrabold font-serif tracking-tight text-white">
            Bulk RAW & High-Res Exporter
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Extract, package, and deliver high-fidelity RAW negatives (.DNG/.CR3/.ARW) or print-grade proxies across global edge storage.
          </p>
        </div>
        <button
          onClick={fetchJobs}
          disabled={isLoadingJobs}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 text-cyan-400 ${isLoadingJobs ? 'animate-spin' : ''}`} />
          Refresh Jobs
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Export Configuration Form */}
        <div className="lg:col-span-1 bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-6 self-start">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" /> New Batch Job
          </h3>

          <form onSubmit={handleStartExport} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Event ID / Access Code
              </label>
              <input
                type="text"
                placeholder="e.g. aspen-gala-2026"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/15 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat('RAW_ORIGINAL')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    exportFormat === 'RAW_ORIGINAL'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/10'
                      : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <HardDrive className="w-4 h-4" />
                  RAW Originals (.DNG)
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('HIGH_RES_JPEG')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    exportFormat === 'HIGH_RES_JPEG'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/10'
                      : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  High-Res JPEG
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
                <span>Filter by AI Tags</span>
                <span className="text-[10px] text-cyan-400 font-normal">Optional</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-cyan-500/30 border-cyan-400 text-white shadow-sm'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Filter className="w-3 h-3" />
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Packaging Batch...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Initiate Batch Export
                </>
              )}
            </button>
          </form>
        </div>

        {/* Jobs List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-cyan-400" /> Export Queue & History
            </h3>
            <span className="text-xs text-slate-400 font-mono bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              {jobs.length} Active Jobs
            </span>
          </div>

          {jobs.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-12 text-center space-y-3">
              <HardDrive className="w-12 h-12 text-slate-600 mx-auto stroke-1" />
              <div className="text-slate-300 font-semibold">No RAW Export Jobs Found</div>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                Initiate a bulk export job using the configuration form to generate downloadable bundles for labs or client delivery.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const isComplete = job.status === 'completed';
                const isFailed = job.status === 'failed';
                const percent = job.total_files > 0 ? Math.round((job.processed_files / job.total_files) * 100) : 100;

                return (
                  <div
                    key={job.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-white text-sm">
                          Event: {job.event_id}
                        </span>
                        {isComplete && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" /> Completed
                          </span>
                        )}
                        {job.status === 'processing' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20 animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Processing
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/20">
                            <AlertTriangle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(job.created_at).toLocaleDateString()} {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>
                          Files: <strong className="text-slate-200">{job.processed_files} / {job.total_files}</strong>
                        </span>
                        {job.filter_tags && (
                          <span className="font-mono text-[11px] text-cyan-400/80 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                            Tags: {JSON.parse(job.filter_tags).join(', ')}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="w-full sm:w-64 bg-black/40 rounded-full h-1.5 mt-2 overflow-hidden border border-white/5">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isComplete
                              ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                              : isFailed
                              ? 'bg-red-500'
                              : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleDownloadManifest(job.id)}
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 hover:scale-[1.02]"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        Download Bundle Manifest
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RAWBatchExporter;
