import { useAppStore } from '../store';

// We export the exact same shape so existing components don't break
export function useAuth() {
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const login = useAppStore(state => state.login);
  const logout = useAppStore(state => state.logout);

  return { isAuthenticated, login, logout };
}

// AuthProvider is no longer needed with Zustand, but we export a dummy one to avoid breaking App.tsx imports
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
