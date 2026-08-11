import { logger } from '../utils/logger';

const AI_WORKER_URL = 'http://localhost:8000';

export interface FaceVectorResponse {
    success: boolean;
    descriptor?: number[];
    hash?: string;
    error?: string;
}

export interface CullingResponse {
    success: boolean;
    culling_data?: {
        is_blurry: boolean;
        blur_score: number;
        has_face: boolean;
        eyes_open: boolean | null;
        [key: string]: any;
    };
    error?: string;
}

class AIClient {
    private static instance: AIClient;

    private constructor() {}

    public static getInstance(): AIClient {
        if (!AIClient.instance) {
            AIClient.instance = new AIClient();
        }
        return AIClient.instance;
    }

    /**
     * Extracts a face descriptor using the local Python AI worker.
     * @param image Can be HTMLImageElement, HTMLCanvasElement, ImageData, or Blob.
     * @returns The face descriptor response.
     */
    public async getFaceDescriptor(image: Blob | HTMLImageElement | HTMLCanvasElement | ImageData): Promise<FaceVectorResponse> {
        try {
            const blob = image instanceof Blob ? image : await this.imageToBlob(image);
            if (!blob) {
                return { success: false, error: 'Failed to convert image to blob' };
            }

            const formData = new FormData();
            formData.append('file', blob, 'image.jpg');

            const response = await fetch(`${AI_WORKER_URL}/api/ai/face/vector`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`AI worker returned status: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                descriptor: data.vector,
                hash: data.hash,
            };
        } catch (error) {
            logger.error('[AIClient] Failed to get face descriptor', error);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Evaluates image quality for culling using the local Python AI worker.
     */
    public async evaluateQuality(image: Blob | HTMLImageElement | HTMLCanvasElement | ImageData): Promise<CullingResponse> {
        try {
            const blob = image instanceof Blob ? image : await this.imageToBlob(image);
            if (!blob) {
                return { success: false, error: 'Failed to convert image to blob' };
            }

            const formData = new FormData();
            formData.append('file', blob, 'image.jpg');

            const response = await fetch(`${AI_WORKER_URL}/api/ai/cull`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`AI worker returned status: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                culling_data: data.culling_data
            };
        } catch (error) {
            logger.error('[AIClient] Failed to evaluate image quality', error);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Auto-enhances an image using the local Python AI worker.
     */
    public async autoEnhance(image: Blob | HTMLImageElement | HTMLCanvasElement | ImageData): Promise<Blob | null> {
        try {
            const blob = image instanceof Blob ? image : await this.imageToBlob(image);
            if (!blob) {
                return null;
            }

            const formData = new FormData();
            formData.append('file', blob, 'image.jpg');

            const response = await fetch(`${AI_WORKER_URL}/api/ai/enhance`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`AI worker returned status: ${response.status}`);
            }

            return await response.blob();
        } catch (error) {
            logger.error('[AIClient] Failed to auto-enhance image', error);
            return null;
        }
    }

    private async imageToBlob(image: HTMLImageElement | HTMLCanvasElement | ImageData): Promise<Blob | null> {
        let canvas: HTMLCanvasElement;
        if (image instanceof HTMLCanvasElement) {
            canvas = image;
        } else if (image instanceof HTMLImageElement) {
            canvas = document.createElement('canvas');
            canvas.width = image.width || image.naturalWidth;
            canvas.height = image.height || image.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(image, 0, 0);
        } else if (image instanceof ImageData) {
            canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.putImageData(image, 0, 0);
        } else {
            return null;
        }

        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
        });
    }
}

export const aiClient = AIClient.getInstance();
export default aiClient;
