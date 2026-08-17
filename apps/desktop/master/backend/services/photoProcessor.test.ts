import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
// photoProcessor.test.ts
import { PhotoProcessor } from "./photoProcessor";
import fs from "fs";

// fs will be mocked via spyOn in beforeEach
// Mock worker_threads to prevent actual worker instantiation
vi.mock("worker_threads", () => ({
  Worker: vi.fn().mockImplementation(() => {
    const listeners: Record<string, Function[]> = {};
    const emitter = {
      on: vi.fn((event, callback) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
        if (event === "online") {
          setTimeout(callback, 5);
        }
      }),
      off: vi.fn((event, callback) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter(cb => cb !== callback);
        }
      }),
      postMessage: vi.fn(() => {
        setTimeout(() => {
          if (listeners["message"]) {
            listeners["message"].forEach(cb => cb({
              success: true,
              assets: { highres: "test.jpg", tiny: "tiny.jpg", thumbnail: "thumb.jpg", preview: "prev.jpg" },
              hash: "fakehash123",
              metadata: { width: 1000, height: 1000, format: "jpeg", orientation: 1 }
            }));
          }
        }, 10);
      }),
      terminate: vi.fn().mockResolvedValue(undefined),
      unref: vi.fn(),
      threadId: Math.floor(Math.random() * 1000),
    };
    return emitter;
  }),
}));

describe("PhotoProcessor Robustness", () => {
  let processor: any;

  beforeEach(() => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "statSync").mockReturnValue({ size: 1024 } as any);
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined as any);
    vi.spyOn(fs.promises, "statfs").mockResolvedValue({ bavail: 10, bsize: 1024*1024*1024 } as any);
    vi.spyOn(fs.promises, "mkdir").mockResolvedValue(undefined);
    vi.spyOn(fs.promises, "access").mockResolvedValue(undefined);
    vi.spyOn(fs.promises, "unlink").mockResolvedValue(undefined);
    vi.spyOn(fs.promises, "rename").mockResolvedValue(undefined);
    vi.spyOn(fs.promises, "copyFile").mockResolvedValue(undefined);

    // Mocking constructor to avoid worker pool initialization
    processor = new PhotoProcessor("/tmp/photos");
  });

  afterEach(() => {
    if (processor) processor.shutdown();
    vi.clearAllMocks();
  });

  test("Should block processing if disk space is < 5GB", async () => {
    // Mock 2GB remaining (2 blocks of 1GB)
    (fs.promises.statfs as vi.Mock).mockResolvedValue({
      bavail: 2,
      bsize: 1024 * 1024 * 1024,
    });

    const file = { filepath: "test.jpg" } as any;

    await expect(
      processor.processPhoto(file, "album1", "photo1"),
    ).rejects.toThrow(/DISK_EXHAUSTED: Only 2.00GB remaining/);
  });

  test("Should proceed if disk space is > 5GB", async () => {
    // Mock 10GB remaining
    (fs.promises.statfs as vi.Mock).mockResolvedValue({
      bavail: 10,
      bsize: 1024 * 1024 * 1024,
    });

    const file = { filepath: "test.jpg" } as any;

    try {
      await processor.processPhoto(file, "album1", "photo1");
    } catch (err: any) {
      // Should not be DISK_EXHAUSTED
      expect(err.message).not.toContain("DISK_EXHAUSTED");
    }
  });
});
