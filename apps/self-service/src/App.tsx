import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from './router';
import { ErrorBoundary } from '@clickflash/ui';
import { EntryPage } from './pages/EntryPage';
import { GalleryPage } from './pages/GalleryPage';
import { PhotoDetailPage } from './pages/PhotoDetailPage';
import { EditorPage } from './pages/EditorPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { useAuthStore } from './stores/authStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore(state => state.token);
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<EntryPage />} />
          <Route path="/gallery" element={<ProtectedRoute><GalleryPage /></ProtectedRoute>} />
          <Route path="/photo/:id" element={<ProtectedRoute><PhotoDetailPage /></ProtectedRoute>} />
          <Route path="/photo/:id/edit" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/confirmation" element={<ConfirmationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
