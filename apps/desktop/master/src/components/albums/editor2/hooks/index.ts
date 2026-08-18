// Editor2 Hooks - Decomposed State Management
//
// This folder contains decomposed hooks for the Album Editor state management.
// The original useEditorState.ts remains for backward compatibility.
//
// New architecture:
// - usePhotoState: Photo list and active photo management
// - useSelectionState: Batch selection management
// - useToolState: Active tool and clipboard (copy/paste)
// - useZoomState: Zoom persistence per photo
// - useEditsState: Edit values, undo/redo history, dirty tracking
// - EditorContext: Composes all hooks into a single context
//
// Migration path:
// 1. Components can gradually migrate to useEditor() from EditorContext
// 2. Or individual domain hooks can be imported directly
// 3. Original useEditorState continues to work as-is

export { usePhotoState } from "./usePhotoState";
export type { PhotoState, PhotoActions } from "./usePhotoState";

export { useSelectionState } from "./useSelectionState";
export type { SelectionState, SelectionActions } from "./useSelectionState";

export { useToolState } from "./useToolState";
export type { ToolState, ToolActions } from "./useToolState";

export { useZoomState } from "./useZoomState";
export type { ZoomState, ZoomActions } from "./useZoomState";

export { useEditsState } from "./useEditsState";
export type { EditsState, EditsActions } from "./useEditsState";

// Context exports
export { EditorProvider, useEditor } from "./EditorContext";
export type { EditorContextValue } from "./EditorContext";

// Convenience hooks for specific domains
export {
  useEditorPhoto,
  useEditorEdits,
  useEditorSelection,
  useEditorTool,
  useEditorZoom,
} from "./EditorContext";

// Re-export original for backward compatibility
export { useEditorState } from "./useEditorState";

// ZoomPan is used elsewhere
export { useZoomPan } from "./useZoomPan";
