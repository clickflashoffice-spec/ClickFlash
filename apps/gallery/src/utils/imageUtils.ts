import { logger } from '@clickflash/logger';

/**
 * Image Utilities
 * 
 * Utility functions for image conversion and manipulation.
 * Used primarily for AI image editing (Gemini API) and photo processing.
 */

/**
 * Fetches an image from a URL and converts it to base64 inline data format.
 * 
 * This function is suitable for the Gemini API's `inlineData` field.
 * Supports both HTTP/HTTPS URLs and data URIs.
 * 
 * Features:
 * - Handles data URIs directly (no fetch needed)
 * - Fetches and converts HTTP/HTTPS URLs
 * - Extracts MIME type automatically
 * - Error handling for network failures
 * 
 * @param {string} imageUrl - The URL of the image to convert (can be http/https or a data URI)
 * @returns {Promise<{ mimeType: string; data: string }>} Promise that resolves with mimeType and base64 data
 * @throws {Error} If the image cannot be fetched or converted
 * 
 * @example
 * ```ts
 * const { mimeType, data } = await urlToInlineData('https://example.com/image.jpg');
 * // Use with Gemini API
 * const result = await model.generateContent([{ inlineData: { mimeType, data } }]);
 * ```
 */
export async function urlToInlineData(imageUrl: string): Promise<{ mimeType: string; data: string }> {
  // If the URL is a data URI, extract parts directly.
  if (imageUrl.startsWith('data:')) {
    const [header, data] = imageUrl.split(',');
    if (data && header.includes(';base64')) {
      const mimeType = header.substring(5, header.indexOf(';'));
      return { mimeType, data };
    }
  }

  // For all other URLs (http, https, or fallbacks from data URI), fetch them.
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    const mimeType = blob.type;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        // The result includes the data URI prefix, so we split it off.
        resolve({ mimeType, data: base64data.split(',')[1] });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    logger.error("Error converting URL to InlineData:", error);
    throw new Error("Could not convert image URL to InlineData.");
  }
}

/**
 * Converts a File object directly to Gemini API inline data format.
 * 
 * Useful for file uploads from input elements.
 * 
 * @param {File} file - The File object from an input element
 * @returns {Promise<{ mimeType: string; data: string }>} Promise that resolves with mimeType and base64 data
 * @throws {Error} If the file cannot be read
 * 
 * @example
 * ```ts
 * const fileInput = document.querySelector('input[type="file"]');
 * const file = fileInput.files[0];
 * const { mimeType, data } = await fileToGenerativePart(file);
 * ```
 */
export function fileToGenerativePart(file: File): Promise<{ mimeType: string; data: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            const data = base64data.split(',')[1];
            resolve({
                mimeType: file.type,
                data
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Converts a base64 string to a Blob object.
 * 
 * Handles base64 strings with or without data URI prefix.
 * 
 * @param {string} base64 - Base64 encoded string (with or without data URI prefix)
 * @param {string} [contentType=''] - MIME type for the blob
 * @returns {Blob} Blob object created from base64 data
 * 
 * @example
 * ```ts
 * const blob = base64ToBlob(base64String, 'image/jpeg');
 * const url = URL.createObjectURL(blob);
 * ```
 */
export function base64ToBlob(base64: string, contentType: string = ''): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
}

/**
 * Converts a Blob to a Base64 string.
 * @param blob The Blob to convert.
 * @returns A promise that resolves with the Base64 string (without data URI prefix).
 */
/**
 * Converts a Blob to a base64 string.
 * 
 * @param {Blob} blob - Blob object to convert
 * @returns {Promise<string>} Promise that resolves with base64 string (includes data URI prefix)
 * 
 * @example
 * ```ts
 * const base64 = await blobToBase64(imageBlob);
 * // base64 will be: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
 * ```
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Remove data URI prefix "data:image/jpeg;base64,"
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
