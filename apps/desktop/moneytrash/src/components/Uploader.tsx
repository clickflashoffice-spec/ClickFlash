'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
  ShieldAlert,
  Eye,
  Sliders,
  FolderOpen,
} from 'lucide-react';
import { logger } from "@/utils/logger";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export type AIGrade = 'A+' | 'A' | 'B' | 'REJECT';

export interface EdgeAIGradingResult {
  grade: AIGrade;
  sharpnessScore: number;
  exposureScore: number;
  faceCount: number;
  reason?: string;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'grading' | 'pending' | 'uploading' | 'completed' | 'error' | 'culled';
  error?: string;
  aiGrading?: EdgeAIGradingResult;
}

interface UploaderProps {
  onUploadComplete?: (fileId: string, url: string, grading?: EdgeAIGradingResult) => void;
  onUploadError?: (fileId: string, error: string) => void;
  maxFiles?: number;
  className?: string;
}



export function Uploader({
  onUploadComplete,
  onUploadError,
  maxFiles = 100,
  className,
}: UploaderProps) {
  const [files, setFiles] = useState<Map<string, UploadFile>>(new Map());
  const [activeUploadsCount, setActiveUploadsCount] = useState(0);
  const activeUploadsRef = useRef<Set<string>>(new Set());
  
  const workerRef = useRef<Worker | null>(null);
  const aiWorkerRef = useRef<Worker | null>(null);
  const gradeCallbacks = useRef<Map<string, (result: EdgeAIGradingResult) => void>>(new Map());
  const aiGradeCallbacks = useRef<Map<string, (result: EdgeAIGradingResult) => void>>(new Map());

  useEffect(() => {
    workerRef.current = new Worker(new URL('./workers/grade-worker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'GRADE_RESULT') {
        const { id, result } = e.data;
        const cb = gradeCallbacks.current.get(id);
        if (cb) {
          cb(result);
          gradeCallbacks.current.delete(id);
        }
      }
    };

    aiWorkerRef.current = new Worker(new URL('./workers/ai-grade-worker.ts', import.meta.url), { type: 'module' });
    aiWorkerRef.current.onmessage = (e) => {
      if (e.data.type === 'AI_GRADE_RESULT') {
        const { id, result } = e.data;
        const cb = aiGradeCallbacks.current.get(id);
        if (cb) {
          cb(result);
          aiGradeCallbacks.current.delete(id);
        }
      }
    };

    return () => {
      workerRef.current?.terminate();
      aiWorkerRef.current?.terminate();
    };
  }, []);

  // High-Speed Edge AI Settings
  const [enableEdgeAIGrading, setEnableEdgeAIGrading] = useState(true);
  const [enableCloudAIOverride, setEnableCloudAIOverride] = useState(false);
  const [autoCullRejects, setAutoCullRejects] = useState(true);
  const [concurrentThreads, setConcurrentThreads] = useState(4);
  const [speedThroughput, setSpeedThroughput] = useState('0.0 MB/s');

  const updateFile = useCallback((id: string, updates: Partial<UploadFile>) => {
    setFiles((prev) => {
      const next = new Map(prev);
      const existing = next.get(id);
      if (existing) {
        next.set(id, { ...existing, ...updates });
      }
      return next;
    });
  }, []);

  const uploadChunk = useCallback(
    async (fileId: string, chunk: Blob, chunkIndex: number, totalChunks: number, fileName: string) => {
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunkIndex', String(chunkIndex));
      formData.append('totalChunks', String(totalChunks));
      formData.append('fileName', fileName);
      formData.append('fileId', fileId);

      const response = await fetch('/api/upload/chunk', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Chunk upload failed: ${response.status}`);
      }

      return response.json();
    },
    []
  );

  const uploadFile = useCallback(
    async (uploadFileItem: UploadFile) => {
      const { file, id } = uploadFileItem;

      try {
        updateFile(id, { status: 'uploading' });
        activeUploadsRef.current.add(id);
        setActiveUploadsCount(activeUploadsRef.current.size);

        const startTime = Date.now();
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        let uploadedChunks = 0;

        for (let i = 0; i < totalChunks; i++) {
          while (activeUploadsRef.current.size > concurrentThreads) {
            await new Promise((resolve) => setTimeout(resolve, 60));
          }

          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          await uploadChunk(id, chunk, i, totalChunks, file.name);
          uploadedChunks++;
          const progress = Math.round((uploadedChunks / totalChunks) * 100);
          updateFile(id, { progress });

          // Calculate real-time throughput simulation based on elapsed bytes
          const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
          const mbUploaded = (uploadedChunks * CHUNK_SIZE) / (1024 * 1024);
          setSpeedThroughput(`${(mbUploaded / elapsedSec).toFixed(1)} MB/s`);
        }

        const completeResponse = await fetch('/api/upload/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: id, fileName: file.name }),
        });

        if (!completeResponse.ok) {
          throw new Error('Failed to complete upload');
        }

        const { url } = await completeResponse.json();
        updateFile(id, { status: 'completed', progress: 100 });
        onUploadComplete?.(id, url, uploadFileItem.aiGrading);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        updateFile(id, { status: 'error', error: message });
        onUploadError?.(id, message);
      } finally {
        activeUploadsRef.current.delete(id);
        setActiveUploadsCount(activeUploadsRef.current.size);
        if (activeUploadsRef.current.size === 0) {
          setSpeedThroughput('IDLE');
        }
      }
    },
    [updateFile, uploadChunk, onUploadComplete, onUploadError, concurrentThreads]
  );

  const processAndQueueFile = useCallback(
    async (fileItem: UploadFile) => {
      let currentItem = fileItem;

      // Phase 1: Local Edge AI Grading (if enabled)
      if (enableEdgeAIGrading && workerRef.current) {
        updateFile(fileItem.id, { status: 'grading' });
        try {
          // Get BRISQUE score from IPC
          let brisqueScore = null;
          if ((fileItem.file as any).path) {
            // @ts-expect-error electron is injected but not in global types
            brisqueScore = await window.electron.invoke('process:brisque', { filePath: (fileItem.file as any).path }) as number | null;
          }

          let grading = await new Promise<EdgeAIGradingResult>((resolve) => {
            gradeCallbacks.current.set(fileItem.id, resolve);
            workerRef.current!.postMessage({ type: 'GRADE_FILE', file: fileItem.file, id: fileItem.id, brisqueScore });
          });
          
          // Phase 1.5: Cloud AI Grading Override (Laplacian variance override)
          if (grading.grade === 'REJECT' && enableCloudAIOverride && aiWorkerRef.current) {
             logger.info(`Sending ${fileItem.file.name} to Cloud AI Override for laplacian variance override...`);
             const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                   const result = reader.result as string;
                   // strip data url prefix
                   resolve(result.split(',')[1] || result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(fileItem.file);
             });

             const aiGrading = await new Promise<EdgeAIGradingResult>((resolve) => {
                aiGradeCallbacks.current.set(fileItem.id, resolve);
                aiWorkerRef.current!.postMessage({
                   type: 'AI_GRADE_FILE',
                   imageBase64: base64,
                   id: fileItem.id,
                   currentScore: grading.sharpnessScore
                });
             });
             
             // If the AI rescues the photo, override the grade.
             if (aiGrading.grade !== 'REJECT') {
                logger.info(`Cloud AI rescued ${fileItem.file.name}! Grade: ${aiGrading.grade}`);
                grading = aiGrading;
             }
          }

          currentItem = { ...fileItem, aiGrading: grading };
          updateFile(fileItem.id, { aiGrading: grading });

          // Check for auto-culling
          if (autoCullRejects && grading.grade === 'REJECT') {
            updateFile(fileItem.id, { status: 'culled', progress: 0 });
            return;
          }
        } catch (err) {
          logger.warn('Edge AI grading error, proceeding with upload:', err);
        }
      }

      // Phase 2: Ingest chunk stream
      updateFile(fileItem.id, { status: 'pending' });
      await uploadFile(currentItem);
    },
    [enableEdgeAIGrading, enableCloudAIOverride, autoCullRejects, updateFile, uploadFile]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = new Map(files);
      const addedItems: UploadFile[] = [];

      acceptedFiles.forEach((file) => {
        if (newFiles.size >= maxFiles) return;

        const id = crypto.randomUUID();
        const uploadFileItem: UploadFile = {
          file,
          id,
          progress: 0,
          status: enableEdgeAIGrading ? 'grading' : 'pending',
        };
        newFiles.set(id, uploadFileItem);
        addedItems.push(uploadFileItem);
      });

      setFiles(newFiles);

      // Trigger parallel edge AI assessment and upload pipeline
      addedItems.forEach((item) => {
        void processAndQueueFile(item);
      });
    },
    [files, maxFiles, enableEdgeAIGrading, processAndQueueFile]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.raw', '.cr2', '.nef', '.arw'],
    },
    maxFiles,
  });

  // Summary statistics
  const totalCount = files.size;
  const completedCount = Array.from(files.values()).filter((f) => f.status === 'completed').length;
  const culledCount = Array.from(files.values()).filter((f) => f.status === 'culled').length;
  const aPlusCount = Array.from(files.values()).filter((f) => f.aiGrading?.grade === 'A+').length;

  return (
    <div className={twMerge(clsx('w-full space-y-6', className))}>
      {/* High-Speed Edge AI Control Bar */}
      <div className="bg-[#0B111F] text-white p-4 rounded-2xl border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-wide uppercase text-white flex items-center gap-2">
              High-Speed Edge AI Ingestion
              <span className="text-[10px] bg-cyan-500 text-slate-950 font-extrabold px-2 py-0.5 rounded-full">
                LOCAL ONNX / TAURI
              </span>
            </h3>
            <p className="text-xs text-white/60 font-medium">
              Zero-latency quality grading & SD-card chunk ingestion pipeline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-xs font-bold text-white/70 cursor-pointer select-none bg-[#131C31]/80 px-3 py-2 rounded-xl border border-white/20 hover:border-slate-600 transition-colors">
            <input
              type="checkbox"
              checked={enableEdgeAIGrading}
              onChange={(e) => setEnableEdgeAIGrading(e.target.checked)}
              className="rounded text-cyan-500 focus:ring-cyan-500 w-4 h-4 bg-[#0B111F] border-white/20"
            />
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Edge AI Grading</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-bold text-white/70 cursor-pointer select-none bg-[#131C31]/80 px-3 py-2 rounded-xl border border-white/20 hover:border-slate-600 transition-colors">
            <input
              type="checkbox"
              checked={autoCullRejects}
              disabled={!enableEdgeAIGrading}
              onChange={(e) => setAutoCullRejects(e.target.checked)}
              className="rounded text-cyan-500 focus:ring-cyan-500 w-4 h-4 bg-[#0B111F] border-white/20 disabled:opacity-40"
            />
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto-Cull Rejects (Blur/Dark)</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-bold text-white/70 cursor-pointer select-none bg-[#131C31]/80 px-3 py-2 rounded-xl border border-white/20 hover:border-slate-600 transition-colors">
            <input
              type="checkbox"
              checked={enableCloudAIOverride}
              disabled={!enableEdgeAIGrading}
              onChange={(e) => setEnableCloudAIOverride(e.target.checked)}
              className="rounded text-indigo-500 focus:ring-indigo-500 w-4 h-4 bg-[#0B111F] border-white/20 disabled:opacity-40"
            />
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Cloud AI Override (Gemini 2.0)</span>
          </label>

          <div className="flex items-center gap-2 bg-[#131C31]/80 px-3 py-1.5 rounded-xl border border-white/20 text-xs font-bold text-white/70">
            <Sliders className="w-3.5 h-3.5 text-white/60" />
            <span>Threads:</span>
            <select
              value={concurrentThreads}
              onChange={(e) => setConcurrentThreads(Number(e.target.value))}
              className="bg-[#0B111F] text-cyan-400 font-black rounded px-1.5 py-0.5 border border-white/20 focus:outline-none"
            >
              <option value={2}>2x</option>
              <option value={4}>4x (Default)</option>
              <option value={8}>8x (LAN High-Speed)</option>
              <option value={12}>12x (NVMe Direct)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Telemetry Bar if files exist */}
      {totalCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-[#131C31] p-3.5 rounded-xl border border-slate-200 border-white/20 flex items-center justify-between">
            <span className="text-xs font-bold text-white/50 dark:text-white/60 uppercase">Active Threads</span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
              {activeUploadsCount} / {concurrentThreads}
            </span>
          </div>
          <div className="bg-white dark:bg-[#131C31] p-3.5 rounded-xl border border-slate-200 border-white/20 flex items-center justify-between">
            <span className="text-xs font-bold text-white/50 dark:text-white/60 uppercase">Throughput</span>
            <span className="text-sm font-black text-cyan-600 dark:text-cyan-400 font-mono">{speedThroughput}</span>
          </div>
          <div className="bg-white dark:bg-[#131C31] p-3.5 rounded-xl border border-slate-200 border-white/20 flex items-center justify-between">
            <span className="text-xs font-bold text-white/50 dark:text-white/60 uppercase">Ingested</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {completedCount} / {totalCount}
            </span>
          </div>
          <div className="bg-white dark:bg-[#131C31] p-3.5 rounded-xl border border-slate-200 border-white/20 flex items-center justify-between">
            <span className="text-xs font-bold text-white/50 dark:text-white/60 uppercase">A+ Hero Shots</span>
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> {aPlusCount}
            </span>
          </div>
          <div className="bg-white dark:bg-[#131C31] p-3.5 rounded-xl border border-slate-200 border-white/20 flex items-center justify-between">
            <span className="text-xs font-bold text-white/50 dark:text-white/60 uppercase">Culled Rejects</span>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400">{culledCount}</span>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group shadow-sm',
          isDragActive
            ? 'border-cyan-500 bg-cyan-500/5 dark:bg-cyan-900/20 scale-[1.01] shadow-[0_0_30px_rgba(6,182,212,0.25)]'
            : 'border-slate-300 border-white/20 hover:border-cyan-500/80 dark:hover:border-cyan-500/80 bg-white dark:bg-[#131C31]/60'
        )}
      >
        <input {...getInputProps()} />
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform relative">
          <FolderOpen className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
          <Upload className="w-4 h-4 text-blue-500 absolute -bottom-1 -right-1 bg-white dark:bg-[#0B111F] rounded-full p-0.5" />
        </div>
        <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wide">
          Drop SD Card Folder or Camera RAW Files
        </h4>
        <p className="text-xs font-medium text-white/50 dark:text-white/60 mt-1 max-w-md mx-auto">
          High-Speed local chunk ingestion with immediate ONNX/Canvas neural sharpness & blur culling.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3 text-[11px] font-bold text-white/60 dark:text-white/50 uppercase tracking-wider">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#131C31] border border-slate-200 border-white/20">RAW / CR2 / NEF</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#131C31] border border-slate-200 border-white/20">JPEG / WEBP</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#131C31] border border-slate-200 border-white/20">500MB+ CHUNKS</span>
        </div>
      </div>

      {/* File List */}
      {files.size > 0 && (
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {Array.from(files.values()).slice(0, 60).map((uploadFileItem) => {
            const grade = uploadFileItem.aiGrading?.grade;
            return (
              <div
                key={uploadFileItem.id}
                className={clsx(
                  'flex items-center gap-4 p-4 rounded-xl border transition-all',
                  uploadFileItem.status === 'culled'
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 opacity-75'
                    : 'bg-white dark:bg-[#131C31] border-slate-200 border-white/20 shadow-sm'
                )}
              >
                <div className="flex-shrink-0">
                  {uploadFileItem.status === 'completed' && <CheckCircle className="w-7 h-7 text-emerald-500" />}
                  {uploadFileItem.status === 'error' && <AlertCircle className="w-7 h-7 text-red-500" />}
                  {uploadFileItem.status === 'uploading' && <Loader2 className="w-7 h-7 text-cyan-500 animate-spin" />}
                  {uploadFileItem.status === 'grading' && <Sparkles className="w-7 h-7 text-indigo-500 animate-pulse" />}
                  {uploadFileItem.status === 'culled' && <ShieldAlert className="w-7 h-7 text-amber-500" />}
                  {uploadFileItem.status === 'pending' && (
                    <div className="w-7 h-7 bg-slate-200 dark:bg-white/5 rounded-full flex items-center justify-center text-[10px] font-black text-white/50">
                      ••
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {uploadFileItem.file.name}
                    </p>
                    {grade && (
                      <span
                        className={clsx(
                          'text-[10px] font-black px-2 py-0.5 rounded-full border tracking-wider flex items-center gap-1 uppercase flex-shrink-0',
                          grade === 'A+' && 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400',
                          grade === 'A' && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
                          grade === 'B' && 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
                          grade === 'REJECT' && 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {grade === 'A+' && <Sparkles className="w-3 h-3" />}
                        Grade: {grade}
                      </span>
                    )}
                  </div>

                  {/* Telemetry info or progress bar */}
                  {uploadFileItem.status === 'culled' ? (
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Skipped by Edge AI: {uploadFileItem.aiGrading?.reason || 'Failed quality threshold'}
                    </p>
                  ) : uploadFileItem.status === 'grading' ? (
                    <p className="text-xs font-medium text-indigo-500 dark:text-indigo-400 mt-1 flex items-center gap-1.5 animate-pulse">
                      <Eye className="w-3.5 h-3.5" /> Assessing sharpness, exposure & face count...
                    </p>
                  ) : (
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            'h-full transition-all duration-300 rounded-full',
                            uploadFileItem.status === 'error'
                              ? 'bg-red-500'
                              : uploadFileItem.status === 'completed'
                                ? 'bg-emerald-500'
                                : 'bg-gradient-to-r from-cyan-500 to-blue-500 animate-[gradient_2s_linear_infinite]'
                          )}
                          style={{ width: `${uploadFileItem.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-white/50 dark:text-white/60 font-mono w-10 text-right">
                        {uploadFileItem.progress}%
                      </span>
                    </div>
                  )}

                  {uploadFileItem.error && (
                    <p className="text-xs font-bold text-red-500 mt-1">{uploadFileItem.error}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(uploadFileItem.id)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-slate-600 dark:hover:text-white/90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          
          {files.size > 60 && (
            <div className="p-4 text-center text-sm font-bold text-white/50 dark:text-white/60 bg-slate-50 dark:bg-[#131C31]/50 rounded-xl border border-dashed border-slate-300 border-white/20">
              + {files.size - 60} more files processing in background...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Uploader;