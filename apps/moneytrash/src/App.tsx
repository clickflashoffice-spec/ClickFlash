import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FolderUp, CheckCircle, X, Smartphone, HardDrive,
  Image, FileImage, Trash2, AlertCircle, Loader2, History,
  FileCheck, Settings, FolderOpen, MonitorPlay
} from 'lucide-react';
import { clsx } from 'clsx';
import { desktopBatchUploadService } from './services/desktopBatchUploadService';
import { cloudApiService } from './services/cloudApiService';
import { initTauriApi, isTauri, invoke } from './services/tauriService';
import { useVRAMProtection } from './hooks/useVRAMProtection';

interface UploadFile {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  filePath?: string; // Native file path for desktop
}

interface UploadHistoryItem {
  id: string;
  eventName: string;
  accessCode: string;
  fileCount: number;
  timestamp: string;
  mode: 'moneytrash' | 'sold';
}

interface AppSettings {
  apiUrl: string;
  deskId: string;
  autoStartUpload: boolean;
  saveHistory: boolean;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Region?: string;
  s3Bucket?: string;
  s3Endpoint?: string;
}

function App() {
  const [mode, setMode] = useState<"moneytrash" | "sold">("moneytrash");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isNativeMode, setIsNativeMode] = useState(true); // Desktop native file handling

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
    apiUrl: 'http://localhost:8090',
    deskId: '',
    autoStartUpload: false,
    saveHistory: true,
  });

  // Load saved history and settings on mount
  useEffect(() => {
    initTauriApi();
    loadSavedData();
  }, []);

  // Clear file selection error when mode changes
  useEffect(() => {
    setFileSelectionError('');
  }, [mode, eventName, accessCode, customerEmail]);

  const loadSavedData = async () => {
    if (!isTauri()) {
      console.log('[MoneyTrash] Not running in Tauri - skipping native data load');
      return;
    }

    try {
      // 1. Load Upload History
      const history = await invoke<UploadHistoryItem[]>('load_upload_history');
      if (history && history.length > 0) {
        setUploadHistory(history);
      }

      // 2. Load Config (PRE-CONFIGURATION SYNC)
      console.log('[MoneyTrash] Initializing cloud configuration...');
      const config = await invoke<any>('load_upload_config');
      
      if (config) {
        console.log('[MoneyTrash] Pre-configuration found:', config);
        
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
          console.log(`[MoneyTrash] Configuring Cloud API Service for: ${config.apiUrl}`);
          cloudApiService.configure({
            apiUrl: config.apiUrl,
            deskId: config.deskId,
            apiKey: config.apiKey || ''
          });
          
          // Background health check
          cloudApiService.healthCheck()
            .then(health => console.log('[MoneyTrash] Cloud API Health:', health))
            .catch(err => console.error('[MoneyTrash] Cloud API Connectivity Error:', err));
        }
      } else {
        console.log('[MoneyTrash] No saved configuration found, using defaults.');
      }
    } catch (e) {
      console.error('[MoneyTrash] Error during startup data load:', e);
    }
  };

  // VRAM protection for preview generation
  const { getPreview: getVRAMPreview } = useVRAMProtection({
    maxPreviewsInMemory: 20,
    previewMaxWidth: 400,
    previewMaxHeight: 400,
  });

  // Generate previews with VRAM protection (downsampled)
  const createPreview = async (id: string, file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) {
      return '';
    }
    try {
      return await getVRAMPreview(id, file);
    } catch (err) {
      console.warn('[VRAM] Preview generation failed, using fallback:', err);
      return '';
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = await Promise.all(
      acceptedFiles.map(async (file) => {
        const id = crypto.randomUUID();
        return {
          id,
          file,
          preview: await createPreview(id, file),
          progress: 0,
          status: 'pending' as const
        };
      })
    );
    setFiles((prev) => [...prev, ...newFiles]);
  }, [createPreview]);

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

  interface FileInfo {
    name: string;
    path: string;
    size: number;
    mime_type?: string;
  }

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
      console.log('[MoneyTrash] Opening file picker...');
      const selectedFiles = await invoke<FileInfo[]>('select_files', { multiple: true });
      console.log('[MoneyTrash] Selected files:', selectedFiles);

      if (selectedFiles && selectedFiles.length > 0) {
        console.log(`[MoneyTrash] Processing ${selectedFiles.length} files...`);
        // Convert native file paths to File objects using Tauri's fs API
        const newFiles: UploadFile[] = await Promise.all(
          selectedFiles.map(async (fileInfo: FileInfo) => {
            console.log(`[MoneyTrash] Reading file: ${fileInfo.name} (${fileInfo.size} bytes)`);
            // Read file data from native path
            const fileData = await invoke<number[]>('read_file', { path: fileInfo.path });
            const blob = new Blob([new Uint8Array(fileData)]);
            const file = new File([blob], fileInfo.name, {
              type: fileInfo.mime_type || 'image/jpeg'
            });

            return {
              id: crypto.randomUUID(),
              file,
              filePath: fileInfo.path,
              preview: file.type.startsWith('image/') ? await createPreview(crypto.randomUUID(), file) : '',
              progress: 0,
              status: 'pending' as const
            };
          })
        );
        console.log(`[MoneyTrash] Added ${newFiles.length} files to queue`);
        setFiles((prev) => [...prev, ...newFiles]);
        setFileSelectionError('');
      } else {
        console.log('[MoneyTrash] No files selected');
      }
    } catch (error) {
      console.error('[MoneyTrash] Error selecting files:', error);
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
      console.log('[MoneyTrash] Opening folder picker...');
      setUploadStatus('Scanning folder for images...');
      
      const selectedFiles = await invoke<FileInfo[] | null>('select_folder');
      console.log('[MoneyTrash] Folder scan result:', selectedFiles);
      
      if (selectedFiles === null) {
        console.log('[MoneyTrash] No folder selected (cancelled)');
        setUploadStatus('');
        return;
      }
      
      if (selectedFiles.length === 0) {
        console.log('[MoneyTrash] Folder selected but no image files found');
        setFileSelectionError('No image files found in the selected folder. Supported formats: JPEG, PNG, HEIC, WEBP');
        setUploadStatus('');
        return;
      }
      
      console.log(`[MoneyTrash] Found ${selectedFiles.length} image files in folder`);
      // Convert native file paths to File objects using Tauri's fs API
      const newFiles: UploadFile[] = await Promise.all(
        selectedFiles.map(async (fileInfo: FileInfo) => {
          console.log(`[MoneyTrash] Reading file: ${fileInfo.name} (${fileInfo.size} bytes)`);
          // Read file data from native path
          const fileData = await invoke<number[]>('read_file', { path: fileInfo.path });
          const blob = new Blob([new Uint8Array(fileData)]);
          const file = new File([blob], fileInfo.name, {
            type: fileInfo.mime_type || 'image/jpeg'
          });

          return {
            id: crypto.randomUUID(),
            file,
            filePath: fileInfo.path,
            preview: file.type.startsWith('image/') ? await createPreview(crypto.randomUUID(), file) : '',
            progress: 0,
            status: 'pending' as const
          };
        })
      );
      console.log(`[MoneyTrash] Added ${newFiles.length} files to queue`);
      setFiles((prev) => [...prev, ...newFiles]);
      setFileSelectionError('');
      setUploadStatus('');
    } catch (error) {
      console.error('[MoneyTrash] Error selecting folder:', error);
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
  const handleModeSwitch = (newMode: "moneytrash" | "sold") => {
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
    
    console.log(`[MoneyTrash] Switched to ${newMode === 'moneytrash' ? 'Gallery' : 'Backup'} mode - form reset`);
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

    const rawFiles = files.map(f => f.file);
    desktopBatchUploadService.createJob(rawFiles, {
      eventName,
      accessCode,
      mode,
      customerEmail,
      singlePhotoPrice,
      fullGalleryPrice,
      apiUrl: settings.apiUrl,
      useNativePaths: isNativeMode,
      nativePaths: files.map(f => f.filePath).filter((p): p is string => !!p)
    });

    const unsubscribe = desktopBatchUploadService.subscribe((progress) => {
      setOverallProgress(progress.percentage);
      setUploadStatus(progress.status === 'processing'
        ? `Uploading: ${progress.currentFile || 'Wait...'}`
        : progress.status === 'completed'
          ? 'Finalizing album...'
          : 'Upload failed'
      );

      // Update individual file progress
      setFiles(prev => prev.map((f) => {
        if (progress.currentFile && f.file.name === progress.currentFile) {
          return { ...f, status: 'uploading' as const };
        }
        return f;
      }));

      if (progress.status === 'completed' || progress.status === 'failed') {
        setUploading(false);
        unsubscribe();

        if (progress.status === 'completed') {
          setUploadStatus('Upload complete!');

          // Show notification (only in Tauri)
          if (isTauri()) {
            invoke('show_notification', {
              title: 'Upload Complete',
              body: `Successfully uploaded ${rawFiles.length} files to ${eventName}`
            }).catch(console.error);
          }

          // Add to history
          if (settings.saveHistory) {
            const newHistoryItem = {
              id: crypto.randomUUID(),
              eventName,
              accessCode,
              fileCount: rawFiles.length,
              timestamp: new Date().toISOString(),
              mode
            };
            const updatedHistory = [newHistoryItem, ...uploadHistory].slice(0, 10);
            setUploadHistory(updatedHistory);

            // Save to persistent storage (only in Tauri)
            if (isTauri()) {
              invoke('save_upload_history', { history: updatedHistory }).catch(console.error);
            }
          }

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

  const saveSettings = async () => {
    try {
      if (isTauri()) {
        await invoke('save_upload_config', {
          config: {
            event_name: eventName,
            access_code: accessCode,
            mode,
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
      console.error('Error saving settings:', error);
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
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            History
          </button>
          <div className="bg-zinc-900 rounded-full p-1 border border-zinc-800 flex items-center">
            <button
              onClick={() => handleModeSwitch("moneytrash")}
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
              onClick={() => handleModeSwitch("sold")}
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

      {/* Settings Panel */}
      {showSettings && (
        <div className="max-w-6xl mx-auto mb-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-zinc-300 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Application Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                  Cloud Hub URL (API)
                </label>
                <input
                  type="text"
                  value={settings.apiUrl}
                  onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                  placeholder="https://cloud.clickflash.app"
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                  Station ID (Desk ID)
                </label>
                <input
                  type="text"
                  value={settings.deskId}
                  onChange={(e) => setSettings({ ...settings, deskId: e.target.value.toUpperCase() })}
                  placeholder="STATION-01"
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none transition-colors font-mono"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Cloud Storage (S3/R2)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="password"
                    value={settings.s3AccessKey || ''}
                    onChange={(e) => setSettings({ ...settings, s3AccessKey: e.target.value })}
                    placeholder="Access Key"
                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
                  />
                  <input
                    type="password"
                    value={settings.s3SecretKey || ''}
                    onChange={(e) => setSettings({ ...settings, s3SecretKey: e.target.value })}
                    placeholder="Secret Key"
                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={settings.s3Region || ''}
                    onChange={(e) => setSettings({ ...settings, s3Region: e.target.value })}
                    placeholder="Region (e.g. auto)"
                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={settings.s3Bucket || ''}
                    onChange={(e) => setSettings({ ...settings, s3Bucket: e.target.value })}
                    placeholder="Bucket Name"
                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.saveHistory}
                    onChange={(e) => setSettings({ ...settings, saveHistory: e.target.checked })}
                    className="w-4 h-4 accent-yellow-500"
                  />
                  <span className="text-sm text-zinc-400">Save upload history locally</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNativeMode}
                    onChange={(e) => setIsNativeMode(e.target.checked)}
                    className="w-4 h-4 accent-yellow-500"
                  />
                  <span className="text-sm text-zinc-400">Enable High-Performance Native Picker</span>
                </label>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-medium rounded-lg text-sm transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

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
                      : "border-zinc-800 focus:border-yellow-500"
                  )}
                />
                {fieldErrors.eventName && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.eventName}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
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
                      : "border-zinc-800 focus:border-yellow-500"
                  )}
                />
                {fieldErrors.accessCode ? (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.accessCode}</p>
                ) : (
                  <p className="text-xs text-zinc-600 mt-1">Letters, numbers, hyphens only</p>
                )}
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
                          : "border-zinc-800 focus:border-yellow-500"
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
                      className="w-4 h-4 accent-yellow-500 bg-zinc-900 border-zinc-700 rounded focus:ring-yellow-500"
                    />
                    <label htmlFor="notify" className="text-xs text-zinc-400 select-none cursor-pointer">
                      Send "Ready to View" Email
                    </label>
                  </div>
                </>
              )}
              
              {/* Email field for Backup mode (required) */}
              {mode === "sold" && (
                <div className="pt-3 border-t border-zinc-800">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
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
                        : "border-zinc-800 focus:border-yellow-500"
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
                          <p className="text-[9px] text-zinc-500">
                            {formatFileSize(uploadFile.file.size)}
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
        </div>
      </div>
    </main>
  );
}

export default App;
