import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthPage } from './pages/AuthPage';
import { UploadDashboardPage } from './pages/UploadDashboardPage';
import { EarningsPayoutPage } from './pages/EarningsPayoutPage';
import { usePhotographerStore } from './stores/photographerStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const session = usePhotographerStore((state) => state.session);
  if (!session) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <UploadDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/earnings"
          element={
            <ProtectedRoute>
              <EarningsPayoutPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
