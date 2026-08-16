import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FolderUp, CheckCircle, X, Smartphone, HardDrive,
  Image, FileImage, Trash2, AlertCircle, Loader2, History,
  FileCheck, Settings, FolderOpen, MonitorPlay, BarChart2
} from 'lucide-react';
import { clsx } from 'clsx';
import { desktopBatchUploadService } from './services/desktopBatchUploadService';
import { UploadHistoryItem, AppSettings } from './types';
import { env } from '@/utils/env';
import { cloudApiService } from './services/cloudApiService';
import { approveDroppedFile, initTauriApi, isTauri, invoke } from './services/tauriService';
import { Analytics } from './components/Analytics';
import { logger } from "@/utils/logger";

interface UploadFile {
  id: string;
  file: File;
  size: number;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
  filePath?: string; // Native file path for desktop
}

interface NativeFileInfo {
  name: string;
  path: string;
  size: number;
  mimeType?: string;
  previewUrl?: string;
}

const toUploadFile = (fileInfo: NativeFileInfo): UploadFile => ({
  id: crypto.randomUUID(),
  file: new File([], fileInfo.name, { type: fileInfo.mimeType || 'image/jpeg' }),
  size: fileInfo.size,
  filePath: fileInfo.path,
  preview: fileInfo.previewUrl,
  progress: 0,
  status: 'pending'
});

function App() {
  const [mode, setMode] = useState<"moneytrash" | "sold" | "analytics">("moneytrash");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Metadata State
  const [eventName, setEventName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [singlePhotoPrice, setSinglePhotoPrice] = useState("");
  const [fullGalleryPrice, setFullGalleryPrice] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [sendNotification, setSendNotification] = useState(true);

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    eventName?: string;
    accessCode?: string;
    customerEmail?: string;
  }>({});

  // File selection error message
  const [fileSelectionError, setFileSelectionError] = useState<string>('');

  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    apiUrl: env.API_BASE_URL,
    deskId: '',
    autoStartUpload: false,
    saveHistory: true,
  });

  const loadSavedData = async () => {
    if (!isTauri()) {
      logger.info('[MoneyTrash] Not running in Tauri - skipping native data load');
      return;
    }

    try {
      // 1. Load Upload History
      const history = await invoke<UploadHistoryItem[]>('load_upload_history');
      if (history && history.length > 0) {
        setUploadHistory(history);
      }

      // 2. Load Config (PRE-CONFIGURATION SYNC)
      logger.info('[MoneyTrash] Initializing cloud configuration...');
      const config = await invoke<any>('load_upload_config');
      
      if (config) {
        logger.info('[MoneyTrash] Pre-configuration found:', config);
        
        // Update metadata if present
        if (config.eventName) setEventName(config.eventName);
        if (config.accessCode) setAccessCode(config.accessCode);
        if (config.mode === "moneytrash" || config.mode === "sold") setMode(config.mode);
        if (config.customerEmail) setCustomerEmail(config.customerEmail);
        if (config.singlePhotoPrice) setSinglePhotoPrice(config.singlePhotoPrice);
        if (config.fullGalleryPrice) setFullGalleryPrice(config.fullGalleryPrice);

        // Update application settings
        setSettings(prev => ({
          ...prev,
          apiUrl: config.apiUrl || prev.apiUrl,
          deskId: config.deskId || prev.deskId,
          s3AccessKey: config.s3AccessKey,
          s3SecretKey: config.s3SecretKey,
          s3Region: config.s3Region,
          s3Bucket: config.s3Bucket,
          s3Endpoint: config.s3Endpoint
        }));

        // Initialize Cloud API Service with loaded credentials
        if (config.apiUrl && config.deskId) {
          logger.info(`[MoneyTrash] Configuring Cloud API Service for: ${config.apiUrl}`);
          cloudApiService.configure({
            apiUrl: config.apiUrl,
            deskId: config.deskId,
            apiKey: config.apiKey || ''
          });
          
          // Background health check
          cloudApiService.healthCheck()
            .then(health => logger.info('[MoneyTrash] Cloud API Health:', health))
            .catch(err => logger.error('[MoneyTrash] Cloud API Connectivity Error:', err));
        }
      let masterConfig: any = null;
      try {
        const res = await fetch('http://localhost:8090/api/settings', {
          headers: { 'Authorization': 'Bearer ADMIN-SECRET-TOKEN' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings) {
            masterConfig = data.settings;
            logger.info('[MoneyTrash] Loaded config from Master OS:', masterConfig);
          }
        }
      } catch (err) {
        logger.warn('[MoneyTrash] Could not connect to Master OS settings API', err);
      }

      if (masterConfig) {
        config = { ...(config || {}), ...masterConfig };
        logger.info('[MoneyTrash] Final Configuration:', config);
        
        setSettings(prev => ({
          ...prev,
          apiUrl: masterConfig.moneytrashApiUrl || prev.apiUrl,
          deskId: masterConfig.moneytrashDeskId || prev.deskId,
          s3AccessKey: masterConfig.s3AccessKey || prev.s3AccessKey,
          s3SecretKey: masterConfig.s3SecretKey || prev.s3SecretKey,
          s3Region: masterConfig.s3Region || prev.s3Region,
          s3Bucket: masterConfig.s3Bucket || prev.s3Bucket
        }));
      }

    } catch (e) {
      logger.error('[MoneyTrash] Error during startup data load:', e);
    }
  };

  // Load saved history and settings on mount
  useEffect(() => {
    initTauriApi();
    // eslint-disable-next-line
    loadSavedData();
  }, []);

  // Clear file selection error when mode changes
  useEffect(() => {
    // eslint-disable-next-line
    setFileSelectionError('');
  }, [mode, eventName, accessCode, customerEmail]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!isTauri()) {
      setFileSelectionError('File drops require the ClickFlash desktop app');
      return;
    }

    try {
      const approvedFiles = await Promise.all(acceptedFiles.map(approveDroppedFile));
      setFiles((prev) => [...prev, ...approvedFiles.map(toUploadFile)]);
      setFileSelectionError('');
    } catch (error) {
      logger.error('[MoneyTrash] Failed to approve dropped files:', error);
      setFileSelectionError('One or more dropped files could not be approved');
    }
  }, []);

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

  // Validate required fields before file selection
  const validateForFileSelection = (): boolean => {
    const errors: typeof fieldErrors = {};
    
    if (!eventName.trim()) {
      errors.eventName = mode === 'moneytrash' ? 'Event name is required' : 'Order name is required';
    }
    if (!accessCode.trim()) {
      errors.accessCode = 'Access code is required';
    }
    
    // For Backup mode, email is mandatory
    if (mode === 'sold' && !customerEmail.trim()) {
      errors.customerEmail = 'Customer email is required for backup';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Native file picker for desktop
  const handleNativeFileSelect = async () => {
    // Validate fields first
    if (!validateForFileSelection()) {
      setFileSelectionError('Please fill in all required fields before selecting files');
      return;
    }
    
    setFileSelectionError('');
    
    if (!isTauri()) {
      setFileSelectionError('Native file picker requires Tauri desktop app');
      return;
    }
    
    try {
      logger.info('[MoneyTrash] Opening file picker...');
      const selectedFiles = await invoke<NativeFileInfo[]>('select_files', { multiple: true });
      logger.info('[MoneyTrash] Selected files:', selectedFiles);

      if (selectedFiles && selectedFiles.length > 0) {
        logger.info(`[MoneyTrash] Processing ${selectedFiles.length} files...`);
        const newFiles = selectedFiles.map(toUploadFile);
        logger.info(`[MoneyTrash] Added ${newFiles.length} files to queue`);
        setFiles((prev) => [...prev, ...newFiles]);
        setFileSelectionError('');
      } else {
        logger.info('[MoneyTrash] No files selected');
      }
    } catch (error) {
      logger.error('[MoneyTrash] Error selecting files:', error);
      setFileSelectionError(`Error selecting files: ${error}`);
    }
  };

  // Native folder picker for desktop
  const handleNativeFolderSelect = async () => {
    // Validate fields first
    if (!validateForFileSelection()) {
      setFileSelectionError('Please fill in all required fields before selecting a folder');
      return;
    }
    
    setFileSelectionError('');
    
    if (!isTauri()) {
      setFileSelectionError('Native folder picker requires Tauri desktop app');
      return;
    }
    
    try {
      logger.info('[MoneyTrash] Opening folder picker...');
      setUploadStatus('Scanning folder for images...');
      
      const selectedFiles = await invoke<NativeFileInfo[] | null>('select_folder');
      logger.info('[MoneyTrash] Folder scan result:', selectedFiles);
      
      if (selectedFiles === null) {
        logger.info('[MoneyTrash] No folder selected (cancelled)');
        setUploadStatus('');
        return;
      }
      
      if (selectedFiles.length === 0) {
        logger.info('[MoneyTrash] Folder selected but no image files found');
        setFileSelectionError('No image files found in the selected folder. Supported formats: JPEG, PNG, HEIC, WEBP');
        setUploadStatus('');
        return;
      }
      
      logger.info(`[MoneyTrash] Found ${selectedFiles.length} image files in folder`);
      const newFiles = selectedFiles.map(toUploadFile);
      logger.info(`[MoneyTrash] Added ${newFiles.length} files to queue`);
      setFiles((prev) => [...prev, ...newFiles]);
      setFileSelectionError('');
      setUploadStatus('');
    } catch (error) {
      logger.error('[MoneyTrash] Error selecting folder:', error);
      setFileSelectionError(`Error reading folder: ${error}`);
      setUploadStatus('');
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAllFiles = () => {
    setFiles([]);
  };

  // Handle mode switch with form reset and validation
  const handleModeSwitch = (newMode: "moneytrash" | "sold" | "analytics") => {
    if (newMode === mode) return;
    
    // Clear all form fields when switching modes
    setMode(newMode);
    setEventName("");
    setAccessCode("");
    setCustomerEmail("");
    setSinglePhotoPrice("");
    setFullGalleryPrice("");
    setFiles([]);
    setFieldErrors({});
    setFileSelectionError('');
    setUploadStatus('');
    
    logger.info(`[MoneyTrash] Switched to ${newMode === 'moneytrash' ? 'Gallery' : 'Backup'} mode - form reset`);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    // Validate required fields
    if (!eventName.trim() || !accessCode.trim() || files.length === 0) return;
    
    // For Backup mode, email is mandatory
    if (mode === 'sold' && !customerEmail.trim()) {
      setFieldErrors(prev => ({ ...prev, customerEmail: 'Customer email is required for backup' }));
      return;
    }
    setUploading(true);
    setOverallProgress(0);
    setUploadStatus('Queueing files...');

    if (files.some((file) => !file.filePath)) {
      setUploading(false);
      setFileSelectionError('Every upload must be selected or approved by the desktop app');
      return;
    }

    const rawFiles = files.map(f => f.file);
    let jobId: string | null = null;
    const unsubscribe = desktopBatchUploadService.subscribe((progress) => {
      if (!jobId || progress.jobId !== jobId) return;

      setOverallProgress(progress.percentage);
      setUploadStatus(
        progress.status === 'processing'
          ? `Uploading: ${progress.currentFile || 'Wait...'}`
          : progress.status === 'completed'
            ? 'Finalizing album...'
            : progress.status === 'cancelled'
              ? 'Upload cancelled'
              : 'Upload failed'
      );

      setFiles(prev => prev.map((file) => {
        if (progress.status === 'completed') {
          return { ...file, status: 'completed' as const, progress: 100 };
        }
        if (progress.status === 'failed') {
          return file.status === 'completed'
            ? file
            : { ...file, status: 'error' as const };
        }
        if (progress.status === 'cancelled') {
          return file.status === 'completed'
            ? file
            : { ...file, status: 'cancelled' as const };
        }
        if (progress.currentFile && file.file.name === progress.currentFile) {
          return { ...file, status: 'uploading' as const };
        }
        return file;
      }));

      if (
        progress.status === 'completed' ||
        progress.status === 'failed' ||
        progress.status === 'cancelled'
      ) {
        setUploading(false);
        setActiveJobId(null);
        unsubscribe();

        if (progress.status === 'completed') {
          setUploadStatus('Upload complete!');

          if (isTauri()) {
            invoke('show_notification', {
              title: 'Upload Complete',
              body: `Successfully uploaded ${rawFiles.length} files to ${eventName}`
            }).catch((error) => logger.error('Failed to show upload notification', error));
          }

          if (settings.saveHistory) {
            const newHistoryItem: UploadHistoryItem = {
              id: crypto.randomUUID(),
              eventName,
              accessCode,
              fileCount: rawFiles.length,
              timestamp: new Date().toISOString(),
              mode: mode === 'analytics' ? 'moneytrash' : mode
            };
            const updatedHistory = [newHistoryItem, ...uploadHistory].slice(0, 10);
            setUploadHistory(updatedHistory);

            if (isTauri()) {
              invoke('save_upload_history', { history: updatedHistory })
                .catch((error) => logger.error('Failed to save upload history', error));
            }
          }

          setTimeout(() => {
            setFiles([]);
            setOverallProgress(0);
            setUploadStatus('');
          }, 3000);
        }
      }
    });

    jobId = desktopBatchUploadService.createJob(rawFiles, {
      eventName,
      accessCode,
      mode: mode === 'analytics' ? 'moneytrash' : mode,
      customerEmail,
      singlePhotoPrice,
      fullGalleryPrice,
      apiUrl: settings.apiUrl,
      deskId: settings.deskId,
      nativePaths: files.map(f => f.filePath as string)
    });
    setActiveJobId(jobId);
  };

  const handleCancelUpload = async () => {
    if (!activeJobId) return;
    const cancelled = await desktopBatchUploadService.cancelJob(activeJobId);
    if (!cancelled) {
      setUploadStatus('Upload could not be cancelled because it already finished');
    }
  };

  const saveSettings = async () => {
    try {
      if (isTauri()) {
        await invoke('save_upload_config', {
          config: {
            event_name: eventName,
            access_code: accessCode,
            mode: mode === 'analytics' ? 'moneytrash' : mode,
            customer_email: customerEmail || null,
            single_photo_price: singlePhotoPrice || null,
            full_gallery_price: fullGalleryPrice || null,
            api_url: settings.apiUrl,
            desk_id: settings.deskId,
            s3_access_key: settings.s3AccessKey || null,
            s3_secret_key: settings.s3SecretKey || null,
            s3_region: settings.s3Region || null,
            s3_bucket: settings.s3Bucket || null,
            s3_endpoint: settings.s3Endpoint || null
          }
        });
      }
      setShowSettings(false);
    } catch (error) {
      logger.error('Error saving settings:', error);
    }
  };

  // File validation errors
  const fileErrors = fileRejections.map(({ file, errors }) => (
    <div key={file.name} className="text-red-400 text-sm py-1">
      <AlertCircle className="w-4 h-4 inline mr-1" />
      {file.name}: {errors.map(e => e.message).join(', ')}
    </div>
  ));

  return (
    <main className="min-h-screen bg-[#0B111F] text-white p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            <span className="text-[#06B6D4]">M</span>oney<span className="text-[#06B6D4]">T</span>rash Transfer
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Secure Cloud Upload Gateway for Professional Photography
          </p>
        </div>
        <div className="flex items-center gap-3">

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-[#131C31] border border-white/10 rounded-lg text-sm text-slate-300 hover:text-white hover:border-white/20 transition-colors flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            History
          </button>
          <div className="bg-[#131C31] rounded-full p-1 border border-white/10 flex items-center">
            <button
              onClick={() => handleModeSwitch("moneytrash")}
              className={clsx(
                "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                mode === "moneytrash"
                  ? "bg-[#06B6D4] text-black shadow-lg shadow-[#06B6D4]/20"
                  : "text-slate-300 hover:text-white"
              )}
            >
              <Smartphone className="w-4 h-4" />
              New Gallery
            </button>
            <button
              onClick={() => handleModeSwitch("sold")}
              className={clsx(
                "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                mode === "sold"
                  ? "bg-[#8B5CF6] text-black shadow-lg shadow-[#8B5CF6]/20"
                  : "text-slate-300 hover:text-white"
              )}
            >
              <HardDrive className="w-4 h-4" />
              Order Backup
            </button>
            <button
              onClick={() => handleModeSwitch("analytics")}
              className={clsx(
                "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                mode === "analytics"
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-300 hover:text-white"
              )}
            >
              <BarChart2 className="w-4 h-4" />
              Analytics
            </button>
          </div>
        </div>
      </header>



      {/* Upload History Panel */}
      {showHistory && uploadHistory.length > 0 && (
        <div className="max-w-6xl mx-auto mb-6 bg-[#131C31] border border-white/10 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
            <History className="w-5 h-5 text-[#06B6D4]" />
            Telemetry Logs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadHistory.map((item) => (
              <div key={item.id} className="flex flex-col py-3 px-4 bg-[#0B111F] rounded-xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#06B6D4]/50 group-hover:bg-[#06B6D4] transition-colors" />
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className={clsx(
                      "w-4 h-4",
                      item.mode === 'moneytrash' ? 'text-[#06B6D4]' : 'text-[#8B5CF6]'
                    )} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {item.mode === 'moneytrash' ? 'Gallery' : 'Backup'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-sm font-bold text-white mb-1 truncate">{item.eventName}</p>
                <div className="flex justify-between items-end mt-auto pt-2">
                  <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">{item.accessCode}</span>
                  <span className="text-xs font-bold text-[#06B6D4]">{item.fileCount} files</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {mode === 'analytics' ? (
        <div className="bg-[#131C31] border border-white/10 rounded-2xl p-6 shadow-2xl h-[calc(100vh-200px)] overflow-y-auto w-full">
            <Analytics />
        </div>
      ) : (
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Metadata Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#131C31]/50 border border-white/10 p-5 rounded-2xl">
            <h2 className="text-base font-semibold mb-4 text-slate-200 flex items-center gap-2">
              <FileImage className="w-4 h-4" />
              Gallery Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  {mode === 'moneytrash' ? 'Event Name' : 'Order Name'} *
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => {
                    setEventName(e.target.value);
                    if (fieldErrors.eventName) {
                      setFieldErrors(prev => ({ ...prev, eventName: undefined }));
                    }
                  }}
                  placeholder={mode === "moneytrash" ? "Summer Wedding" : "Order #1024"}
                  className={clsx(
                    "w-full bg-black border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none transition-colors",
                    fieldErrors.eventName 
                      ? "border-red-500 focus:border-red-500" 
                      : "border-white/10 focus:border-yellow-500"
                  )}
                />
                {fieldErrors.eventName && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.eventName}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Access Code *
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value.toUpperCase());
                    if (fieldErrors.accessCode) {
                      setFieldErrors(prev => ({ ...prev, accessCode: undefined }));
                    }
                  }}
                  placeholder="WED-2026"
                  className={clsx(
                    "w-full bg-black border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none transition-colors font-mono uppercase",
                    fieldErrors.accessCode 
                      ? "border-red-500 focus:border-red-500" 
                      : "border-white/10 focus:border-yellow-500"
                  )}
                />
                {fieldErrors.accessCode ? (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.accessCode}</p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">Letters, numbers, hyphens only</p>
                )}
              </div>

              {/* Pricing Section (Only for MoneyTrash Mode) */}
              {mode === "moneytrash" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Photo (€)
                      </label>
                      <input
                        type="number"
                        value={singlePhotoPrice}
                        onChange={(e) => setSinglePhotoPrice(e.target.value)}
                        placeholder="10.00"
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Gallery (€)
                      </label>
                      <input
                        type="number"
                        value={fullGalleryPrice}
                        onChange={(e) => setFullGalleryPrice(e.target.value)}
                        placeholder="150.00"
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none transition-colors font-mono"
                      />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/10">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        if (fieldErrors.customerEmail) {
                          setFieldErrors(prev => ({ ...prev, customerEmail: undefined }));
                        }
                      }}
                      placeholder="client@example.com"
                      className={clsx(
                        "w-full bg-black border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none transition-colors",
                        fieldErrors.customerEmail 
                          ? "border-red-500 focus:border-red-500" 
                          : "border-white/10 focus:border-yellow-500"
                      )}
                    />
                    {fieldErrors.customerEmail && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.customerEmail}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="notify"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="w-4 h-4 accent-[#06B6D4] bg-[#131C31] border-white/20 rounded focus:ring-[#06B6D4]"
                    />
                    <label htmlFor="notify" className="text-xs text-slate-300 select-none cursor-pointer">
                      Send "Ready to View" Email
                    </label>
                  </div>
                </>
              )}
              
              {/* Email field for Backup mode (required) */}
              {mode === "sold" && (
                <div className="pt-3 border-t border-white/10">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Customer Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => {
                      setCustomerEmail(e.target.value);
                      if (fieldErrors.customerEmail) {
                        setFieldErrors(prev => ({ ...prev, customerEmail: undefined }));
                      }
                    }}
                    placeholder="client@example.com (required for backup)"
                    className={clsx(
                      "w-full bg-black border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none transition-colors",
                      fieldErrors.customerEmail 
                        ? "border-red-500 focus:border-red-500" 
                        : "border-white/10 focus:border-yellow-500"
                    )}
                  />
                  {fieldErrors.customerEmail && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.customerEmail}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Upload Summary */}
          <div className="bg-[#131C31]/50 border border-white/10 p-5 rounded-2xl">
            <h2 className="text-base font-semibold mb-4 text-slate-200">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-white/10">
                <span className="text-slate-400">Mode</span>
                <span className={mode === "moneytrash" ? "text-[#06B6D4]" : "text-[#8B5CF6]"}>
                  {mode === "moneytrash" ? "Gallery" : "Backup"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/10">
                <span className="text-slate-400">Files</span>
                <span className="text-white font-medium">{files.length}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400">Total Size</span>
                <span className="text-white font-medium">
                  {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}
                </span>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || files.length === 0 || !eventName || !accessCode}
              className="w-full mt-5 bg-white text-black font-bold h-11 rounded-xl hover:bg-[#06B6D4]/80 disabled:opacity-50 disabled:hover:bg-white transition-colors relative overflow-hidden text-sm"
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

            {uploading && activeJobId && (
              <button
                type="button"
                onClick={handleCancelUpload}
                className="w-full mt-3 border border-red-500/50 text-red-300 font-semibold h-10 rounded-xl hover:bg-red-500/10 transition-colors text-sm"
              >
                Cancel Upload
              </button>
            )}

            {uploadStatus && (
              <p className="text-xs text-slate-300 mt-3 text-center">{uploadStatus}</p>
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
                ? "border-yellow-500 bg-[#06B6D4]/5 scale-[1.01]"
                : "border-white/10 bg-[#131C31]/20 hover:border-white/20 hover:bg-[#131C31]/40"
            )}
          >
            <input {...getInputProps()} />

            {files.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                <div className={clsx(
                  "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-2",
                  mode === "moneytrash"
                    ? "bg-[#06B6D4]/10 border-yellow-500/30"
                    : "bg-[#8B5CF6]/10 border-[#8B5CF6]/30"
                )}>
                  {mode === "moneytrash" ? (
                    <Upload className="w-10 h-10 text-[#06B6D4]" />
                  ) : (
                    <FolderUp className="w-10 h-10 text-[#8B5CF6]" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {isDragActive ? "Drop Files Here" : "Drag & Drop Photos"}
                </h3>
                <p className="text-slate-400 max-w-md mx-auto mb-6">
                  {mode === "moneytrash"
                    ? "Drop JPEG, PNG, or HEIC files to create a client proofing gallery."
                    : "Drop entire folders to backup sold orders to secure cloud storage."}
                </p>

                {/* Desktop-native file picker buttons */}
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNativeFileSelect(); }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-sm text-slate-200 transition-colors flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Browse Files
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNativeFolderSelect(); }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-sm text-slate-200 transition-colors flex items-center gap-2"
                  >
                    <MonitorPlay className="w-4 h-4" />
                    Select Folder
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
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
                
                {/* Field validation / file selection error */}
                {fileSelectionError && (
                  <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl max-w-md">
                    <div className="text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {fileSelectionError}
                    </div>
                  </div>
                )}
                
                {/* Required fields hint */}
                {(fieldErrors.eventName || fieldErrors.accessCode || fieldErrors.customerEmail) && (
                  <div className="mt-4 p-3 bg-[#06B6D4]/10 border border-yellow-500/30 rounded-xl max-w-md">
                    <p className="text-[#06B6D4]/80 text-xs">
                      Please fill in all required fields (*) before selecting files
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* File Queue Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#131C31]/50 rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-semibold">
                      Upload Queue ({files.length})
                    </h3>
                    {files.some(f => f.status === 'uploading') && (
                      <span className="text-xs text-[#06B6D4] flex items-center gap-1">
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
                              ? "border-[#8B5CF6]/50 bg-[#8B5CF6]/10"
                              : "border-white/10 bg-[#131C31]"
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
                            <Image className="w-8 h-8 text-slate-500" />
                          </div>
                        )}

                        {/* Progress Overlay */}
                        {uploadFile.status === 'uploading' && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                            <Loader2 className="w-6 h-6 text-[#06B6D4] animate-spin mb-1" />
                            <span className="text-xs text-white font-medium">{uploadFile.progress}%</span>
                            <div className="w-12 h-1 bg-zinc-700 rounded-full mt-1 overflow-hidden">
                              <div
                                className="h-full bg-[#06B6D4] transition-all duration-200"
                                style={{ width: `${uploadFile.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Completed Overlay */}
                        {uploadFile.status === 'completed' && (
                          <div className="absolute inset-0 bg-[#8B5CF6]/20 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-[#8B5CF6]" />
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

                        {uploadFile.status === 'cancelled' && (
                          <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center p-2">
                            <X className="w-6 h-6 text-slate-300 mb-1" />
                            <span className="text-[10px] text-slate-300 text-center leading-tight">
                              Cancelled
                            </span>
                          </div>
                        )}

                        {/* File Info */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6">
                          <p className="text-[10px] text-white truncate leading-tight">
                            {uploadFile.file.name}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            {formatFileSize(uploadFile.size)}
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
                <div className="px-6 py-4 border-t border-white/10 bg-[#131C31]/30 rounded-b-2xl">
                  <p className="text-xs text-slate-400 text-center">
                    Drag more files here or use the Browse buttons to add to queue
                  </p>
                  <div className="flex justify-center gap-3 mt-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNativeFileSelect(); }}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs text-slate-300 transition-colors flex items-center gap-1.5"
                    >
                      <FolderOpen className="w-3 h-3" />
                      Add Files
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNativeFolderSelect(); }}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs text-slate-300 transition-colors flex items-center gap-1.5"
                    >
                      <MonitorPlay className="w-3 h-3" />
                      Add Folder
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </main>
  );
}

export default App;
