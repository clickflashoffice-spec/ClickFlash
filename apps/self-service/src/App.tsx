import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { EntryPage } from './pages/EntryPage';
import { GalleryPage } from './pages/GalleryPage';
import { PhotoDetailPage } from './pages/PhotoDetailPage';
import { EditorPage } from './pages/EditorPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ConfirmationPage } from './pages/ConfirmationPage';

export default function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<EntryPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/photo/:id" element={<PhotoDetailPage />} />
        <Route path="/photo/:id/edit" element={<EditorPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/confirmation" element={<ConfirmationPage />} />
      </Routes>
    </AnimatePresence>
  );
}
