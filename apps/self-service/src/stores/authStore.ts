import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  eventId: string | null;
  guestName: string | null;
  setAuth: (token: string, eventId: string, guestName?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      eventId: null,
      guestName: null,
      setAuth: (token, eventId, guestName) => set({ token, eventId, guestName: guestName || null }),
      logout: () => set({ token: null, eventId: null, guestName: null }),
    }),
    {
      name: 'clickflash-auth',
    }
  )
);
