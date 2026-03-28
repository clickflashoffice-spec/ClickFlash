import React from "react";
import { ManualEdits, Annotation } from "../../../../types";
import { AnnotationCanvas } from "../AnnotationCanvas";

interface LayerManagerProps {
  // Mode flags
  isCropping: boolean;
  isDrawing: boolean;

  // Natural image dimensions for coordinate mapping
  naturalWidth: number;
  naturalHeight: number;

  // Edit State for annotations
  edits?: ManualEdits;

  // Drawing Props
  brushColor?: string;
  brushSize?: number;
  onAnnotationAdd?: (annotation: Annotation) => void;

  // Grid Props for straightening
  showGrid?: boolean;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  isCropping,
  isDrawing,
  naturalWidth,
  naturalHeight,
  edits,
  brushColor,
  brushSize,
  onAnnotationAdd,
  showGrid,
}) => {
  return (
    <>
      {/* 
        NOTE: Retouch and Crop layers have been moved to EditorCanvas.tsx 
        to ensure they sit in the correct coordinate space (viewport-relative vs image-relative)
        and to prevent double-rendering bugs.
      */}

      {/* Annotation Layer */}
      {!isCropping && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          <AnnotationCanvas
            naturalSize={{ width: naturalWidth, height: naturalHeight }}
            edits={edits}
            isDrawing={!!isDrawing}
            brushColor={brushColor || "#ff0000"}
            brushSize={brushSize || 5}
            onAnnotationAdd={onAnnotationAdd || (() => {})}
          />
        </div>
      )}

      {/* Grid Layer (for straightening) */}
      {showGrid && (
        <div className="absolute inset-0 z-40 pointer-events-none opacity-40">
          <div className="w-full h-full border-l border-r border-white/30 flex justify-evenly">
            <div className="w-px h-full bg-white/30" />
            <div className="w-px h-full bg-white/30" />
            <div className="w-px h-full bg-white/30" />
            <div className="w-px h-full bg-white/30" />
          </div>
          <div className="absolute inset-0 border-t border-b border-white/30 flex flex-col justify-evenly">
            <div className="h-px w-full bg-white/30" />
            <div className="h-px w-full bg-white/30" />
            <div className="h-px w-full bg-white/30" />
            <div className="h-px w-full bg-white/30" />
          </div>
        </div>
      )}
    </>
  );
};
