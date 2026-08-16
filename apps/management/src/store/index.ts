import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdminUser {
  id: string;
  role: 'admin' | 'manager' | 'operator';
  name: string;
}

interface AppState {
  // Auth State
  isAuthenticated: boolean;
  user: AdminUser | null;
  authToken: string | null;
  
  // App Settings
  theme: 'light' | 'dark' | 'system';
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      authToken: null,
      theme: 'dark',
      
      login: async (email: string, password: string) => {
        try {
          const response = await fetch('http://localhost:8090/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Login failed');
          }

          const { user, token } = await response.json();
          
          if (user.role !== 'Admin' && user.role !== 'CEO' && user.role !== 'Manager') {
            throw new Error('Unauthorized role. Admin access required.');
          }

          set({
            isAuthenticated: true,
            user: { id: user.id, role: user.role.toLowerCase() as AdminUser['role'], name: user.name || user.email },
            authToken: token
          });
        } catch (error: any) {
          throw new Error(error.message || 'Network error');
        }
      },
      
      logout: () => set({ isAuthenticated: false, user: null, authToken: null }),
      
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'clickflash-admin-storage', // unique name
    }
  )
);
