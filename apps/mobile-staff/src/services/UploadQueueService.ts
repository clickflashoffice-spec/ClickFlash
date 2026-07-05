/**
 * UploadQueueService.ts
 * Manages background uploading of photos taken by wandering photographers in areas with bad WiFi.
 */

export interface QueuedPhoto {
    uri: string;
    guestId: string;
    timestamp: string;
}

class UploadQueueServiceImpl {
    private queue: QueuedPhoto[] = [];
    private isUploading = false;
    private masterEndpoint = 'http://192.168.1.100:8090/api/mobile-staff/upload'; // Configure via ENV in production

    enqueue(photo: QueuedPhoto) {
        this.queue.push(photo);
        this.processQueue();
    }

    private async processQueue() {
        if (this.isUploading || this.queue.length === 0) return;

        this.isUploading = true;

        while (this.queue.length > 0) {
            const photo = this.queue[0];
            try {
                const formData = new FormData();
                formData.append('guestId', photo.guestId);
                formData.append('timestamp', photo.timestamp);
                
                // Fetch the file from local URI
                const response = await fetch(photo.uri);
                const blob = await response.blob();
                formData.append('photo', blob, `photo_${Date.now()}.jpg`);

                const uploadRes = await fetch(this.masterEndpoint, {
                    method: 'POST',
                    body: formData,
                });

                if (uploadRes.ok) {
                    console.log(`[UploadQueue] Successfully uploaded photo for guest ${photo.guestId}`);
                    this.queue.shift(); // Remove from queue on success
                } else {
                    console.warn(`[UploadQueue] Server returned ${uploadRes.status}. Retrying later...`);
                    break; // Stop and retry later
                }
            } catch (error) {
                console.error(`[UploadQueue] Network error:`, error);
                break; // Network down, wait for next attempt
            }
        }

        this.isUploading = false;
    }

    // Call this to force a retry
    retry() {
        this.processQueue();
    }
}

export const UploadQueueService = new UploadQueueServiceImpl();
