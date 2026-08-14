import AlbumService from "../../services/albumService";

// Mock dependencies
const mockDbManager = {
  get: jest.fn(),
  run: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockRealtimeService = {
  broadcast: jest.fn(),
};

describe("AlbumService", () => {
  let service: AlbumService;

  beforeEach(() => {
    service = new AlbumService({
      dbManager: mockDbManager as any,
      logger: mockLogger as any,
      realtimeService: mockRealtimeService as any,
    });
    jest.clearAllMocks();
  });

  describe("registerPhoto", () => {
    it("should correctly register a photo, inherit photographerId, assign cover, and broadcast", () => {
      // Setup Mocks
      const newPhoto = {
        id: "photo-1",
        albumId: "album-1",
        url: "/test/photo.jpg",
        previewUrl: "/test/preview.jpg",
      };

      // Mock DB for Photographer Inheritance
      mockDbManager.get.mockImplementation((query, _params) => {
        if (query.includes("photographerId")) {
          // Simulating the album has photographer 'admin'
          return { photographerId: "admin" };
        }
        if (query.includes("coverPhotoUrl")) {
          // Simulating the album does NOT currently have a cover
          return { coverPhotoUrl: null };
        }
        return null;
      });

      // Execute
      service.registerPhoto(newPhoto);

      // Verify Insert Photo
      expect(mockDbManager.run).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO photos"),
        expect.arrayContaining([
          "photo-1",
          "album-1",
          "/test/photo.jpg",
          "admin",
        ]),
      );

      // Verify Ensure Cover Photo
      expect(mockDbManager.run).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE albums SET coverPhotoUrl"),
        expect.arrayContaining(["/test/preview.jpg", "album-1"]),
      );

      // Verify Realtime Broadcast
      expect(mockRealtimeService.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: "photos",
          action: "create",
          record: expect.objectContaining({
            id: "photo-1",
            photographerId: "admin",
          }),
        }),
      );
    });

    it("should not update cover if it already exists", () => {
      const newPhoto = {
        id: "photo-2",
        albumId: "album-1",
        url: "/test/photo.jpg",
      };

      mockDbManager.get.mockImplementation((query, _params) => {
        if (query.includes("photographerId")) {
          return { photographerId: "admin" };
        }
        if (query.includes("coverPhotoUrl")) {
          // Simulating the album DOES have a cover
          return { coverPhotoUrl: "/existing/cover.jpg" };
        }
        return null;
      });

      // Execute
      service.registerPhoto(newPhoto);

      // Verify Insert Photo
      expect(mockDbManager.run).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO photos"),
        expect.anything(),
      );

      // Verify Ensure Cover Photo (SHOULD NOT BE CALLED)
      expect(mockDbManager.run).not.toHaveBeenCalledWith(
        expect.stringContaining("UPDATE albums SET coverPhotoUrl"),
        expect.anything(),
      );
    });
  });
});
