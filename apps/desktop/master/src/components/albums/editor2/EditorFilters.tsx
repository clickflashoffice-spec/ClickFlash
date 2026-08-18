import React, { useMemo } from "react";
import { getColorMatrixValues } from "@/utils/styleUtils";

interface EditorFiltersProps {
  temperature: number;
  tint: number;
  photoId?: string;
}

/**
 * EditorFilters: Renders a hidden SVG with filters that can be referenced via CSS.
 * This enables professional color grading (temperature/tint) using feColorMatrix.
 */
export const EditorFilters: React.FC<EditorFiltersProps> = ({
  temperature,
  tint,
  photoId,
}) => {
  const matrixValues = useMemo(
    () => getColorMatrixValues(temperature, tint),
    [temperature, tint],
  );

  const filterId = photoId
    ? `master-editor-color-matrix-${photoId}`
    : "master-editor-color-matrix";

  return (
    <svg
      className="absolute w-0 h-0 pointer-events-none"
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        top: -9999,
        left: -9999,
        visibility: "hidden",
      }}
    >
      <defs>
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={matrixValues} />
        </filter>
      </defs>
    </svg>
  );
};
