import { CloudSyncService } from "../../services/cloudSyncService";

// Mock dependencies
const mockDbManager = {
  get: jest.fn(),
  all: jest.fn(),
  query: jest.fn(),
  run: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockEmailService = {
  sendEmail: jest.fn(),
};

describe("CloudSyncService DLQ", () => {
  let service: CloudSyncService;

  beforeEach(() => {
    service = new CloudSyncService(
      mockDbManager as any,
      mockLogger as any,
      mockEmailService as any
    );
    jest.clearAllMocks();
  });

  describe("replayDeadLetterQueue", () => {
    it("should replay dlq items when online by resetting status and returning count and errors", async () => {
      (service as any)._isConnected = true;
      mockDbManager.run
        .mockReturnValueOnce({ changes: 3 }) // operation_logs changes
        .mockReturnValueOnce({ changes: 2 }); // retention_queue changes

      const result = service.replayDeadLetterQueue();

      expect(result).toEqual({ replayed: 5, errors: [] });
      expect(mockDbManager.run).toHaveBeenCalledTimes(2);
      expect(mockDbManager.run).toHaveBeenNthCalledWith(
        1,
        "UPDATE operation_logs SET status = 'pending', retry_count = 0, error_log = NULL WHERE id IN (SELECT id FROM operation_logs WHERE status = ? LIMIT 50)",
        ["dead_letter"]
      );
      expect(mockDbManager.run).toHaveBeenNthCalledWith(
        2,
        "UPDATE retention_queue SET status = 'pending', retry_count = 0, error_log = NULL WHERE id IN (SELECT id FROM retention_queue WHERE status = ? LIMIT 50)",
        ["dead_letter"]
      );
    });

    it("should replay specific dlq items by ID even if offline", async () => {
      (service as any)._isConnected = false;
      mockDbManager.run
        .mockReturnValueOnce({ changes: 1 })
        .mockReturnValueOnce({ changes: 0 });

      const result = service.replayDeadLetterQueue(["op_1"]);

      expect(result).toEqual({ replayed: 1, errors: [] });
      expect(mockDbManager.run).toHaveBeenNthCalledWith(
        1,
        "UPDATE operation_logs SET status = 'pending', retry_count = 0, error_log = NULL WHERE status = ? AND id IN (?)",
        ["dead_letter", "op_1"]
      );
    });

    it("should handle errors during replay", async () => {
      (service as any)._isConnected = true;
      mockDbManager.run.mockImplementationOnce(() => {
        throw new Error("Database failure");
      });

      const result = service.replayDeadLetterQueue();
      expect(result.replayed).toBe(0);
      expect(result.errors).toContain("Failed to replay DLQ: Database failure");
    });
  });

  describe("getDeadLetterQueue", () => {
    it("should retrieve and combine dlq items from both tables", () => {
      const mockLogs = [
        { id: "1", type: "operation_log", table_name: "albums", action: "insert", record_id: "a1", created_at: "2026-07-01", updated_at: "2026-07-01", error_log: "timeout", retry_count: 3 },
      ];
      const mockRetention = [
        { id: "2", type: "retention_asset", table_name: "a1", action: "UPLOAD", record_id: "p1", created_at: "2026-07-02", updated_at: "2026-07-02", error_log: "404 not found", retry_count: 5 },
      ];

      mockDbManager.query
        .mockReturnValueOnce([{ count: 1 }]) // totalOps
        .mockReturnValueOnce([{ count: 1 }]) // totalReq
        .mockReturnValueOnce(mockLogs) // ops
        .mockReturnValueOnce(mockRetention); // reqs

      const result = service.getDeadLetterQueue();

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({ id: "1", type: "operation_log", action: "insert", error_log: "timeout" });
      expect(result.items[1]).toMatchObject({ id: "2", type: "retention_asset", action: "UPLOAD", error_log: "404 not found" });
    });
  });

  describe("deleteDeadLetterQueueItems", () => {
    it("should delete specified items by id from both tables", () => {
      mockDbManager.run
        .mockReturnValueOnce({ changes: 1 }) // ops
        .mockReturnValueOnce({ changes: 1 }); // reqs

      const result = service.deleteDeadLetterQueueItems(["id1", "id2"]);

      expect(result).toEqual({ deleted: 2 });
      expect(mockDbManager.run).toHaveBeenCalledTimes(2);
      expect(mockDbManager.run).toHaveBeenNthCalledWith(
        1,
        "DELETE FROM operation_logs WHERE status = ? AND id IN (?,?)",
        ["dead_letter", "id1", "id2"]
      );
      expect(mockDbManager.run).toHaveBeenNthCalledWith(
        2,
        "DELETE FROM retention_queue WHERE status = ? AND id IN (?,?)",
        ["dead_letter", "id1", "id2"]
      );
    });
  });
});
