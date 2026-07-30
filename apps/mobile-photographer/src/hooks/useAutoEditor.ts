import { useState, useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { logger } from '@/utils/logger';

import { syncService, type PhotoAsset } from '../services/SyncService';
import { usePoseAndBlinkDetector, type PoseBlinkAnalysis } from './usePoseAndBlinkDetector';

function bytesToHex(bytes: Uint8Array): string {
    return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256File(file: File): Promise<string> {
    const digest = await Crypto.digest(
        Crypto.CryptoDigestAlgorithm.SHA256,
        await file.bytes()
    );
    return bytesToHex(new Uint8Array(digest));
}

async function persistQuickEdit(cacheUri: string): Promise<{
    file: File;
    sha256: string;
}> {
    const cacheFile = new File(cacheUri);
    const cacheSize = cacheFile.size ?? 0;
    if (!cacheFile.exists || !Number.isSafeInteger(cacheSize) || cacheSize <= 0) {
        throw new Error('Quick-edit output was not written to the editor cache.');
    }

    const sha256 = await sha256File(cacheFile);
    const destinationDirectory = new Directory(
        Paths.document,
        'clickflash',
        'quick-edits'
    );
    destinationDirectory.create({ intermediates: true, idempotent: true });
    const destination = new File(destinationDirectory, `${sha256}.jpg`);

    if (destination.exists) {
        const existingSize = destination.size ?? 0;
        if (existingSize === cacheSize && await sha256File(destination) === sha256) {
            return { file: destination, sha256 };
        }
    }

    const staging = new File(
        destinationDirectory,
        `${sha256}.${Crypto.randomUUID()}.part`
    );
    try {
        await cacheFile.copy(staging);
        const stagedSize = staging.size ?? 0;
        if (
            !staging.exists ||
            stagedSize !== cacheSize ||
            await sha256File(staging) !== sha256
        ) {
            throw new Error('Quick-edit durable-copy verification failed.');
        }
        await staging.move(destination, { overwrite: true });
        return { file: destination, sha256 };
    } finally {
        if (staging.exists) staging.delete();
    }
}

export function useAutoEditor() {
    const [isEditing, setIsEditing] = useState(false);
    const [lastEditedPhoto, setLastEditedPhoto] = useState<PhotoAsset | null>(null);
    const [lastPoseAnalysis, setLastPoseAnalysis] = useState<PoseBlinkAnalysis | null>(null);
    const { analyzeCapture } = usePoseAndBlinkDetector();

    const processPhoto = useCallback(async (
        rawPhotoUri: string,
        filename: string,
        sourceCaptureId: string,
        sourceSha256: string,
        voiceTags: string[] = []
    ) => {
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

            // 3. Bind the rendered asset to an immutable content identity.
            const durableEdit = await persistQuickEdit(editedResult.uri);
            const fileSize = durableEdit.file.size ?? 0;

            const photoAsset: PhotoAsset = {
                id: `${sourceCaptureId}:quick-edit`,
                sourceCaptureId,
                sourceSha256,
                sha256: durableEdit.sha256,
                uri: durableEdit.file.uri,
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
            
            // 4. Persist the quick-edit asset before exposing it as delivery-ready.
            await syncService.queuePhotoForSync(photoAsset);
            setLastEditedPhoto(photoAsset);

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
