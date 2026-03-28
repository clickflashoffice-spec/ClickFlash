import { useState, useCallback, useMemo } from "react";
import { cullingService } from "@/services/api/cullingService";
import { logger } from "@/utils/logger";
import { ManualEdits, Photo } from "@/types";

interface UseAIEditorProps {
  albumId: string;
  refresh: () => Promise<void>;
  showToast: (message: string) => void;
  updateEdit: (updates: Partial<ManualEdits>) => void;
}

export function useAIEditor({
  albumId,
  refresh,
  showToast,
  updateEdit,
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
    async (activePhoto: Photo | null) => {
      if (!activePhoto) return;

      setIsEnhancing(true);
      showToast("Enhancing photo...");

      // Simulate AI processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Apply auto-enhance edits - simplified algorithm for now
      updateEdit({
        exposure: 10,
        contrast: 15,
        highlights: -20,
        shadows: 20,
        vibrance: 10,
        sharpen: 20,
      });

      setIsEnhancing(false);
      showToast("Photo enhanced!");
    },
    [updateEdit, showToast],
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
