// photoProcessor.test.ts
import { PhotoProcessor } from "./photoProcessor";
import fs from "fs";

// Mock fs
jest.mock("fs", () => {
  const actualFs = jest.requireActual("fs");
  return {
    ...actualFs,
    existsSync: jest.fn().mockReturnValue(true),
    statSync: jest.fn().mockReturnValue({ size: 1024 }),
    mkdirSync: jest.fn(),
    promises: {
      ...actualFs.promises,
      statfs: jest.fn(),
      mkdir: jest.fn().mockResolvedValue(undefined),
      access: jest.fn().mockResolvedValue(undefined),
      unlink: jest.fn().mockResolvedValue(undefined),
      rename: jest.fn().mockResolvedValue(undefined),
      copyFile: jest.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock worker_threads to prevent actual worker instantiation
jest.mock("worker_threads", () => ({
  Worker: jest.fn().mockImplementation(() => {
    const listeners: Record<string, Function[]> = {};
    const emitter = {
      on: jest.fn((event, callback) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
        if (event === "online") {
          setTimeout(callback, 5);
        }
      }),
      off: jest.fn((event, callback) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter(cb => cb !== callback);
        }
      }),
      postMessage: jest.fn(() => {
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
      terminate: jest.fn().mockResolvedValue(undefined),
      unref: jest.fn(),
      threadId: Math.floor(Math.random() * 1000),
    };
    return emitter;
  }),
}));

describe("PhotoProcessor Robustness", () => {
  let processor: any;

  beforeEach(() => {
    // Mocking constructor to avoid worker pool initialization
    processor = new PhotoProcessor("/tmp/photos");
  });

  afterEach(() => {
    if (processor) processor.shutdown();
    jest.clearAllMocks();
  });

  test("Should block processing if disk space is < 5GB", async () => {
    // Mock 2GB remaining (2 blocks of 1GB)
    (fs.promises.statfs as jest.Mock).mockResolvedValue({
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
    (fs.promises.statfs as jest.Mock).mockResolvedValue({
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
