import { useAuthStore } from '../stores/authStore';
import { fetchApi } from './api';

export async function validateAccessCode(code: string): Promise<{ token: string, eventId: string, guestName: string }> {
  // Mock validation for now
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        token: `mock_token_${code}`,
        eventId: 'evt_12345',
        guestName: 'Guest'
      });
    }, 1000);
  });
}
