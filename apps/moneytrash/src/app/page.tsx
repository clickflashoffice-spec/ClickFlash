"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload, FolderUp, CheckCircle, X, Smartphone, HardDrive,
  Image, FileImage, Trash2, AlertCircle, Loader2, History,
  FileCheck
} from "lucide-react";
import { clsx } from "clsx";
import { getMetadataFallback } from "../utils/exif";

interface UploadFile {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  shotTime?: string;
}

interface UploadHistoryItem {
  id: string;
  eventName: string;
  accessCode: string;
  fileCount: number;
  timestamp: string;
  mode: 'moneytrash' | 'sold';
}

export default function UploaderDashboard() {
  const [mode, setMode] = useState<"moneytrash" | "sold">("moneytrash");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Metadata State
  const [eventName, setEventName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [singlePhotoPrice, setSinglePhotoPrice] = useState("");
  const [fullGalleryPrice, setFullGalleryPrice] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [sendNotification, setSendNotification] = useState(true);

  // Generate previews for image files
  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve('');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = await Promise.all(
      acceptedFiles.map(async (file) => {
        const metadata = await getMetadataFallback(file);
        return {
          id: crypto.randomUUID(),
          file,
          preview: await createPreview(file),
          progress: 0,
          status: 'pending' as const,
          shotTime: metadata.dateTaken
        };
      })
    );
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/heic': ['.heic']
    },
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAllFiles = () => {
    setFiles([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!eventName || !accessCode || files.length === 0) return;
    setUploading(true);
    setOverallProgress(0);
    setUploadStatus('Queueing files...');

    const { batchUploadService } = await import('../services/batchUploadService');

    const rawFiles = files.map(f => f.file);
    await batchUploadService.createJob(rawFiles, {
      eventName,
      accessCode,
      mode,
      customerEmail,
      singlePhotoPrice,
      fullGalleryPrice
    });

    const unsubscribe = batchUploadService.subscribe((progress) => {
      setOverallProgress(progress.percentage);
      
      // Update individual files progress
      if (progress.fileProgress) {
        setFiles(prev => prev.map(f => {
          if (progress.fileProgress?.[f.file.name] !== undefined) {
            return {
              ...f,
              progress: progress.fileProgress[f.file.name],
              status: progress.fileProgress[f.file.name] === 100 ? 'completed' : 'uploading'
            } as UploadFile;
          }
          return f;
        }));
      }

      setUploadStatus(progress.status === 'processing'
        ? `Uploading: ${progress.currentFile || 'Wait...'}`
        : progress.status === 'completed'
          ? 'Finalizing album...'
          : 'Upload failed'
      );

      if (progress.status === 'completed' || progress.status === 'failed') {
        setUploading(false);
        unsubscribe();

        if (progress.status === 'completed') {
          setUploadStatus('Upload complete!');

          // Add to history
          setUploadHistory((prev) => [{
            id: crypto.randomUUID(),
            eventName,
            accessCode,
            fileCount: rawFiles.length,
            timestamp: new Date().toISOString(),
            mode
          }, ...prev].slice(0, 10));

          // Clear after delay
          setTimeout(() => {
            setFiles([]);
            setOverallProgress(0);
            setUploadStatus('');
          }, 3000);
        }
      }
    });
  };

  // File validation errors
  const fileErrors = fileRejections.map(({ file, errors }) => (
    <div key={file.name} className="text-red-400 text-sm py-1">
      <AlertCircle className="w-4 h-4 inline mr-1" />
      {file.name}: {errors.map(e => e.message).join(', ')}
    </div>
  ));

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            <span className="text-yellow-500">M</span>oney<span className="text-yellow-500">T</span>rash Transfer
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Secure Cloud Upload Gateway for Professional Photography
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            History
          </button>
          <div className="bg-zinc-900 rounded-full p-1 border border-zinc-800 flex items-center">
            <button
              onClick={() => setMode("moneytrash")}
              className={clsx(
                "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                mode === "moneytrash"
                  ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Smartphone className="w-4 h-4" />
              New Gallery
            </button>
            <button
              onClick={() => setMode("sold")}
              className={clsx(
                "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                mode === "sold"
                  ? "bg-green-500 text-black shadow-lg shadow-green-500/20"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <HardDrive className="w-4 h-4" />
              Order Backup
            </button>
          </div>
        </div>
      </header>

      {/* Upload History Panel */}
      {showHistory && uploadHistory.length > 0 && (
        <div className="max-w-6xl mx-auto mb-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-zinc-300 flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Uploads
          </h3>
          <div className="space-y-2">
            {uploadHistory.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-zinc-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileCheck className={clsx(
                    "w-4 h-4",
                    item.mode === 'moneytrash' ? 'text-yellow-500' : 'text-green-500'
                  )} />
                  <div>
                    <p className="text-sm font-medium text-white">{item.eventName}</p>
                    <p className="text-xs text-zinc-500">{item.accessCode} • {item.fileCount} files</p>
                  </div>
                </div>
                <span className="text-xs text-zinc-500">
                  {new Date(item.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Metadata Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl">
            <h2 className="text-base font-semibold mb-4 text-zinc-300 flex items-center gap-2">
              <FileImage className="w-4 h-4" />
              Gallery Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder={mode === "moneytrash" ? "Summer Wedding" : "Order #1024"}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                  Access Code *
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="WED-2026"
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none transition-colors font-mono uppercase"
                />
                <p className="text-xs text-zinc-600 mt-1">Letters, numbers, hyphens only</p>
              </div>

              {/* Pricing Section (Only for MoneyTrash Mode) */}
              {mode === "moneytrash" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                        Photo (€)
                      </label>
                      <input
                        type="number"
                        value={singlePhotoPrice}
                        onChange={(e) => setSinglePhotoPrice(e.target.value)}
                        placeholder="10.00"
                        className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                        Gallery (€)
                      </label>
                      <input
                        type="number"
                        value={fullGalleryPrice}
                        onChange={(e) => setFullGalleryPrice(e.target.value)}
                        placeholder="150.00"
                        className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none transition-colors font-mono"
                      />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-zinc-800">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="notify"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="w-4 h-4 accent-yellow-500 bg-zinc-900 border-zinc-700 rounded focus:ring-yellow-500"
                    />
                    <label htmlFor="notify" className="text-xs text-zinc-400 select-none cursor-pointer">
                      Send "Ready to View" Email
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Upload Summary */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl">
            <h2 className="text-base font-semibold mb-4 text-zinc-300">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-zinc-800">
                <span className="text-zinc-500">Mode</span>
                <span className={mode === "moneytrash" ? "text-yellow-500" : "text-green-500"}>
                  {mode === "moneytrash" ? "Gallery" : "Backup"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-zinc-800">
                <span className="text-zinc-500">Files</span>
                <span className="text-white font-medium">{files.length}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-zinc-500">Total Size</span>
                <span className="text-white font-medium">
                  {formatFileSize(files.reduce((sum, f) => sum + f.file.size, 0))}
                </span>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || files.length === 0 || !eventName || !accessCode}
              className="w-full mt-5 bg-white text-black font-bold h-11 rounded-xl hover:bg-yellow-400 disabled:opacity-50 disabled:hover:bg-white transition-colors relative overflow-hidden text-sm"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Start Upload
                  </>
                )}
              </span>
              {uploading && (
                <div
                  className="absolute inset-0 bg-yellow-400 transition-all duration-300 ease-out"
                  style={{ width: `${overallProgress}%` }}
                />
              )}
            </button>

            {uploadStatus && (
              <p className="text-xs text-zinc-400 mt-3 text-center">{uploadStatus}</p>
            )}
          </div>
        </div>

        {/* Dropzone Column */}
        <div className="lg:col-span-3">
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
                            <span className="text-[10px] text-red-400 text-center leading-tight">
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
                            {uploadFile.shotTime ? `Shot: ${uploadFile.shotTime.split(' ')[1]}` : formatFileSize(uploadFile.file.size)}
                          </p>
                        </div>

                        {/* Remove Button */}
                        {!uploading && uploadFile.status !== 'uploading' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFile(uploadFile.id); }}
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/70 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add More Files Area */}
                <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30">
                  <p className="text-xs text-zinc-500 text-center">
                    Drag more files here to add to queue
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
