import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Photographer } from '../types/shared';
import { apiService } from '../services/apiService';
import { authService } from '../services/api/authService';
import { pb } from '../services/pb';
import { logger } from '../utils/logger';
import { safeStorage } from '../utils/safeStorage';

type AuthState = 'unauthenticated' | 'authenticated' | 'loading';

interface AuthContextType {
    user: Photographer | null;
    authState: AuthState;
    login: (user: Photographer) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<Photographer | null>(null);
    const [authState, setAuthState] = useState<AuthState>('loading');

    // Restore session on mount
    useEffect(() => {
        const checkSession = async () => {
            try {
                // MANDATORY: Establish security handshake first
                // This gets us the latest XSRF-TOKEN cookie and syncs the pb adapter
                await authService.syncCsrf();

                // Try backend session next (with timeout to prevent indefinite loading spinner)
                const meController = new AbortController();
                const meTimeout = setTimeout(() => meController.abort(), 10000);
                const response = await fetch(`${pb.baseUrl}/api/auth/me`, {
                    credentials: 'include',
                    signal: meController.signal,
                });
                clearTimeout(meTimeout);

                if (response.ok) {
                    const data = await response.json();
                    if (data.user) {
                        handleLoginSuccess(data.user);
                        logger.info('[Auth] Session restored from backend', { userId: data.user.id });
                        return;
                    }
                }

                // If backend session check failed OR was unauthorized, we check fallback
                // but ONLY if we didn't get an explicit 401/403 which means session is dead
                if (response.status === 401 || response.status === 403) {
                    logger.info('[Auth] Backend session invalid, clearing local state');
                    setUser(null);
                    setAuthState('unauthenticated');
                    safeStorage.removeItem('masterPortalUser');
                    return;
                }

                // Fallback to localStorage (Offline/Legacy support)
                const savedUserStr = safeStorage.getItem('masterPortalUser');
                if (savedUserStr) {
                    const savedUser = JSON.parse(savedUserStr);
                    handleLoginSuccess(savedUser);
                    logger.info('[Auth] Session restored from localStorage', { userId: savedUser.id });
                } else {
                    setAuthState('unauthenticated');
                }
            } catch (error) {
                logger.warn('[Auth] Session restoration handshake incomplete', error);

                // Final fallback if the network is totally down but we have saved data
                const savedUserStr = safeStorage.getItem('masterPortalUser');
                if (savedUserStr) {
                    try {
                        const savedUser = JSON.parse(savedUserStr);
                        handleLoginSuccess(savedUser);
                    } catch {
                        setAuthState('unauthenticated');
                    }
                } else {
                    setAuthState('unauthenticated');
                }
            }
        };

        checkSession();
    }, []);

    // Sync user to localStorage whenever it changes
    useEffect(() => {
        if (user) {
            const sanitizedUser = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                destinationId: user.destinationId,
                avatarUrl: user.avatarUrl
            };
            safeStorage.setItem('masterPortalUser', JSON.stringify(sanitizedUser));
        }
    }, [user]);

    const handleLoginSuccess = (userData: Photographer) => {
        setUser(userData);
        setAuthState('authenticated');
    };

    const login = (userData: Photographer) => {
        handleLoginSuccess(userData);
    };

    const logout = async () => {
        try {
            await authService.logoutUser();
        } catch (e) {
            logger.warn('Backend logout failed, clearing local state anyway', e);
        } finally {
            setUser(null);
            setAuthState('unauthenticated');
            safeStorage.removeItem('masterPortalUser');
        }
    };

    const refreshUser = useCallback(async () => {
        if (!user) return;
        try {
            const users = await apiService.getUsers();
            const updatedUser = users.find(u => u.id === user.id);
            if (updatedUser) {
                setUser(updatedUser);
            }
        } catch (e) {
            logger.error("Failed to refresh user data", e instanceof Error ? e : undefined);
        }
    }, [user]);

    return (
        <AuthContext.Provider value={{
            user,
            authState,
            login,
            logout,
            refreshUser,
            isAuthenticated: authState === 'authenticated'
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
