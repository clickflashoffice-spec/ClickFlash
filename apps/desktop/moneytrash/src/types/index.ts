/**
 * MoneyTrash Uploader - Type Definitions
 * 
 * Shared TypeScript types and interfaces for the application.
 */

// ============================================================================
// File Types
// ============================================================================

/** File information structure */
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  mimeType?: string;
  previewUrl?: string;
}

/** Upload file with UI state */
export interface UploadFile {
  id: string;
  file: File;
  size: number;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
  filePath?: string;
}

// ============================================================================
// Upload Types
// ============================================================================

/** Upload metadata */
export interface UploadMetadata {
  eventName: string;
  accessCode: string;
  mode: 'moneytrash' | 'sold';
  customerEmail?: string;
  singlePhotoPrice?: string;
  fullGalleryPrice?: string;
  apiUrl?: string;
  deskId?: string;
}

/** Upload progress information */
export interface UploadProgress {
  jobId: string;
  total: number;
  completed: number;
  failed: number;
  percentage: number;
  currentFile?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
}

/** Upload job */
export interface UploadJob {
  id: string;
  files: File[];
  metadata: UploadMetadata;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    currentFile?: string;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errors: Array<{ file: string; error: string }>;
}

// ============================================================================
// History Types
// ============================================================================

/** Upload history item */
export interface UploadHistoryItem {
  id: string;
  eventName: string;
  accessCode: string;
  fileCount: number;
  timestamp: string;
  mode: 'moneytrash' | 'sold';
}

// ============================================================================
// Settings Types
// ============================================================================

/** Application settings */
export interface AppSettings {
  apiUrl: string;
  deskId: string;
  apiKey?: string;
  autoStartUpload: boolean;
  saveHistory: boolean;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Region?: string;
  s3Bucket?: string;
  s3Endpoint?: string;
}

// ============================================================================
// Error Types
// ============================================================================

/** Application error codes */
export type ErrorCode = 
  | 'IO_ERROR'
  | 'NETWORK_ERROR'
  | 'FILE_NOT_FOUND'
  | 'INVALID_PATH'
  | 'SERIALIZATION_ERROR'
  | 'UPLOAD_ERROR'
  | 'CONFIG_ERROR'
  | 'SESSION_ERROR'
  | 'CHUNK_ERROR'
  | 'PERMISSION_DENIED'
  | 'DIRECTORY_NOT_FOUND'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'API_ERROR'
  | 'UNKNOWN_ERROR';

/** Application error */
export interface AppError {
  type: string;
  message: string;
}

/** Command result from Rust */
export type CommandResult<T> = 
  | { status: 'Success'; data: T }
  | { status: 'Error'; error: AppError; code: ErrorCode };

// ============================================================================
// Queue Types
// ============================================================================

/** Queue item status */
export type QueueItemStatus = 
  | 'pending'
  | 'uploading'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

/** Upload queue item */
export interface UploadQueueItem {
  id: string;
  file: File;
  nativePath?: string;
  metadata: UploadMetadata;
  status: QueueItemStatus;
  progress: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  sessionId?: string;
}

/** Queue statistics */
export interface QueueStats {
  total: number;
  pending: number;
  uploading: number;
  completed: number;
  failed: number;
  paused: number;
  cancelled: number;
  totalProgress: number;
}

// ============================================================================
// Network Types
// ============================================================================

/** Network connection status */
export type NetworkStatus = 'online' | 'offline' | 'unknown';

// ============================================================================
// Rust Backend Types
// ============================================================================

/** Rust upload session */
export interface UploadSession {
  sessionId: string;
  fileName: string;
  fileSize: number;
  chunksReceived: number[];
  totalChunks: number;
  metadata: UploadMetadata;
  createdAt: string;
}

/** Rust upload result */
export interface UploadResult {
  success: boolean;
  sessionId: string;
  fileName: string;
  fileSize: number;
  error?: string;
  url?: string;
}

/** Rust validation result */
export interface ValidationResult {
  file: FileInfo;
  valid: boolean;
  error?: string;
}
