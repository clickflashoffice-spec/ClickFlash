import { logger } from "@clickflash/logger";

/**
 * Synchronizes the extracted 128D face vector with the backend API.
 * 
 * @param vector - 128D float array representing the face
 * @param deskId - the ID of the local desk/kiosk
 */
export async function syncVectorToBackend(vector: number[], deskId: string): Promise<void> {
  try {
    const response = await fetch(`https://hub.clickflash.app/api/face/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        desk_id: deskId,
        vector: vector
      })
    });
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    
    logger.info('Vector successfully synced to backend');
  } catch (error) {
    logger.error('Failed to sync vector to backend', { args: [error] });
    throw error;
  }
}
