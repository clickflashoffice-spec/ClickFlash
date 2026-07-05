import React, { memo, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FolderUp, Trash2, X, AlertCircle, Loader2,
  FolderOpen, MonitorPlay, Image, CheckCircle, HardDrive
} from 'lucide-react';
import { clsx } from 'clsx';
import { UploadFile } from '@/types';

interface Props {
  mode: 'moneytrash' | 'sold';
  files: UploadFile[];
  uploading: boolean;
  fileSelectionError: string;
  fieldErrors: {
    eventName?: string;
    accessCode?: string;
    customerEmail?: string;
  };
  onDrop: (acceptedFiles: File[]) => void;
  handleNativeFileSelect: () => void;
  handleNativeFolderSelect: () => void;
  clearAllFiles: () => void;
  removeFile: (id: string) => void;
  formatFileSize: (bytes: number) => string;
}

export const UploadZone: React.FC<Props> = memo(({
  mode,
  files,
  uploading,
  fileSelectionError,
  fieldErrors,
  onDrop,
  handleNativeFileSelect,
  handleNativeFolderSelect,
  clearAllFiles,
  removeFile,
  formatFileSize
}) => {
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/heic': ['.heic'],
      'image/webp': ['.webp']
    },
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const fileErrors = useMemo(() => {
    return fileRejections.map(({ file, errors }) => (
      <div key={file.name} className="text-red-400 text-sm py-1">
        <AlertCircle className="w-4 h-4 inline mr-1" />
        {file.name}: {errors.map(e => e.message).join(', ')}
      </div>
    ));
  }, [fileRejections]);

  const hasAnyFieldError = !!(fieldErrors.eventName || fieldErrors.accessCode || fieldErrors.customerEmail);

  return (
    <div
      {...(getRootProps() as React.HTMLAttributes<HTMLDivElement>)}
      className={clsx(
        "border-2 border-dashed rounded-2xl flex flex-col transition-all cursor-pointer min-h-[600px] max-h-[800px]",
        isDragActive
          ? "border-yellow-500 bg-yellow-500/5 scale-[1.01]"
          : "border-zinc-800 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-900/40"
      )}
    >
      <input {...getInputProps()} />

      {files.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
          <div className={clsx(
            "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-2",
            mode === "moneytrash"
              ? "bg-yellow-500/10 border-yellow-500/30"
              : "bg-green-500/10 border-green-500/30"
          )}>
            {mode === "moneytrash" ? (
              <Upload className="w-10 h-10 text-yellow-500" />
            ) : (
              <FolderUp className="w-10 h-10 text-green-500" />
            )}
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {isDragActive ? "Drop Files Here" : "Drag & Drop Photos"}
          </h3>
          <p className="text-zinc-500 max-w-md mx-auto mb-6">
            {mode === "moneytrash"
              ? "Drop JPEG, PNG, or HEIC files to create a client proofing gallery."
              : "Drop entire folders to backup sold orders to secure cloud storage."}
          </p>

          {/* Desktop-native file picker buttons */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={(e) => { e.stopPropagation(); handleNativeFileSelect(); }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              Browse Files
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNativeFolderSelect(); }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors flex items-center gap-2"
            >
              <MonitorPlay className="w-4 h-4" />
              Select Folder
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <span className="flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5" />
              JPEG, PNG, HEIC
            </span>
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              Max 50MB per file
            </span>
          </div>

          {fileErrors.length > 0 && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl max-w-md">
              {fileErrors}
            </div>
          )}
          
          {fileSelectionError && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl max-w-md">
              <div className="text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {fileSelectionError}
              </div>
            </div>
          )}
          
          {hasAnyFieldError && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl max-w-md">
              <p className="text-yellow-400 text-xs">
                Please fill in all required fields (*) before selecting files
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* File Queue Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <h3 className="text-white font-semibold">
                Upload Queue ({files.length})
              </h3>
              {files.some(f => f.status === 'uploading') && (
                <span className="text-xs text-yellow-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Uploading...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); clearAllFiles(); }}
                disabled={uploading}
                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            </div>
          </div>

          {/* File Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {files.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className={clsx(
                    "relative aspect-square rounded-xl overflow-hidden group border",
                    uploadFile.status === 'error'
                      ? "border-red-500/50 bg-red-500/10"
                      : uploadFile.status === 'completed'
                        ? "border-green-500/50 bg-green-500/10"
                        : "border-zinc-800 bg-zinc-900"
                  )}
                >
                  {/* Preview or Icon */}
                  {uploadFile.preview ? (
                    <img
                      src={uploadFile.preview}
                      alt={uploadFile.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-8 h-8 text-zinc-600" />
                    </div>
                  )}

                  {/* Progress Overlay */}
                  {uploadFile.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 text-yellow-500 animate-spin mb-1" />
                      <span className="text-xs text-white font-medium">{uploadFile.progress}%</span>
                      <div className="w-12 h-1 bg-zinc-700 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 transition-all duration-200"
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Completed Overlay */}
                  {uploadFile.status === 'completed' && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  )}

                  {/* Error Overlay */}
                  {uploadFile.status === 'error' && (
                    <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center p-2">
                      <AlertCircle className="w-6 h-6 text-red-500 mb-1" />
                      <span className="text-[10px] text-red-400 text-center leading-tight font-medium">
                        Failed
                      </span>
                    </div>
                  )}

                  {/* File Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6">
                    <p className="text-[10px] text-white truncate leading-tight">
                      {uploadFile.file.name}
                    </p>
                    <p className="text-[9px] text-zinc-500 font-mono">
                      {formatFileSize(uploadFile.file.size)}
                    </p>
                  </div>

                  {/* Remove Button */}
                  {!uploading && uploadFile.status !== 'uploading' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(uploadFile.id); }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/70 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add More Files Area */}
          <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 rounded-b-2xl">
            <p className="text-xs text-zinc-500 text-center">
              Drag more files here or use the Browse buttons to add to queue
            </p>
            <div className="flex justify-center gap-3 mt-3">
              <button
                onClick={(e) => { e.stopPropagation(); handleNativeFileSelect(); }}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-400 transition-colors flex items-center gap-1.5"
              >
                <FolderOpen className="w-3 h-3" />
                Add Files
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleNativeFolderSelect(); }}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-400 transition-colors flex items-center gap-1.5"
              >
                <MonitorPlay className="w-3 h-3" />
                Add Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

UploadZone.displayName = 'UploadZone';
