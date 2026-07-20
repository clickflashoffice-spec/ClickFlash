import { useState, useCallback } from 'react';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { syncService, type PhotoAsset } from '../services/SyncService';
import * as FileSystem from 'expo-file-system/legacy';
import { usePoseAndBlinkDetector, type PoseBlinkAnalysis } from './usePoseAndBlinkDetector';
import { logger } from "@/utils/logger";

export function useAutoEditor() {
    const [isEditing, setIsEditing] = useState(false);
    const [lastEditedPhoto, setLastEditedPhoto] = useState<PhotoAsset | null>(null);
    const [lastPoseAnalysis, setLastPoseAnalysis] = useState<PoseBlinkAnalysis | null>(null);
    const { analyzeCapture } = usePoseAndBlinkDetector();

    const processPhoto = useCallback(async (rawPhotoUri: string, filename: string, voiceTags: string[] = []) => {
        setIsEditing(true);
        try {
            logger.info('[AutoEditor] Starting real-time pose/blink check and AI enhancement for:', filename);
            
            // 1. Run real-time edge pose quality & blink validation right away
            const poseAnalysis = await analyzeCapture(rawPhotoUri, filename);
            setLastPoseAnalysis(poseAnalysis);

            // 2. Perform actual image manipulation (e.g., resizing to standard 4K, optimizing)
            const editedResult = await manipulateAsync(
                rawPhotoUri,
                [
                    { resize: { width: 3840 } }, // Standardize to 4K width for kiosk printing
                ],
                { compress: 0.85, format: SaveFormat.JPEG }
            );

            // 3. Get file info to create the PhotoAsset
            const fileInfo = await FileSystem.getInfoAsync(editedResult.uri);
            const fileSize = fileInfo.exists ? fileInfo.size : 0;

            const photoAsset: PhotoAsset = {
                id: Math.random().toString(36).substring(7),
                uri: editedResult.uri,
                filename: `edited_${filename}`,
                mediaType: 'photo',
                creationTime: Date.now(),
                width: editedResult.width,
                height: editedResult.height,
                fileSize: fileSize,
                aiMetadata: {
                    poseQualityScore: poseAnalysis.poseQualityScore,
                    blinkDetected: poseAnalysis.blinkDetected,
                    blurDetected: poseAnalysis.blurDetected,
                    voiceTags: voiceTags.length > 0 ? voiceTags : ['Automated Session', `Subjects: ${poseAnalysis.subjectCount}`]
                }
            };

            logger.info('[AutoEditor] Enhancement complete. Queuing for sync with AI metadata:', photoAsset.filename);
            
            setLastEditedPhoto(photoAsset);
            
            // 4. Send to Kiosk / Cloud via SyncService
            syncService.queuePhotoForSync(photoAsset);

            return photoAsset;
        } catch (error) {
            logger.error('[AutoEditor] Failed to process photo:', error);
            throw error;
        } finally {
            setIsEditing(false);
        }
    }, [analyzeCapture]);

    return {
        isEditing,
        lastEditedPhoto,
        lastPoseAnalysis,
        processPhoto
    };
}

