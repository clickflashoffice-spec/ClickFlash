import { Order, Album, Photo } from '@clickflash/types';

const API_BASE_URL = 'http://localhost:8090/api';

/**
 * Fetch all orders from the Master App backend.
 * Used to aggregate customer data for the Customer CRM view.
 */
export async function fetchOrders(): Promise<Order[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/collections/orders/records?expand=items`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

/**
 * Fetch all albums from the Master App backend.
 * Used for the Galleries / Customer CRM view.
 */
export async function fetchAlbums(): Promise<Album[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/collections/albums/records?expand=photos`);
    if (!response.ok) throw new Error('Failed to fetch albums');
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching albums:', error);
    return [];
  }
}

/**
 * Fetch all photos for a specific album from the Master App backend.
 */
export async function fetchAlbumPhotos(albumId: string): Promise<Photo[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/collections/photos/records?filter=albumId='${albumId}'`);
    if (!response.ok) throw new Error('Failed to fetch album photos');
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching album photos:', error);
    return [];
  }
}

/**
 * Trigger an AI WhatsApp Upsell for a specific customer or album.
 */
export async function triggerAIUpsell(targetId: string, type: 'album' | 'customer'): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: "whatsapp_business_account",
        entry: [{
          id: "trigger",
          changes: [{
             value: {
                 messages: [{
                     from: "SYSTEM_TRIGGER",
                     text: { body: `TRIGGER_UPSELL:${type}:${targetId}` }
                 }]
             }
          }]
        }]
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Error triggering upsell:', error);
    return false;
  }
}
