import { logger } from '@clickflash/logger';
/**
 * AWS S3 Cloud Storage Integration
 * Provides scalable cloud storage for Money Trash uploads
 * Uses AWS SDK v3
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2Output,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string; // For S3-compatible services (MinIO, etc.)
}

interface UploadResult {
  success: boolean;
  url?: string;
  key: string;
  error?: string;
  etag?: string;
  size: number;
}

interface StorageStats {
  totalSize: number;
  totalObjects: number;
  bucketSize: number;
}

class S3StorageService {
  private s3: S3Client | null = null;
  private bucket: string = "";
  private isConfigured: boolean = false;

  /**
   * Initialize S3 connection
   */
  configure(config: S3Config): void {
    const s3Config = {
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      region: config.region,
    };

    // Support S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
    if (config.endpoint) {
      (s3Config as { endpoint?: string }).endpoint = config.endpoint;
    }

    this.s3 = new S3Client(s3Config);
    this.bucket = config.bucket;
    this.isConfigured = true;
  }

  /**
   * Check if S3 is configured
   */
  isReady(): boolean {
    return this.isConfigured && this.s3 !== null;
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    key: string,
    file: Buffer | Blob,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    if (!this.isReady() || !this.s3) {
      return {
        success: false,
        key,
        error: "S3 not configured",
        size: 0,
      };
    }

    try {
      const fileSize =
        file instanceof Buffer ? file.length : (file as Blob).size;

      const params = {
        Bucket: this.bucket,
        Key: key,
        Body: file,
        Metadata: metadata,
      };

      // Set content type based on file extension
      const contentType = this.getContentType(key);
      if (contentType) {
        (params as { ContentType?: string }).ContentType = contentType;
      }

      await this.s3.send(new PutObjectCommand(params));

      // Generate URL
      const url = await getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: 86400 },
      );

      return {
        success: true,
        key,
        url,
        etag: undefined,
        size: fileSize,
      };
    } catch (error) {
      logger.error("S3 upload failed:", error);
      return {
        success: false,
        key,
        error: error instanceof Error ? error.message : "Upload failed",
        size: 0,
      };
    }
  }

  /**
   * Upload a file with progress tracking
   * Note: AWS SDK v3 doesn't have built-in progress, using simple implementation
   */
  async uploadFileWithProgress(
    key: string,
    file: Buffer | Blob,
    onProgress: (progress: {
      loaded: number;
      total: number;
      percentage: number;
    }) => void,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    if (!this.isReady() || !this.s3) {
      return {
        success: false,
        key,
        error: "S3 not configured",
        size: 0,
      };
    }

    try {
      const totalSize =
        file instanceof Buffer ? file.length : (file as Blob).size;

      // Report initial progress
      onProgress({ loaded: 0, total: totalSize, percentage: 0 });

      const params: {
        Bucket: string;
        Key: string;
        Body: Buffer | Blob;
        Metadata?: Record<string, string>;
        ContentType?: string;
      } = {
        Bucket: this.bucket,
        Key: key,
        Body: file,
        Metadata: metadata,
      };

      const contentType = this.getContentType(key);
      if (contentType) {
        params.ContentType = contentType;
      }

      await this.s3.send(new PutObjectCommand(params));

      // Report completion
      onProgress({ loaded: totalSize, total: totalSize, percentage: 100 });

      // Generate URL
      const url = await getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: 86400 },
      );

      return {
        success: true,
        key,
        url,
        etag: undefined,
        size: totalSize,
      };
    } catch (error) {
      logger.error("S3 upload with progress failed:", error);
      return {
        success: false,
        key,
        error: error instanceof Error ? error.message : "Upload failed",
        size: 0,
      };
    }
  }

  /**
   * Download a file from S3
   */
  async downloadFile(key: string): Promise<Buffer | null> {
    if (!this.isReady() || !this.s3) {
      return null;
    }

    try {
      const result = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      if (!result.Body) {
        return null;
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      logger.error("S3 download failed:", error);
      return null;
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<boolean> {
    if (!this.isReady() || !this.s3) {
      return false;
    }

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (error) {
      logger.error("S3 delete failed:", error);
      return false;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    if (!this.isReady() || !this.s3) {
      return false;
    }

    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(prefix?: string): Promise<StorageStats> {
    if (!this.isReady() || !this.s3) {
      return { totalSize: 0, totalObjects: 0, bucketSize: 0 };
    }

    try {
      let totalSize = 0;
      let totalObjects = 0;
      let continuationToken: string | undefined;

      do {
        const result: ListObjectsV2Output = await this.s3.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        );

        result.Contents?.forEach((obj: { Size?: number }) => {
          totalSize += obj.Size || 0;
          totalObjects++;
        });

        continuationToken = result.NextContinuationToken;
      } while (continuationToken);

      return {
        totalSize,
        totalObjects,
        bucketSize: totalSize,
      };
    } catch (error) {
      logger.error("Failed to get storage stats:", error);
      return { totalSize: 0, totalObjects: 0, bucketSize: 0 };
    }
  }

  /**
   * List files with prefix
   */
  async listFiles(prefix: string, maxKeys: number = 1000): Promise<string[]> {
    if (!this.isReady() || !this.s3) {
      return [];
    }

    try {
      const result = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          MaxKeys: maxKeys,
        }),
      );

      return result.Contents?.map((obj) => obj.Key || "") || [];
    } catch (error) {
      logger.error("Failed to list files:", error);
      return [];
    }
  }

  /**
   * Generate a signed URL for temporary access
   */
  async getSignedUrl(
    key: string,
    expiresInSeconds: number = 3600,
  ): Promise<string | null> {
    if (!this.isReady() || !this.s3) {
      return null;
    }

    try {
      return await getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: expiresInSeconds },
      );
    } catch (error) {
      logger.error("Failed to generate signed URL:", error);
      return null;
    }
  }

  /**
   * Get content type from file extension
   */
  private getContentType(key: string): string | undefined {
    const ext = key.split(".").pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      heic: "image/heic",
      heif: "image/heif",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      mp4: "video/mp4",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
    };
    return ext ? contentTypes[ext] : undefined;
  }
}

// Export singleton instance
export const s3StorageService = new S3StorageService();
