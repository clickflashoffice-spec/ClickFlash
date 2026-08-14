import { logger } from '@clickflash/logger';

const AI_WORKER_URL = "http://localhost:8000";

export class EditorService {
  /**
   * Sends an image to the local AI worker for algorithmic enhancement 
   * (Auto-White Balance, CLAHE contrast, Unsharp Mask).
   */
  static async autoEnhanceImage(fileBlob: Blob): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("file", fileBlob, "image.jpg");

      const response = await fetch(`${AI_WORKER_URL}/api/ai/enhance`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to enhance image: ${response.status} - ${errorText}`);
      }

      // Read response as Blob and convert to object URL for immediate display
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      logger.error("EditorService.autoEnhanceImage failed:", error);
      throw error;
    }
  }

  static async autoEnhanceProImage(fileBlob: Blob): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("file", fileBlob, "image.jpg");

      const response = await fetch(`${AI_WORKER_URL}/api/ai/enhance-pro`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to pro-enhance image: ${response.status}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      logger.error("EditorService.autoEnhanceProImage failed:", error);
      throw error;
    }
  }

  static async removeBackground(fileBlob: Blob): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("file", fileBlob, "image.jpg");

      const response = await fetch(`${AI_WORKER_URL}/api/ai/remove-background`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to remove background: ${response.status}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      logger.error("EditorService.removeBackground failed:", error);
      throw error;
    }
  }

  static async magicEraser(fileBlob: Blob, maskBlob: Blob): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("image", fileBlob, "image.jpg");
      formData.append("mask", maskBlob, "mask.jpg");

      const response = await fetch(`${AI_WORKER_URL}/api/ai/magic-eraser`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to run magic eraser: ${response.status}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      logger.error("EditorService.magicEraser failed:", error);
      throw error;
    }
  }
}
