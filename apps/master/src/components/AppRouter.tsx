import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { apiService } from '../services/apiService';
import { SystemAudit } from './SystemAudit';
import Spinner from './common/Spinner';

// Lazy load components
const Login = React.lazy(() => import('./Login'));
const MainLayout = React.lazy(() => import('./MainLayout'));

interface AppRouterProps {
    onExit: () => void;
    isLocked?: boolean;
}

export const AppRouter: React.FC<AppRouterProps> = ({ onExit, isLocked }) => {
    const { user, authState, login, logout } = useAuth();
    const { dataVersion, assistanceRequests, dismissAssistance, isOnline } = useSync();

    if (authState === 'loading') {
        return <Spinner />;
    }

    if (authState === 'unauthenticated' || !user) {
        return (
            <React.Suspense fallback={<Spinner />}>
                <Login
                    portalName="Master Portal"
                    onLoginSuccess={login}
                    authService={apiService}
                    onBack={isLocked ? undefined : onExit}
                />
            </React.Suspense>
        );
    }

    return (
        <React.Suspense fallback={<Spinner />}>
            <Routes>
                <Route path="/audit" element={
                    user.role === 'Admin' ? <SystemAudit /> : <Navigate to="/" replace />
                } />
                <Route path="/" element={
                    <MainLayout
                        onSwitchUser={logout}
                        currentUser={user}
                        isOnline={isOnline}
                        dataVersion={dataVersion}
                        onRefreshUser={() => { }}
                        assistanceRequests={assistanceRequests}
                        onDismissAssistance={dismissAssistance}
                    />
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </React.Suspense>
    );
};
