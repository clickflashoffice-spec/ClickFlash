// photoProcessor.test.ts
import { PhotoProcessor } from "./photoProcessor";
import fs from "fs";

// Mock fs
jest.mock("fs", () => {
  const actualFs = jest.requireActual("fs");
  return {
    ...actualFs,
    existsSync: jest.fn().mockReturnValue(true),
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
    const emitter = {
      on: jest.fn(),
      postMessage: jest.fn(),
      terminate: jest.fn(),
      unref: jest.fn(),
    };

    // Auto-resolve postMessage by triggering 'message' event on next tick
    emitter.postMessage.mockImplementation(() => {
      // Simulate success callback
      const callback = emitter.on.mock.calls.find(
        (call: any) => call[0] === "message",
      )?.[1];
      if (callback) {
        setTimeout(() => callback({ success: true, assets: {} }), 10);
      }
    });

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
