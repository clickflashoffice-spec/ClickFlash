import { useState, useCallback, useEffect } from 'react';
import { desktopBatchUploadService } from '@/services/desktopBatchUploadService';
import { env } from '@/utils/env';
import { cloudApiService } from '@/services/cloudApiService';
import { initTauriApi, isTauri, invoke } from '@/services/tauriService';
import { useVRAMProtection } from '@/hooks/useVRAMProtection';
import { UploadFile, UploadHistoryItem, AppSettings, FileInfo } from '@/types';
import { logger } from '@/utils/logger';

export const useUploadManager = () => {
  const [mode, setMode] = useState<"moneytrash" | "sold">("moneytrash");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isNativeMode, setIsNativeMode] = useState(true);

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

  // VRAM protection for preview generation
  const { getPreview: getVRAMPreview } = useVRAMProtection({
    maxPreviewsInMemory: 20,
    previewMaxWidth: 400,
    previewMaxHeight: 400,
  });

  // Generate previews with VRAM protection (downsampled)
  const createPreview = useCallback(async (id: string, file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) {
      return '';
    }
    try {
      return await getVRAMPreview(id, file);
    } catch (err) {
      logger.warn('[VRAM] Preview generation failed, using fallback:', { error: err instanceof Error ? err.message : String(err) });
      return '';
    }
  }, [getVRAMPreview]);

  const loadSavedData = useCallback(async () => {
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
      } else {
        logger.info('[MoneyTrash] No saved configuration found, using defaults.');
      }
    } catch (e) {
      logger.error('[MoneyTrash] Error during startup data load:', e as Error);
    }
  }, []);

  // Load saved history and settings on mount
  useEffect(() => {
    initTauriApi();
    // eslint-disable-next-line
    loadSavedData();
  }, [loadSavedData]);

  // Clear file selection error when fields change
  useEffect(() => {
    // eslint-disable-next-line
    setFileSelectionError('');
  }, [mode, eventName, accessCode, customerEmail]);

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

  // Validate required fields before file selection
  const validateForFileSelection = useCallback((): boolean => {
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
  }, [mode, eventName, accessCode, customerEmail]);

  // Native file picker for desktop
  const handleNativeFileSelect = useCallback(async () => {
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
      const selectedFiles = await invoke<FileInfo[]>('select_files', { multiple: true });
      logger.info('[MoneyTrash] Selected files:', { files: selectedFiles as any });

      if (selectedFiles && selectedFiles.length > 0) {
        logger.info(`[MoneyTrash] Processing ${selectedFiles.length} files...`);
        const newFiles: UploadFile[] = await Promise.all(
          selectedFiles.map(async (fileInfo: FileInfo) => {
            logger.info(`[MoneyTrash] Reading file: ${fileInfo.name} (${fileInfo.size} bytes)`);
            const fileData = await invoke<number[]>('read_file', { path: fileInfo.path });
            const blob = new Blob([new Uint8Array(fileData)]);
            const file = new File([blob], fileInfo.name, {
              type: fileInfo.mimeType || 'image/jpeg'
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
        logger.info(`[MoneyTrash] Added ${newFiles.length} files to queue`);
        setFiles((prev) => [...prev, ...newFiles]);
        setFileSelectionError('');
      } else {
        logger.info('[MoneyTrash] No files selected');
      }
    } catch (error) {
      logger.error('[MoneyTrash] Error selecting files:', error as Error);
      setFileSelectionError(`Error selecting files: ${error}`);
    }
  }, [validateForFileSelection, createPreview]);

  // Native folder picker for desktop
  const handleNativeFolderSelect = useCallback(async () => {
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
      
      const selectedFiles = await invoke<FileInfo[] | null>('select_folder');
      logger.info('[MoneyTrash] Folder scan result:', { files: selectedFiles as any });
      
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
      const newFiles: UploadFile[] = await Promise.all(
        selectedFiles.map(async (fileInfo: FileInfo) => {
          logger.info(`[MoneyTrash] Reading file: ${fileInfo.name} (${fileInfo.size} bytes)`);
          const fileData = await invoke<number[]>('read_file', { path: fileInfo.path });
          const blob = new Blob([new Uint8Array(fileData)]);
          const file = new File([blob], fileInfo.name, {
            type: fileInfo.mimeType || 'image/jpeg'
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
      logger.info(`[MoneyTrash] Added ${newFiles.length} files to queue`);
      setFiles((prev) => [...prev, ...newFiles]);
      setFileSelectionError('');
      setUploadStatus('');
    } catch (error) {
      logger.error('[MoneyTrash] Error selecting folder:', error as Error);
      setFileSelectionError(`Error reading folder: ${error}`);
      setUploadStatus('');
    }
  }, [validateForFileSelection, createPreview]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearAllFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const handleModeSwitch = useCallback((newMode: "moneytrash" | "sold") => {
    if (newMode === mode) return;
    
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
  }, [mode]);

  const handleUpload = useCallback(async () => {
    if (!eventName.trim() || !accessCode.trim() || files.length === 0) return;
    
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

          if (isTauri()) {
            invoke('show_notification', {
              title: 'Upload Complete',
              body: `Successfully uploaded ${rawFiles.length} files to ${eventName}`
            }).catch(logger.error);
          }

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

            if (isTauri()) {
              invoke('save_upload_history', { history: updatedHistory }).catch(logger.error);
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
  }, [eventName, accessCode, files, mode, customerEmail, singlePhotoPrice, fullGalleryPrice, settings, isNativeMode, uploadHistory]);

  const saveSettings = useCallback(async () => {
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
      logger.error('Error saving settings:', error as Error);
    }
  }, [eventName, accessCode, mode, customerEmail, singlePhotoPrice, fullGalleryPrice, settings]);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  return {
    mode,
    files,
    uploading,
    overallProgress,
    uploadStatus,
    uploadHistory,
    showHistory,
    showSettings,
    isNativeMode,
    eventName,
    accessCode,
    singlePhotoPrice,
    fullGalleryPrice,
    customerEmail,
    sendNotification,
    fieldErrors,
    fileSelectionError,
    settings,
    setMode,
    setFiles,
    setUploading,
    setOverallProgress,
    setUploadStatus,
    setUploadHistory,
    setShowHistory,
    setShowSettings,
    setIsNativeMode,
    setEventName,
    setAccessCode,
    setSinglePhotoPrice,
    setFullGalleryPrice,
    setCustomerEmail,
    setSendNotification,
    setFieldErrors,
    setFileSelectionError,
    setSettings,
    onDrop,
    handleNativeFileSelect,
    handleNativeFolderSelect,
    removeFile,
    clearAllFiles,
    handleModeSwitch,
    handleUpload,
    saveSettings,
    formatFileSize,
  };
};
