import { useMemo } from "react";
import { ManualEdits } from "@/types";
import { getPhotoStyle, INITIAL_EDITS } from "@/utils/styleUtils";

export function usePhotoStyle(
  edits: ManualEdits | undefined,
  isExport = false,
  imageWidth?: number,
  imageHeight?: number,
  photoId?: string,
) {
  const style = useMemo(() => {
    const activeEdits = edits || { ...INITIAL_EDITS };
    return getPhotoStyle(
      activeEdits,
      isExport,
      imageWidth,
      imageHeight,
      photoId,
    );
  }, [edits, isExport, imageWidth, imageHeight, photoId]);

  return style;
}
