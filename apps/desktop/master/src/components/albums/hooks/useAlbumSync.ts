import { useState, useEffect } from 'react';
import { apiService } from '../../../services/apiService';
import { logger } from '../../../utils/logger';
import { AlbumWithPhotos } from '../types';

export const useAlbumSync = (
    album: AlbumWithPhotos | null,
    setAlbum: React.Dispatch<React.SetStateAction<AlbumWithPhotos | null>>,
    setPristineAlbum: React.Dispatch<React.SetStateAction<AlbumWithPhotos | null>>,
    selectedPhotoIds: Set<string>,
    showToast: (message: string) => void,
    saveChanges: () => Promise<void>,
    isDirty: boolean,
    saveStatus: string
) => {
    const [kiosks, setKiosks] = useState<any[]>([]);
    const [selectedKioskIds, setSelectedKioskIds] = useState<Set<string>>(new Set());
    const [sendingProgress, setSendingProgress] = useState<{
        open: boolean;
        progress: number;
        message: string;
        current: number;
        total: number;
        destination?: string;
    }>({ open: false, progress: 0, message: '', current: 0, total: 0 });

    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);

    // Load Kiosks on mount
    useEffect(() => {
        const loadKiosks = async () => {
            try {
                const fetchedKiosks = await apiService.getKiosks();
                setKiosks(fetchedKiosks || []);
                if (fetchedKiosks && fetchedKiosks.length === 1) {
                    setSelectedKioskIds(new Set([fetchedKiosks[0].id]));
                }
            } catch (error) {
                logger.error('Failed to load kiosks', error);
            }
        };
        loadKiosks();
    }, []);

    const confirmSendToKiosk = async () => {
        if (!album || selectedPhotoIds.size === 0) {
            showToast("Please select at least one photo to send.");
            return;
        }

        if (selectedKioskIds.size === 0) {
            showToast("Please select at least one kiosk.");
            return;
        }

        try {
            let successCount = 0;
            let failCount = 0;
            const errors: string[] = [];

            for (const kioskId of selectedKioskIds) {
                try {
                    const result = await apiService.sendAlbumToKiosk(album.id, kioskId, Array.from(selectedPhotoIds));
                    successCount++;

                    if (result.progress) {
                        const { current, total } = result.progress;
                        setSendingProgress({
                            open: true,
                            progress: total > 0 ? (current / total) * 100 : 0,
                            message: `Sending to ${result.kioskName}...`,
                            current,
                            total,
                            destination: result.kioskName
                        });
                    }
                } catch (err: any) {
                    failCount++;
                    const kName = kiosks.find(k => k.id === kioskId)?.name || kioskId;
                    errors.push(`${kName}: ${err.message}`);
                }
            }

            await apiService.updateAlbum(album.id, { status: 'Finalized' });
            setAlbum((prev: AlbumWithPhotos | null) => prev ? { ...prev, status: 'Finalized' } : null);
            setPristineAlbum((prev: AlbumWithPhotos | null) => prev ? { ...prev, status: 'Finalized' } : null);

            setTimeout(() => setSendingProgress(prev => ({ ...prev, open: false })), 1500);

            if (failCount === 0) {
                showToast(`Successfully sent to ${successCount} kiosk(s)!`);
            } else {
                showToast(`Sent to ${successCount} kiosk(s). Failed: ${failCount}.`);
            }
        } catch (error) {
            logger.error('Error during send process', error);
            showToast('An error occurred during the process.');
        }
    };

    const handleSendToKiosk = async () => {
        if (selectedPhotoIds.size === 0) {
            showToast("Please select at least one photo to send.");
            return;
        }

        if (isDirty || saveStatus === 'modified' || saveStatus === 'saving') {
            try {
                await saveChanges();
                await new Promise(resolve => setTimeout(resolve, 300));
                setIsFinalizeModalOpen(true);
            } catch (error) {
                showToast("Failed to save changes before finalizing.");
                return;
            }
        } else {
            setIsFinalizeModalOpen(true);
        }
    };

    return {
        kiosks,
        selectedKioskIds,
        setSelectedKioskIds,
        sendingProgress,
        setSendingProgress,
        isFinalizeModalOpen,
        setIsFinalizeModalOpen,
        confirmSendToKiosk,
        handleSendToKiosk
    };
};
