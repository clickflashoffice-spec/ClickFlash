import { dialog, net } from "electron";
import { createReadStream, promises as fs } from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { createHash, randomUUID } from "crypto";
import {
  CHUNK_SIZE,
  FileInfo,
  IMAGE_EXTENSIONS,
  MAX_FILE_SIZE,
  fileInfoSchema,
  filePathSchema,
} from "./electron-contract";

const MAX_SELECTED_FILES = 50_000;
const MAX_SCAN_DEPTH = 20;

function mimeFromPath(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  return ({
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".heic": "image/heic", ".webp": "image/webp", ".gif": "image/gif",
    ".raw": "image/x-raw", ".cr2": "image/x-canon-cr2", ".nef": "image/x-nikon-nef",
    ".arw": "image/x-sony-arw",
  } as Record<string, string>)[extension] ?? "application/octet-stream";
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  return value >>> 0;
});

export class ApprovedFileRegistry {
  private readonly approvedPaths = new Set<string>();
  private readonly previews = new Map<string, string>();

  private async approveFile(rawPath: unknown): Promise<FileInfo> {
    const requestedPath = filePathSchema.parse(rawPath);
    const requestedStat = await fs.lstat(requestedPath);
    if (requestedStat.isSymbolicLink()) throw new Error("Symbolic links are not accepted");
    const resolvedPath = await fs.realpath(requestedPath);
    const stat = await fs.lstat(resolvedPath);
    const extension = path.extname(resolvedPath).toLowerCase();
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Selected path is not a regular file");
    if (!IMAGE_EXTENSIONS.has(extension)) throw new Error("Selected file type is not supported");
    if (stat.size === 0) throw new Error("Selected file is empty");
    if (stat.size > MAX_FILE_SIZE) throw new Error("Selected file exceeds the 500 MiB limit");

    const approvalKey = resolvedPath.toLowerCase();
    if (!this.approvedPaths.has(approvalKey) && this.approvedPaths.size >= MAX_SELECTED_FILES) {
      throw new Error("The approved file limit has been reached; restart the app before selecting another batch");
    }
    this.approvedPaths.add(approvalKey);
    const previewToken = randomUUID();
    if (this.previews.size >= MAX_SELECTED_FILES) {
      const oldestToken = this.previews.keys().next().value as string | undefined;
      if (oldestToken) this.previews.delete(oldestToken);
    }
    this.previews.set(previewToken, resolvedPath);
    return fileInfoSchema.parse({
      name: path.basename(resolvedPath),
      path: resolvedPath,
      size: stat.size,
      mimeType: mimeFromPath(resolvedPath),
      previewUrl: `moneytrash-file://preview/${previewToken}`,
    });
  }

  async selectFiles(multiple: boolean): Promise<FileInfo[]> {
    const result = await dialog.showOpenDialog({
      title: "Select Photos to Upload",
      properties: multiple ? ["openFile", "multiSelections"] : ["openFile"],
      filters: [{ name: "Images", extensions: [...IMAGE_EXTENSIONS].map((value) => value.slice(1)) }],
    });
    if (result.canceled) return [];
    return Promise.all(result.filePaths.slice(0, MAX_SELECTED_FILES).map((filePath) => this.approveFile(filePath)));
  }

  async selectFolder(): Promise<FileInfo[] | null> {
    const result = await dialog.showOpenDialog({ title: "Select Folder to Upload", properties: ["openDirectory"] });
    if (result.canceled || !result.filePaths[0]) return null;

    const files: FileInfo[] = [];
    const stack: Array<{ directory: string; depth: number }> = [{ directory: await fs.realpath(result.filePaths[0]), depth: 0 }];
    while (stack.length > 0 && files.length < MAX_SELECTED_FILES) {
      const current = stack.pop()!;
      if (current.depth > MAX_SCAN_DEPTH) continue;
      for (const entry of await fs.readdir(current.directory, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) continue;
        const entryPath = path.join(current.directory, entry.name);
        if (entry.isDirectory()) stack.push({ directory: entryPath, depth: current.depth + 1 });
        else if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
          files.push(await this.approveFile(entryPath));
          if (files.length >= MAX_SELECTED_FILES) break;
        }
      }
    }
    return files;
  }

  async approveDroppedFile(rawPath: unknown): Promise<FileInfo> {
    return this.approveFile(rawPath);
  }

  async requireApprovedPath(rawPath: unknown): Promise<string> {
    const resolvedPath = await fs.realpath(filePathSchema.parse(rawPath));
    if (!this.approvedPaths.has(resolvedPath.toLowerCase())) throw new Error("File was not approved by the operator");
    return resolvedPath;
  }

  async readChunk(rawPath: unknown, offset: number, length: number): Promise<Uint8Array> {
    const filePath = await this.requireApprovedPath(rawPath);
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(length) || length <= 0 || length > CHUNK_SIZE) {
      throw new Error("Invalid chunk range");
    }
    const stat = await fs.stat(filePath);
    if (offset >= stat.size) throw new Error("Chunk offset exceeds file size");
    const size = Math.min(length, stat.size - offset);
    const handle = await fs.open(filePath, "r");
    try {
      const buffer = Buffer.allocUnsafe(size);
      const { bytesRead } = await handle.read(buffer, 0, size, offset);
      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }

  async calculateChecksums(rawPath: unknown): Promise<{ sha256: string; crc32: string; bytesProcessed: number }> {
    const filePath = await this.requireApprovedPath(rawPath);
    const sha256 = createHash("sha256");
    let crc = 0xffffffff;
    let bytesProcessed = 0;
    for await (const chunk of createReadStream(filePath, { highWaterMark: CHUNK_SIZE })) {
      const buffer = chunk as Buffer;
      sha256.update(buffer);
      for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
      bytesProcessed += buffer.length;
    }
    return { sha256: sha256.digest("hex"), crc32: ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0"), bytesProcessed };
  }

  async handlePreviewRequest(url: string): Promise<Response> {
    const token = new URL(url).pathname.split("/").filter(Boolean)[0];
    const filePath = token ? this.previews.get(token) : undefined;
    if (!filePath) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(filePath).toString());
  }

  clear(): void {
    this.approvedPaths.clear();
    this.previews.clear();
  }
}
