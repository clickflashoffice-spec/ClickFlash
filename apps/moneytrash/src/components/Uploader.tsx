'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_CONCURRENT_UPLOADS = 3;

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface UploaderProps {
  onUploadComplete?: (fileId: string, url: string) => void;
  onUploadError?: (fileId: string, error: string) => void;
  maxFiles?: number;
  className?: string;
}

export function Uploader({
  onUploadComplete,
  onUploadError,
  maxFiles = 50,
  className,
}: UploaderProps) {
  const [files, setFiles] = useState<Map<string, UploadFile>>(new Map());
  const [, setIsUploading] = useState(false);
  const activeUploadsRef = useRef<Set<string>>(new Set());

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
    async (uploadFile: UploadFile) => {
      const { file, id } = uploadFile;

      try {
        updateFile(id, { status: 'uploading' });

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        let uploadedChunks = 0;

        for (let i = 0; i < totalChunks; i++) {
          while (activeUploadsRef.current.size >= MAX_CONCURRENT_UPLOADS) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          activeUploadsRef.current.add(id);

          try {
            await uploadChunk(id, chunk, i, totalChunks, file.name);
            uploadedChunks++;
            const progress = Math.round((uploadedChunks / totalChunks) * 100);
            updateFile(id, { progress });
          } finally {
            activeUploadsRef.current.delete(id);
          }
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
        onUploadComplete?.(id, url);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        updateFile(id, { status: 'error', error: message });
        onUploadError?.(id, message);
      }
    },
    [updateFile, uploadChunk, onUploadComplete, onUploadError]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = new Map(files);

      acceptedFiles.forEach((file) => {
        if (newFiles.size >= maxFiles) return;

        const id = crypto.randomUUID();
        const uploadFile: UploadFile = {
          file,
          id,
          progress: 0,
          status: 'pending',
        };
        newFiles.set(id, uploadFile);
      });

      setFiles(newFiles);

      const pendingFiles = Array.from(newFiles.values()).filter((f) => f.status === 'pending');
      if (pendingFiles.length > 0) {
        setIsUploading(true);
        pendingFiles.forEach((f) => uploadFile(f));
      }
    },
    [files, maxFiles, uploadFile]
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
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.raw', '.cr2', '.nef'],
    },
    maxFiles,
  });

  return (
    <div className={twMerge(clsx('w-full', className))}>
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 relative overflow-hidden',
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.3)]'
            : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
          Drop files here or click to upload
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Images up to 500MB each • RAW, JPEG, PNG, WebP supported
        </p>
      </div>

      {files.size > 0 && (
        <div className="mt-6 space-y-3">
          {Array.from(files.values()).map((uploadFile) => (
            <div
              key={uploadFile.id}
              className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <div className="flex-shrink-0">
                {uploadFile.status === 'completed' && (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
                {uploadFile.status === 'error' && (
                  <AlertCircle className="w-8 h-8 text-red-500" />
                )}
                {uploadFile.status === 'uploading' && (
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                )}
                {uploadFile.status === 'pending' && (
                  <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-full" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white truncate">
                  {uploadFile.file.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full transition-all duration-500 ease-out rounded-full',
                        uploadFile.status === 'error' ? 'bg-red-500' :
                        uploadFile.status === 'completed' ? 'bg-green-500' :
                        'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 bg-[length:200%_100%] animate-[gradient_2s_linear_infinite]'
                      )}
                      style={{ width: `${uploadFile.progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {uploadFile.progress}%
                  </span>
                </div>
                {uploadFile.error && (
                  <p className="text-sm text-red-500 mt-1">{uploadFile.error}</p>
                )}
              </div>

              <button
                onClick={() => removeFile(uploadFile.id)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Uploader;