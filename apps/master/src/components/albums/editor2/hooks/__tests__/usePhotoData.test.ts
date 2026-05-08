/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePhotoData } from "../usePhotoData";
import { apiService, resetApiMocks } from "@/services/__mocks__/apiService";

// Mock the actual apiService module
jest.mock("@/services/apiService", () => ({
  apiService: require("@/services/__mocks__/apiService").apiService,
}));

// Mock logger
jest.mock("@/utils/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("usePhotoData", () => {
  // Suppress expected act() warnings for async useEffect state updates
  // These are a known React 19 behavior and don't indicate test failures
  const originalError = console.error;

  beforeAll(() => {
    console.error = (...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("not wrapped in act(")
      ) {
        return; // Suppress expected warnings
      }
      originalError.call(console, ...args);
    };
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    resetApiMocks();
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with loading state", () => {
      const { result } = renderHook(() => usePhotoData("album-1"));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.photos).toEqual([]);
      expect(result.current.album).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("should not fetch if albumId is empty", () => {
      renderHook(() => usePhotoData(""));

      expect(apiService.getAlbum).not.toHaveBeenCalled();
      expect(apiService.getPhotosPaginated).not.toHaveBeenCalled();
    });
  });

  describe("Data Fetching", () => {
    it("should fetch album and photos on mount", async () => {
      const { result } = renderHook(() => usePhotoData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiService.getAlbum).toHaveBeenCalledWith("album-1");
      expect(apiService.getPhotosPaginated).toHaveBeenCalledWith(
        1,
        1000,
        "album-1",
      );
      expect(result.current.photos).toHaveLength(3);
      expect(result.current.album).toBeDefined();
    });

    it("should set photos from response items", async () => {
      const { result } = renderHook(() => usePhotoData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.photos[0].id).toBe("photo-1");
      expect(result.current.photos[1].id).toBe("photo-2");
      expect(result.current.photos[2].id).toBe("photo-3");
    });

    it("should set album from response", async () => {
      const { result } = renderHook(() => usePhotoData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.album?.id).toBe("album-1");
      expect(result.current.album?.title).toBe("Test Album");
    });
  });

  describe("Error Handling", () => {
    it("should handle fetch errors", async () => {
      const errorMessage = "Network error";
      apiService.getAlbum.mockRejectedValueOnce(new Error(errorMessage));
      apiService.getPhotosPaginated.mockRejectedValueOnce(
        new Error(errorMessage),
      );

      const { result } = renderHook(() => usePhotoData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe(errorMessage);
    });

    it("should handle non-Error exceptions", async () => {
      apiService.getAlbum.mockRejectedValueOnce("String error");
      apiService.getPhotosPaginated.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => usePhotoData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Unknown error loading data");
    });

    it("should clear error on successful refresh", async () => {
      // First call fails
      apiService.getAlbum.mockRejectedValueOnce(new Error("First error"));
      apiService.getPhotosPaginated.mockRejectedValueOnce(
        new Error("First error"),
      );

      const { result } = renderHook(() => usePhotoData("album-1"));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Reset mocks to succeed for next call
      apiService.getAlbum.mockResolvedValueOnce({
        id: "album-1",
        title: "Test Album",
      });
      apiService.getPhotosPaginated.mockResolvedValueOnce({
        items: [],
        totalItems: 0,
        page: 1,
        totalPages: 1,
      });

      // Refresh should clear error
      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe("Refresh", () => {
    it("should refresh data when called", async () => {
      const { result } = renderHook(() => usePhotoData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear mocks to track new calls
      resetApiMocks();

      await act(async () => {
        await result.current.refresh();
      });

      expect(apiService.getAlbum).toHaveBeenCalledTimes(1);
      expect(apiService.getPhotosPaginated).toHaveBeenCalledTimes(1);
    });

    it("should set loading during refresh", async () => {
      // First complete the initial load
      const { result } = renderHook(() => usePhotoData("album-1"));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Now set up controlled promises for refresh
      let resolveAlbum: (value: unknown) => void;
      let resolvePhotos: (value: unknown) => void;

      const albumPromise = new Promise((resolve) => {
        resolveAlbum = resolve;
      });
      const photosPromise = new Promise((resolve) => {
        resolvePhotos = resolve;
      });

      apiService.getAlbum.mockReturnValueOnce(albumPromise);
      apiService.getPhotosPaginated.mockReturnValueOnce(photosPromise);

      // Start refresh
      let refreshPromise: Promise<void>;
      act(() => {
        refreshPromise = result.current.refresh();
      });

      // Should be loading immediately after act
      expect(result.current.isLoading).toBe(true);

      // Resolve the promises
      act(() => {
        resolveAlbum!({ id: "album-1", title: "Test" });
        resolvePhotos!({ items: [], totalItems: 0, page: 1, totalPages: 1 });
      });

      await act(async () => {
        await refreshPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("Album ID Changes", () => {
    it("should refetch when albumId changes", async () => {
      const { result, rerender } = renderHook(
        ({ albumId }) => usePhotoData(albumId),
        { initialProps: { albumId: "album-1" } },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiService.getAlbum).toHaveBeenCalledWith("album-1");

      // Change albumId
      rerender({ albumId: "album-2" });

      await waitFor(() => {
        expect(apiService.getAlbum).toHaveBeenCalledWith("album-2");
      });

      expect(apiService.getAlbum).toHaveBeenCalledTimes(2);
    });

    it("should not refetch if albumId is the same", async () => {
      const { result, rerender } = renderHook(
        ({ albumId }) => usePhotoData(albumId),
        { initialProps: { albumId: "album-1" } },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCount = apiService.getAlbum.mock.calls.length;

      // Rerender with same albumId
      rerender({ albumId: "album-1" });

      // Wait a bit to ensure no new fetch
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(apiService.getAlbum).toHaveBeenCalledTimes(callCount);
    });
  });

  describe("Parallel Fetching", () => {
    it("should fetch album and photos in parallel", async () => {
      let albumResolve!: (value: unknown) => void;
      let photosResolve!: (value: unknown) => void;

      const albumPromise = new Promise((resolve) => {
        albumResolve = resolve;
      });
      const photosPromise = new Promise((resolve) => {
        photosResolve = resolve;
      });

      apiService.getAlbum.mockReturnValueOnce(albumPromise);
      apiService.getPhotosPaginated.mockReturnValueOnce(photosPromise);

      const { result } = renderHook(() => usePhotoData("album-1"));

      // Both should be called before either resolves
      expect(apiService.getAlbum).toHaveBeenCalled();
      expect(apiService.getPhotosPaginated).toHaveBeenCalled();

      // Resolve both
      albumResolve({ id: "album-1", title: "Test" });
      photosResolve({ items: [], totalItems: 0, page: 1, totalPages: 1 });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
