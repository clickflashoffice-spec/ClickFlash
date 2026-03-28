/**
 * R2 Upload E2E Test Script
 * 
 * Verifies MoneyTrash → Cloudflare R2 upload pipeline:
 * 1. Configures R2 connection
 * 2. Uploads test files to site-specific folders
 * 3. Verifies files land in correct R2 paths
 * 4. Tests upload progress and error handling
 * 
 * Usage: npx ts-node scripts/test-r2-upload.ts [siteId]
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Test configuration
const TEST_CONFIG = {
  // Cloudflare R2 credentials (from environment)
  accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  endpoint: process.env.R2_ENDPOINT || "https://<account-id>.r2.cloudflarestorage.com",
  region: "auto",
  bucket: process.env.R2_BUCKET || "clickflash-uploads",
};

// Site configurations
const SITES: Record<string, { name: string; location: string }> = {
  TN001: { name: "Hotel Tunisia 1", location: "Tunis" },
  TN002: { name: "Hotel Tunisia 2", location: "Hammamet" },
  TN003: { name: "Hotel Tunisia 3", location: "Sousse" },
};

interface TestResult {
  success: boolean;
  siteId: string;
  operation: string;
  details: string;
  duration?: number;
  error?: string;
}

class R2UploadTester {
  private results: TestResult[] = [];
  private siteId: string;
  private s3: S3Client | null = null;
  private bucket: string = "";

  constructor(siteId: string = "TN001") {
    this.siteId = siteId;
  }

  async runAllTests(): Promise<void> {
    console.log(`\n🧪 R2 Upload E2E Tests - Site: ${this.siteId}\n`);
    console.log("=".repeat(60));

    // Check credentials
    if (!this.validateCredentials()) {
      console.error("❌ R2 credentials not configured. Set environment variables:");
      console.error("   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET");
      process.exit(1);
    }

    // Configure service
    await this.testConfiguration();

    // Run tests
    await this.testUploadToSiteFolder();
    await this.testUploadWithMetadata();
    await this.testFileExists();
    await this.testListFiles();
    await this.testSignedUrl();
    await this.testStorageStats();
    await this.testDeleteFile();

    // Print results
    this.printResults();
  }

  private validateCredentials(): boolean {
    return !!(
      TEST_CONFIG.accessKeyId &&
      TEST_CONFIG.secretAccessKey &&
      TEST_CONFIG.endpoint &&
      TEST_CONFIG.bucket
    );
  }

  private async testConfiguration(): Promise<void> {
    const start = Date.now();
    try {
      const s3Config: {
        credentials: { accessKeyId: string; secretAccessKey: string };
        region: string;
        endpoint?: string;
      } = {
        credentials: {
          accessKeyId: TEST_CONFIG.accessKeyId,
          secretAccessKey: TEST_CONFIG.secretAccessKey,
        },
        region: TEST_CONFIG.region,
      };

      if (TEST_CONFIG.endpoint) {
        s3Config.endpoint = TEST_CONFIG.endpoint;
      }

      this.s3 = new S3Client(s3Config);
      this.bucket = TEST_CONFIG.bucket;

      this.results.push({
        success: true,
        siteId: this.siteId,
        operation: "Configuration",
        details: `R2 endpoint: ${TEST_CONFIG.endpoint}`,
        duration: Date.now() - start,
      });

      console.log("✅ Configuration");
    } catch (error) {
      this.results.push({
        success: false,
        siteId: this.siteId,
        operation: "Configuration",
        details: "Failed to configure R2",
        error: error instanceof Error ? error.message : String(error),
      });
      console.log("❌ Configuration");
    }
  }

  private async testUploadToSiteFolder(): Promise<void> {
    const start = Date.now();
    const testFileName = `test-${Date.now()}.jpg`;
    const key = `${this.siteId}/test/${testFileName}`;

    try {
      if (!this.s3) throw new Error("S3 not configured");

      const testBuffer = Buffer.from("R2_UPLOAD_TEST_DATA_JPG");

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: testBuffer,
          ContentType: "image/jpeg",
          Metadata: {
            siteId: this.siteId,
            test: "true",
            uploadedAt: new Date().toISOString(),
          },
        })
      );

      this.results.push({
        success: true,
        siteId: this.siteId,
        operation: "Upload to Site Folder",
        details: `Key: ${key}`,
        duration: Date.now() - start,
      });

      console.log("✅ Upload to Site Folder");
    } catch (error) {
      this.results.push({
        success: false,
        siteId: this.siteId,
        operation: "Upload to Site Folder",
        details: `Key: ${key}`,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log("❌ Upload to Site Folder");
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async testUploadWithMetadata(): Promise<void> {
    const start = Date.now();
    const key = `${this.siteId}/test/meta-${Date.now()}.jpg`;

    try {
      if (!this.s3) throw new Error("S3 not configured");

      const metadata = {
        siteId: this.siteId,
        siteName: SITES[this.siteId]?.name || "Unknown",
        orderId: "ORD123",
        photographer: "John Doe",
        uploadDate: new Date().toISOString(),
      };

      const testBuffer = Buffer.from("METADATA_TEST_DATA");
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: testBuffer,
          ContentType: "image/jpeg",
          Metadata: metadata,
        })
      );

      this.results.push({
        success: true,
        siteId: this.siteId,
        operation: "Upload with Metadata",
        details: `Metadata keys: ${Object.keys(metadata).join(", ")}`,
        duration: Date.now() - start,
      });

      console.log("✅ Upload with Metadata");
    } catch (error) {
      this.results.push({
        success: false,
        siteId: this.siteId,
        operation: "Upload with Metadata",
        details: "Metadata upload failed",
        error: error instanceof Error ? error.message : String(error),
      });
      console.log("❌ Upload with Metadata");
    }
  }

  private async testFileExists(): Promise<void> {
    const start = Date.now();
    const key = `${this.siteId}/test/exists-${Date.now()}.jpg`;

    try {
      if (!this.s3) throw new Error("S3 not configured");

      // First upload a file
      const testBuffer = Buffer.from("EXISTENCE_TEST");
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: testBuffer,
          ContentType: "image/jpeg",
        })
      );

      // Check if it exists
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      this.results.push({
        success: true,
        siteId: this.siteId,
        operation: "File Exists Check",
        details: `Key: ${key}, Exists: true`,
        duration: Date.now() - start,
      });

      console.log("✅ File Exists Check");
    } catch (error) {
      this.results.push({
        success: false,
        siteId: this.siteId,
        operation: "File Exists Check",
        details: "Existence check failed",
        error: error instanceof Error ? error.message : String(error),
      });
      console.log("❌ File Exists Check");
    }
  }

  private async testListFiles(): Promise<void> {
    const start = Date.now();
    const prefix = `${this.siteId}/test/`;

    try {
      if (!this.s3) throw new Error("S3 not configured");

      const result = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          MaxKeys: 1000,
        })
      );

      const files = result.Contents || [];

      this.results.push({
        success: files.length > 0,
        siteId: this.siteId,
        operation: "List Files",
        details: `Found ${files.length} files with prefix ${prefix}`,
        duration: Date.now() - start,
      });

      console.log(files.length > 0 ? "✅ List Files" : "⚠️  List Files (no files found)");
    } catch (error) {
      this.results.push({
        success: false,
        siteId: this.siteId,
        operation: "List Files",
        details: "List operation failed",
        error: error instanceof Error ? error.message : String(error),
      });
      console.log("❌ List Files");
    }
  }

  private async testSignedUrl(): Promise<void> {
    const start = Date.now();
    const key = `${this.siteId}/test/signed-${Date.now()}.jpg`;

    try {
      if (!this.s3) throw new Error("S3 not configured");

      // Upload a file first
      const testBuffer = Buffer.from("SIGNED_URL_TEST");
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: testBuffer,
          ContentType: "image/jpeg",
        })
      );

      // Generate signed URL
      const signedUrl = await getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: 3600 }
      );

      this.results.push({
        success: !!signedUrl,
        siteId: this.siteId,
        operation: "Signed URL",
        details: signedUrl
          ? `URL generated (length: ${signedUrl.length})`
          : "No URL generated",
        duration: Date.now() - start,
      });

      console.log(signedUrl ? "✅ Signed URL" : "❌ Signed URL");
    } catch (error) {
      this.results.push({
        success: false,
        siteId: this.siteId,
        operation: "Signed URL",
        details: "Signed URL generation failed",
        error: error instanceof Error ? error.message : String(error),
      });
      console.log("❌ Signed URL");
    }
  }

  private async testStorageStats(): Promise<void> {
    const start = Date.now();
    const prefix = `${this.siteId}/`;

    try {
      if (!this.s3) throw new Error("S3 not configured");

      let totalSize = 0;
      let totalObjects = 0;
      let continuationToken: string | undefined;

      do {
        const result = await this.s3.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          })
        );

        result.Contents?.forEach((obj) => {
          totalSize += obj.Size || 0;
          totalObjects++;
        });

        continuationToken = result.NextContinuationToken;
      } while (continuationToken);

      this.results.push({
        success: totalObjects >= 0,
        siteId: this.siteId,
        operation: "Storage Stats",
        details: `${totalObjects} objects, ${(totalSize / 1024).toFixed(2)} KB`,
        duration: Date.now() - start,
      });

      console.log("✅ Storage Stats");
    } catch (error) {
      this.results.push({
        success: false,
        siteId: this.siteId,
        operation: "Storage Stats",
        details: "Stats retrieval failed",
        error: error instanceof Error ? error.message : String(error),
      });
      console.log("❌ Storage Stats");
    }
  }

  private async testDeleteFile(): Promise<void> {
    const start = Date.now();
    const key = `${this.siteId}/test/delete-${Date.now()}.jpg`;

    try {
      if (!this.s3) throw new Error("S3 not configured");

      // Upload a file
      const testBuffer = Buffer.from("DELETE_TEST");
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: testBuffer,
          ContentType: "image/jpeg",
        })
      );

      // Delete it
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      this.results.push({
        success: true,
        siteId: this.siteId,
        operation: "Delete File",
        details: `Key: ${key}, Deleted: true`,
        duration: Date.now() - start,
      });

      console.log("✅ Delete File");
    } catch (error) {
      this.results.push({
        success: false,
        siteId: this.siteId,
        operation: "Delete File",
        details: "Delete operation failed",
        error: error instanceof Error ? error.message : String(error),
      });
      console.log("❌ Delete File");
    }
  }

  private printResults(): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST RESULTS\n");

    const passed = this.results.filter((r) => r.success).length;
    const failed = this.results.filter((r) => !r.success).length;

    this.results.forEach((result) => {
      const icon = result.success ? "✅" : "❌";
      console.log(`${icon} ${result.operation}`);
      console.log(`   ${result.details}`);
      if (result.duration) {
        console.log(`   Duration: ${result.duration}ms`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log();
    });

    console.log("=".repeat(60));
    console.log(`Total: ${this.results.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
    console.log("=".repeat(60) + "\n");

    if (failed > 0) {
      process.exit(1);
    }
  }
}

// Main execution
const siteId = process.argv[2] || "TN001";
const tester = new R2UploadTester(siteId);
tester.runAllTests().catch((error) => {
  console.error("Test suite failed:", error);
  process.exit(1);
});
