import { useState, useCallback, useMemo } from "react";
import { cullingService } from "@/services/api/cullingService";
import { logger } from "@/utils/logger";
import { ManualEdits, Photo } from "@/types";
import { imageProcessingService } from "@/services/imageProcessingService";
interface UseAIEditorProps {
  albumId: string;
  refresh: () => Promise<void>;
  showToast: (message: string) => void;
  updateEdit: (updates: Partial<ManualEdits>) => void;
  batchUpdateEdits?: (photoIds: string[], edits: Partial<ManualEdits>) => void;
}

export function useAIEditor({
  albumId,
  refresh,
  showToast,
  updateEdit,
  batchUpdateEdits,
}: UseAIEditorProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplyingCulling, setIsApplyingCulling] = useState(false);

  const handleAnalyzeAlbum = useCallback(async () => {
    if (!albumId) return;
    setIsAnalyzing(true);
    try {
      await cullingService.analyzeAlbum(albumId);
      await refresh(); // Refresh to get AI scores
      showToast("Album analysis complete");
    } catch (error) {
      logger.error("Analysis failed", error);
      showToast("AI Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }, [albumId, refresh, showToast]);

  const handleApplyCulling = useCallback(async () => {
    if (!albumId) return;
    if (
      !confirm(
        "Are you sure you want to apply AI suggestions? Rejected photos will be archived.",
      )
    )
      return;

    setIsApplyingCulling(true);
    try {
      await cullingService.confirmCulling(albumId, { mode: "archive" });
      await refresh(); // Refresh to remove archived photos
      showToast("Culling suggestions applied");
    } catch (error) {
      logger.error("Failed to apply culling", error);
      showToast("Failed to apply suggestions");
    } finally {
      setIsApplyingCulling(false);
    }
  }, [albumId, refresh, showToast]);

  const handleAutoEnhance = useCallback(
    async (activePhotoOrPhotos: Photo | Photo[] | null) => {
      if (!activePhotoOrPhotos) return;

      setIsEnhancing(true);

      try {
        // Batch mode: array of photos
        if (Array.isArray(activePhotoOrPhotos)) {
          const photos = activePhotoOrPhotos;
          if (photos.length === 0) { setIsEnhancing(false); return; }
          showToast("Enhancing photos...");
          
          const photosToProcess = await Promise.all(photos.map(async (p) => {
            const img = await imageProcessingService.loadImageFromUrl(p.url);
            const imageData = imageProcessingService.getImageData(img);
            return { id: p.id, imageData };
          }));
          
          const results = await imageProcessingService.batchAutoEnhance(photosToProcess);
          
          if (batchUpdateEdits) {
            photos.forEach(p => {
              const res = results.get(p.id);
              if (res) {
                // Ensure values are within UI bounds (-100 to 100 for some sliders, or matching our expected scale)
                // The service returns values like exposure (-0.5 to 0.5)
                const enhanceEdits: Partial<ManualEdits> = {
                  exposure: Math.round(res.adjustments.exposure * 100), // scale up for UI if needed
                  contrast: Math.round(res.adjustments.contrast * 100),
                  saturate: Math.round((res.adjustments as any).saturation * 100),
                  clarity: Math.round(res.adjustments.clarity * 100)
                };
                batchUpdateEdits([p.id], enhanceEdits);
              }
            });
          }
          
          showToast(`${photos.length} photos enhanced!`);
          return;
        }

        // Single photo mode
        showToast("Enhancing photo...");
        const img = await imageProcessingService.loadImageFromUrl(activePhotoOrPhotos.url);
        const imageData = imageProcessingService.getImageData(img);
        const result = await imageProcessingService.autoEnhanceAsync(imageData);
        
        const enhanceEdits: Partial<ManualEdits> = {
          exposure: Math.round(result.adjustments.exposure * 100),
          contrast: Math.round(result.adjustments.contrast * 100),
          saturate: Math.round((result.adjustments as any).saturation * 100),
          clarity: Math.round(result.adjustments.clarity * 100)
        };
        
        updateEdit(enhanceEdits);
        showToast("Photo enhanced!");
      } catch (err) {
        logger.error("Auto-enhance failed", err);
        showToast("Failed to enhance photo(s)");
      } finally {
        setIsEnhancing(false);
      }
    },
    [updateEdit, batchUpdateEdits, showToast],
  );

  // Memoize handlers to prevent cascading re-renders
  const handlers = useMemo(
    () => ({
      handleAnalyzeAlbum,
      handleApplyCulling,
      handleAutoEnhance,
    }),
    [handleAnalyzeAlbum, handleApplyCulling, handleAutoEnhance],
  );

  return {
    isEnhancing,
    isAnalyzing,
    isApplyingCulling,
    handlers,
  };
}
