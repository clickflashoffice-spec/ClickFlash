import { app } from "electron";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  CHUNK_SIZE,
  ChunkUploadRequest,
  NativeUploadRequest,
  UploadMetadata,
  UploadProgress,
  UploadResult,
  analyticsRangeSchema,
  chunkUploadSchema,
  nativeUploadSchema,
  sessionIdSchema,
  uploadMetadataSchema,
} from "./electron-contract";
import { ApprovedFileRegistry } from "./electron-files";
import { parseApprovedApiUrl } from "./electron-security";
import { loadUploadConfigInternal } from "./electron-storage";

const DEFAULT_API_URL = "https://moneytrash-api.clickflash-office.workers.dev";
const MAX_RESPONSE_BYTES = 64 * 1024;
const tokenSchema = z.object({ token: z.string().min(1).max(16_384) });
const initSchema = z.object({ sessionId: z.string().min(1).max(256) });

interface BufferedSession {
  filePath: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  received: Set<number>;
  metadata: UploadMetadata;
}

const finalizeSchema = z.object({
  sessionId: sessionIdSchema,
  apiUrl: z.string().url().max(2048).optional(),
  metadata: uploadMetadataSchema,
}).strict();

function sleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason ?? new Error("Upload cancelled"));
    }, { once: true });
  });
}

async function responseText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_RESPONSE_BYTES) throw new Error("API response exceeded the safety limit");
  const value = await response.text();
  if (Buffer.byteLength(value, "utf8") > MAX_RESPONSE_BYTES) {
    throw new Error("API response exceeded the safety limit");
  }
  return value;
}

async function responseJson(response: Response, operation: string): Promise<unknown> {
  const value = await responseText(response);
  if (!response.ok) {
    let detail = value.slice(0, 500);
    try {
      const parsed = JSON.parse(value) as { error?: unknown };
      if (typeof parsed.error === "string") detail = parsed.error.slice(0, 500);
    } catch {
      // The bounded plain-text response is safe to include as diagnostic context.
    }
    throw new Error(`${operation} failed (${response.status}): ${detail || response.statusText}`);
  }
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    throw new Error(`${operation} returned invalid JSON`);
  }
}

function requestSignal(controller: AbortController, timeoutMs: number): AbortSignal {
  return AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)]);
}

export class UploadManager {
  private readonly active = new Map<string, AbortController>();
  private readonly progress = new Map<string, UploadProgress>();
  private readonly buffered = new Map<string, BufferedSession>();

  constructor(
    private readonly files: ApprovedFileRegistry,
    private readonly emitProgress: (progress: UploadProgress) => void,
  ) {}

  private update(progress: UploadProgress): UploadProgress {
    this.progress.set(progress.sessionId, progress);
    this.emitProgress(progress);
    return progress;
  }

  private beginUpload(sessionId: string): AbortController {
    if (this.active.has(sessionId)) throw new Error("Upload session is already active");
    const controller = new AbortController();
    this.active.set(sessionId, controller);
    return controller;
  }

  private finishUpload(sessionId: string, controller: AbortController): void {
    if (this.active.get(sessionId) === controller) this.active.delete(sessionId);
  }

  private async authenticate(apiUrl: string, deskId: string, apiKey: string, controller: AbortController): Promise<string> {
    if (!deskId || !apiKey) throw new Error("Desk ID and API key are required for cloud uploads");
    const response = await fetch(`${apiUrl}/api/office/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deskId, apiKey }),
      redirect: "error",
      signal: requestSignal(controller, 30_000),
    });
    return tokenSchema.parse(await responseJson(response, "Office verification")).token;
  }

  private async uploadFile(
    filePath: string,
    localSessionId: string,
    requestedApiUrl: string | undefined,
    metadata: UploadMetadata,
    controller: AbortController,
  ): Promise<UploadResult> {
    const config = await loadUploadConfigInternal();
    const apiUrl = parseApprovedApiUrl(requestedApiUrl ?? config?.apiUrl ?? DEFAULT_API_URL);

    const stat = await fs.stat(filePath);
    const fileName = path.basename(filePath);
    const totalChunks = Math.ceil(stat.size / CHUNK_SIZE);
    this.update({
      sessionId: localSessionId,
      chunksReceived: 0,
      totalChunks,
      percentage: 0,
      bytesUploaded: 0,
      totalBytes: stat.size,
      status: "uploading",
    });

    try {
      const token = await this.authenticate(apiUrl, metadata.deskId ?? config?.deskId ?? "", config?.apiKey ?? "", controller);
      const authorization = `Bearer ${token}`;
      const initResponse = await fetch(`${apiUrl}/api/upload/chunk/init`, {
        method: "POST",
        headers: { "Authorization": authorization, "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          fileSize: stat.size,
          totalChunks,
          metadata: {
            event_name: metadata.eventName,
            access_code: metadata.accessCode,
            mode: metadata.mode,
            mime_type: metadata.mimeType,
            customer_email: metadata.customerEmail,
            single_photo_price: metadata.singlePhotoPrice,
            full_gallery_price: metadata.fullGalleryPrice,
          },
        }),
        redirect: "error",
        signal: requestSignal(controller, 30_000),
      });
      const apiSessionId = initSchema.parse(await responseJson(initResponse, "Upload initialization")).sessionId;

      const handle = await fs.open(filePath, "r");
      try {
        let bytesUploaded = 0;
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
          const offset = chunkIndex * CHUNK_SIZE;
          const size = Math.min(CHUNK_SIZE, stat.size - offset);
          const buffer = Buffer.allocUnsafe(size);
          const { bytesRead } = await handle.read(buffer, 0, size, offset);
          if (bytesRead !== size) throw new Error(`Unexpected end of file while reading chunk ${chunkIndex}`);

          for (let attempt = 0; attempt < 3; attempt += 1) {
            const form = new FormData();
            form.append("sessionId", apiSessionId);
            form.append("chunkIndex", String(chunkIndex));
            form.append("chunk", new Blob([Uint8Array.from(buffer)]), `chunk_${chunkIndex}`);
            let chunkResponse: Response;
            try {
              chunkResponse = await fetch(`${apiUrl}/api/upload/chunk`, {
                method: "PUT",
                headers: { "Authorization": authorization },
                body: form,
                redirect: "error",
                signal: requestSignal(controller, 120_000),
              });
            } catch (error) {
              if (controller.signal.aborted || attempt === 2) throw error;
              await sleep(250 * (2 ** attempt), controller.signal);
              continue;
            }
            if (!chunkResponse.ok
              && (chunkResponse.status === 408 || chunkResponse.status === 429 || chunkResponse.status >= 500)
              && attempt < 2) {
              await responseText(chunkResponse);
              await sleep(250 * (2 ** attempt), controller.signal);
              continue;
            }
            await responseJson(chunkResponse, `Chunk ${chunkIndex}`);
            break;
          }

          bytesUploaded += size;
          const chunksReceived = chunkIndex + 1;
          this.update({
            sessionId: localSessionId,
            chunksReceived,
            totalChunks,
            percentage: (chunksReceived / totalChunks) * 100,
            bytesUploaded,
            totalBytes: stat.size,
            status: "uploading",
          });
        }
      } finally {
        await handle.close();
      }

      const finalizeResponse = await fetch(`${apiUrl}/api/upload/chunk/finalize`, {
        method: "PATCH",
        headers: { "Authorization": authorization, "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: apiSessionId }),
        redirect: "error",
        signal: requestSignal(controller, 30_000),
      });
      const finalized = await responseJson(finalizeResponse, "Upload finalization") as Record<string, unknown>;
      this.update({
        sessionId: localSessionId,
        chunksReceived: totalChunks,
        totalChunks,
        percentage: 100,
        bytesUploaded: stat.size,
        totalBytes: stat.size,
        status: "completed",
      });
      return {
        success: true,
        sessionId: localSessionId,
        fileName,
        fileSize: stat.size,
        url: typeof finalized.galleryUrl === "string" ? finalized.galleryUrl : undefined,
      };
    } catch (error) {
      const cancelled = controller.signal.aborted;
      const previous = this.progress.get(localSessionId);
      this.update({
        sessionId: localSessionId,
        chunksReceived: previous?.chunksReceived ?? 0,
        totalChunks,
        percentage: previous?.percentage ?? 0,
        bytesUploaded: previous?.bytesUploaded,
        totalBytes: stat.size,
        status: cancelled ? "cancelled" : "failed",
      });
      throw error;
    }
  }

  async startNativeUpload(rawRequest: unknown): Promise<UploadResult> {
    const request: NativeUploadRequest = nativeUploadSchema.parse(rawRequest);
    const sessionId = request.sessionId ?? randomUUID();
    const controller = this.beginUpload(sessionId);
    try {
      const filePath = await this.files.requireApprovedPath(request.filePath);
      return await this.uploadFile(filePath, sessionId, request.apiUrl, request.metadata, controller);
    } finally {
      this.finishUpload(sessionId, controller);
    }
  }

  async healthCheck(rawApiUrl?: unknown): Promise<unknown> {
    const config = await loadUploadConfigInternal();
    const apiUrl = parseApprovedApiUrl(
      typeof rawApiUrl === "string" ? rawApiUrl : (config?.apiUrl ?? DEFAULT_API_URL),
    );
    const controller = new AbortController();
    const response = await fetch(`${apiUrl}/api/health`, {
      redirect: "error",
      signal: requestSignal(controller, 15_000),
    });
    return responseJson(response, "API health check");
  }

  async getFinancials(rawRequest: unknown): Promise<unknown> {
    const request = analyticsRangeSchema.parse(rawRequest);
    const config = await loadUploadConfigInternal();
    const apiUrl = parseApprovedApiUrl(request.apiUrl ?? config?.apiUrl ?? DEFAULT_API_URL);
    const controller = new AbortController();
    const token = await this.authenticate(apiUrl, config?.deskId ?? "", config?.apiKey ?? "", controller);
    const query = new URLSearchParams({ startDate: request.startDate, endDate: request.endDate });
    const response = await fetch(`${apiUrl}/api/analytics/financials?${query}`, {
      headers: { "Authorization": `Bearer ${token}` },
      redirect: "error",
      signal: requestSignal(controller, 30_000),
    });
    return responseJson(response, "Financial analytics");
  }

  async uploadFileChunk(rawRequest: unknown): Promise<UploadProgress> {
    const request: ChunkUploadRequest = chunkUploadSchema.parse(rawRequest);
    if (request.chunkIndex >= request.totalChunks) throw new Error("Chunk index exceeds total chunks");
    const tempDirectory = path.join(app.getPath("temp"), "moneytrash-uploads");
    await fs.mkdir(tempDirectory, { recursive: true });
    const filePath = path.join(tempDirectory, `${request.sessionId}.tmp`);
    let session = this.buffered.get(request.sessionId);
    if (!session) {
      session = {
        filePath,
        fileName: request.fileName,
        fileSize: request.fileSize,
        totalChunks: request.totalChunks,
        received: new Set<number>(),
        metadata: request.metadata,
      };
      this.buffered.set(request.sessionId, session);
    } else if (session.fileName !== request.fileName || session.fileSize !== request.fileSize || session.totalChunks !== request.totalChunks) {
      throw new Error("Chunk session metadata changed unexpectedly");
    }

    const data = Buffer.from(request.chunkData);
    const maxLength = Math.min(CHUNK_SIZE, request.fileSize - (request.chunkIndex * CHUNK_SIZE));
    if (data.length !== maxLength) throw new Error("Chunk data length is invalid");
    let handle;
    try {
      handle = await fs.open(filePath, "r+");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      handle = await fs.open(filePath, "w+");
    }
    try {
      await handle.write(data, 0, data.length, request.chunkIndex * CHUNK_SIZE);
      await handle.sync();
    } finally {
      await handle.close();
    }
    session.received.add(request.chunkIndex);
    const chunksReceived = session.received.size;
    return this.update({
      sessionId: request.sessionId,
      chunksReceived,
      totalChunks: request.totalChunks,
      percentage: (chunksReceived / request.totalChunks) * 100,
      status: chunksReceived === request.totalChunks ? "completed" : "uploading",
    });
  }

  async finalizeBufferedUpload(rawRequest: unknown): Promise<UploadResult> {
    const request = finalizeSchema.parse(rawRequest);
    const controller = this.beginUpload(request.sessionId);
    try {
      const session = this.buffered.get(request.sessionId);
      if (!session) throw new Error("Upload session was not found");
      if (session.received.size !== session.totalChunks) throw new Error("Upload session has missing chunks");
      const stat = await fs.stat(session.filePath);
      if (stat.size !== session.fileSize) throw new Error("Reassembled file size does not match the upload session");
      return await this.uploadFile(
        session.filePath,
        request.sessionId,
        request.apiUrl,
        request.metadata,
        controller,
      );
    } finally {
      this.finishUpload(request.sessionId, controller);
      this.buffered.delete(request.sessionId);
      await fs.rm(path.join(app.getPath("temp"), "moneytrash-uploads", `${request.sessionId}.tmp`), { force: true });
    }
  }

  getUploadProgress(rawSessionId: unknown): UploadProgress | null {
    return this.progress.get(sessionIdSchema.parse(rawSessionId)) ?? null;
  }

  getActiveUploads(): UploadProgress[] {
    return [...this.progress.values()].filter((value) => value.status === "uploading");
  }

  async cancelUpload(rawSessionId: unknown): Promise<boolean> {
    const sessionId = sessionIdSchema.parse(rawSessionId);
    const controller = this.active.get(sessionId);
    if (controller) controller.abort(new Error("Upload cancelled by operator"));
    const buffered = this.buffered.get(sessionId);
    if (buffered) {
      this.buffered.delete(sessionId);
      await fs.rm(buffered.filePath, { force: true });
    }
    return Boolean(controller || buffered);
  }

  async dispose(): Promise<void> {
    for (const controller of this.active.values()) controller.abort(new Error("Application is shutting down"));
    await Promise.all([...this.buffered.values()].map((session) => fs.rm(session.filePath, { force: true })));
    this.active.clear();
    this.buffered.clear();
  }
}
