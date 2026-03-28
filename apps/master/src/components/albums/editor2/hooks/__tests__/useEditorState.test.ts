/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useEditorState } from "../useEditorState";
import { Photo, ManualEdits } from "@/types";
import { INITIAL_EDITS } from "@/utils/styleUtils";

// Mock photos for testing
const createMockPhoto = (
  id: string,
  overrides: Partial<Photo> = {},
): Photo => ({
  id,
  albumId: "album-1",
  url: `https://example.com/${id}.jpg`,
  title: `Photo ${id}`,
  photographerId: "user-1",
  manualEdits: null,
  created: "2024-01-01T00:00:00Z",
  updated: "2024-01-01T00:00:00Z",
  ...overrides,
});

const mockPhotos: Photo[] = [
  createMockPhoto("photo-1"),
  createMockPhoto("photo-2", {
    manualEdits: { ...INITIAL_EDITS, exposure: 10 },
  }),
  createMockPhoto("photo-3"),
];

describe("useEditorState", () => {
  describe("Initialization", () => {
    it("should initialize with empty photos array by default", () => {
      const { result } = renderHook(() => useEditorState());

      expect(result.current.state.photos).toEqual([]);
      expect(result.current.state.activePhotoId).toBeNull();
      expect(result.current.state.isDirty).toBe(false);
      expect(result.current.state.dirtyPhotoIds.size).toBe(0);
      expect(result.current.state.activeTool).toBe("adjust");
    });

    it("should initialize with provided photos", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      expect(result.current.state.photos).toHaveLength(3);
      expect(result.current.state.photos[0].id).toBe("photo-1");
    });

    it("should initialize edits from photo manualEdits", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      // Photo 1 has null manualEdits, should get INITIAL_EDITS
      expect(result.current.state.edits["photo-1"]).toEqual(INITIAL_EDITS);

      // Photo 2 has manualEdits with exposure: 10
      expect(result.current.state.edits["photo-2"].exposure).toBe(10);
    });
  });

  describe("Photo Management", () => {
    it("should set active photo", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      act(() => {
        result.current.actions.setActivePhoto("photo-2");
      });

      expect(result.current.state.activePhotoId).toBe("photo-2");
      expect(result.current.activePhoto?.id).toBe("photo-2");
    });

    it("should reset history when switching photos", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      // Make an edit to build history
      act(() => {
        result.current.actions.setActivePhoto("photo-1");
        result.current.actions.updateEdit({ exposure: 20 });
      });

      expect(result.current.state.history.past).toHaveLength(1);

      // Switch photos - history should reset
      act(() => {
        result.current.actions.setActivePhoto("photo-2");
      });

      expect(result.current.state.history.past).toHaveLength(0);
      expect(result.current.state.history.future).toHaveLength(0);
    });

    it("should set photos and preserve dirty edits", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      // Make an edit to mark as dirty
      act(() => {
        result.current.actions.setActivePhoto("photo-1");
        result.current.actions.updateEdit({ exposure: 20 });
      });

      expect(result.current.state.dirtyPhotoIds.has("photo-1")).toBe(true);

      // Update photos - dirty edits should be preserved
      const newPhotos = [
        createMockPhoto("photo-1", { title: "Updated Title" }),
      ];

      act(() => {
        result.current.actions.setPhotos(newPhotos);
      });

      // Dirty edit should be preserved
      expect(result.current.state.edits["photo-1"].exposure).toBe(20);
      expect(result.current.state.dirtyPhotoIds.has("photo-1")).toBe(true);
    });

    it("should update non-dirty photos when setting new photos", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      // Don't make any edits - photo-1 is not dirty

      // Set new photos with different manualEdits
      const newPhotos = [
        createMockPhoto("photo-1", {
          manualEdits: { ...INITIAL_EDITS, contrast: 15 },
        }),
      ];

      act(() => {
        result.current.actions.setPhotos(newPhotos);
      });

      // Should get the new manualEdits since it wasn't dirty
      expect(result.current.state.edits["photo-1"].contrast).toBe(15);
    });
  });

  describe("Edit Operations", () => {
    it("should update edits for active photo", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      act(() => {
        result.current.actions.setActivePhoto("photo-1");
        result.current.actions.updateEdit({ exposure: 25, contrast: 10 });
      });

      expect(result.current.state.edits["photo-1"].exposure).toBe(25);
      expect(result.current.state.edits["photo-1"].contrast).toBe(10);
      expect(result.current.activeEdits?.exposure).toBe(25);
    });

    it("should mark photo as dirty after edit", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      act(() => {
        result.current.actions.setActivePhoto("photo-1");
        result.current.actions.updateEdit({ exposure: 25 });
      });

      expect(result.current.state.isDirty).toBe(true);
      expect(result.current.state.dirtyPhotoIds.has("photo-1")).toBe(true);
    });

    it("should set complete edits for a photo", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      const newEdits: ManualEdits = {
        ...INITIAL_EDITS,
        exposure: 50,
        contrast: 30,
        saturate: 20,
      };

      act(() => {
        result.current.actions.setEdits("photo-1", newEdits);
      });

      expect(result.current.state.edits["photo-1"]).toEqual(newEdits);
      expect(result.current.state.dirtyPhotoIds.has("photo-1")).toBe(true);
    });

    it("should not update edits if no active photo", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      // Don't set active photo
      act(() => {
        result.current.actions.updateEdit({ exposure: 25 });
      });

      // Should not crash and state should remain unchanged
      expect(result.current.state.edits["photo-1"]).toEqual(INITIAL_EDITS);
    });
  });

  describe("Tool Switching", () => {
    it("should set active tool", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      act(() => {
        result.current.actions.setActiveTool("crop");
      });

      expect(result.current.state.activeTool).toBe("crop");

      act(() => {
        result.current.actions.setActiveTool("retouch");
      });

      expect(result.current.state.activeTool).toBe("retouch");
    });
  });

  describe("Undo/Redo", () => {
    it("should undo last edit", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      act(() => {
        result.current.actions.setActivePhoto("photo-1");
        result.current.actions.updateEdit({ exposure: 20 });
      });

      expect(result.current.state.edits["photo-1"].exposure).toBe(20);
      expect(result.current.canUndo).toBe(true);

      act(() => {
        result.current.actions.undo();
      });

      expect(result.current.state.edits["photo-1"].exposure).toBe(0); // Back to initial
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    it("should redo undone edit", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      act(() => {
        result.current.actions.setActivePhoto("photo-1");
        result.current.actions.updateEdit({ exposure: 20 });
      });

      act(() => {
        result.current.actions.undo();
      });

      expect(result.current.state.edits["photo-1"].exposure).toBe(0);

      act(() => {
        result.current.actions.redo();
      });

      expect(result.current.state.edits["photo-1"].exposure).toBe(20);
      expect(result.current.canRedo).toBe(false);
    });

    it("should clear future history on new edit after undo", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      act(() => {
        result.current.actions.setActivePhoto("photo-1");
        result.current.actions.updateEdit({ exposure: 20 });
        result.current.actions.updateEdit({ contrast: 10 });
      });

      // Undo once
      act(() => {
        result.current.actions.undo();
      });

      expect(result.current.canRedo).toBe(true);

      // Make a new edit - should clear future
      act(() => {
        result.current.actions.updateEdit({ saturate: 30 });
      });

      expect(result.current.canRedo).toBe(false);
      expect(result.current.state.history.future).toHaveLength(0);
    });

    it("should handle multiple undo/redo operations", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      act(() => {
        result.current.actions.setActivePhoto("photo-1");
        result.current.actions.updateEdit({ exposure: 10 });
        result.current.actions.updateEdit({ exposure: 20 });
        result.current.actions.updateEdit({ exposure: 30 });
      });

      expect(result.current.state.edits["photo-1"].exposure).toBe(30);

      // Undo twice
      act(() => {
        result.current.actions.undo();
        result.current.actions.undo();
      });

      expect(result.current.state.edits["photo-1"].exposure).toBe(10);

      // Redo once
      act(() => {
        result.current.actions.redo();
      });

      expect(result.current.state.edits["photo-1"].exposure).toBe(20);
    });
  });

  describe("Save Operations", () => {
    it("should mark photos as saved and clear dirty state", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      act(() => {
        result.current.actions.setActivePhoto("photo-1");
        result.current.actions.updateEdit({ exposure: 20 });
      });

      expect(result.current.state.isDirty).toBe(true);

      act(() => {
        result.current.actions.markSaved(["photo-1"]);
      });

      expect(result.current.state.isDirty).toBe(false);
      expect(result.current.state.dirtyPhotoIds.has("photo-1")).toBe(false);
    });

    it("should keep dirty state for unsaved photos", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      act(() => {
        result.current.actions.setActivePhoto("photo-1");
        result.current.actions.updateEdit({ exposure: 20 });
      });

      act(() => {
        result.current.actions.setActivePhoto("photo-2");
        result.current.actions.updateEdit({ contrast: 15 });
      });

      // Only save photo-1
      act(() => {
        result.current.actions.markSaved(["photo-1"]);
      });

      expect(result.current.state.isDirty).toBe(true);
      expect(result.current.state.dirtyPhotoIds.has("photo-1")).toBe(false);
      expect(result.current.state.dirtyPhotoIds.has("photo-2")).toBe(true);
    });
  });

  describe("Reset Edits", () => {
    it("should reset edits to initial state", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      act(() => {
        result.current.actions.setActivePhoto("photo-1");
        result.current.actions.updateEdit({ exposure: 50, contrast: 30 });
      });

      expect(result.current.state.edits["photo-1"].exposure).toBe(50);

      act(() => {
        result.current.actions.resetEdits("photo-1");
      });

      expect(result.current.state.edits["photo-1"]).toEqual(INITIAL_EDITS);
      expect(result.current.state.dirtyPhotoIds.has("photo-1")).toBe(true);
    });

    it("should add reset to history", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      act(() => {
        result.current.actions.setActivePhoto("photo-1");
        result.current.actions.updateEdit({ exposure: 50 });
      });

      const historyLengthBefore = result.current.state.history.past.length;

      act(() => {
        result.current.actions.resetEdits("photo-1");
      });

      expect(result.current.state.history.past).toHaveLength(
        historyLengthBefore + 1,
      );
      expect(result.current.canUndo).toBe(true);
    });
  });

  describe("Memoization", () => {
    it("should return memoized actions", () => {
      const { result, rerender } = renderHook(() => useEditorState(mockPhotos));

      const actionsBefore = result.current.actions;

      // Trigger re-render without changing dependencies
      rerender();

      const actionsAfter = result.current.actions;

      expect(actionsBefore).toBe(actionsAfter);
    });

    it("should update activePhoto when activePhotoId changes", () => {
      const { result } = renderHook(() => useEditorState(mockPhotos));

      act(() => {
        result.current.actions.setActivePhoto("photo-2");
      });

      expect(result.current.activePhoto?.id).toBe("photo-2");
      expect(result.current.activeEdits).toBeDefined();
    });
  });
});
