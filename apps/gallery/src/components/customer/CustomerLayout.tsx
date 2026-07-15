import { logger } from '@clickflash/logger';
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Order, Photo, Product } from "../../types.ts";
import { cloudApiService } from "../../services/cloudApiService";
import CustomerGallery from "./CustomerGallery";
import StorePage from "./StorePage";
import FavoritesPage from "./FavoritesPage";
import DownloadPage from "./DownloadPage";
import OrderStatusPage from "./OrderStatusPage";
import EnhancedLightbox from "./EnhancedLightbox";
import AddToCartModal from "./AddToCartModal";
import CheckoutModal from "./CheckoutModal";
import ProofingModal from "./ProofingModal";
import ShareModal from "./ShareModal";
import { MOCK_PRODUCTS } from "../../constants.ts";
import { MoneyTrashGallery } from "./MoneyTrashGallery";
import { useCartSync, markCartRecovered } from "../../hooks/useCartSync.ts";
import useCartStore from "../../stores/useCartStore.ts";

type CustomerView =
  | "Gallery"
  | "Store"
  | "Favorites"
  | "Download"
  | "Status"
  | "Buy Photos";

// ShopCartItem type moved/replaced by CartItem from @clickflash/types

interface CustomerLayoutProps {
  order?: Order;
  trashGallery?: any;
  onLogout: () => void;
}

const CustomerLayout: React.FC<CustomerLayoutProps> = ({
  order,
  trashGallery,
  onLogout,
}) => {
  const [view, setView] = useState<CustomerView>(
    order ? "Gallery" : "Buy Photos",
  );
  const [favoritePhotoIds, setFavoritePhotoIds] = useState<Set<string>>(
    new Set(),
  );
  
  // Zustand Cart Store
  const { cart, getTotal, getItemCount, setCartOpen } = useCartStore((state) => ({
    cart: state.items,
    getTotal: state.getTotal,
    getItemCount: state.getItemCount,
    setCartOpen: state.setCartOpen
  }));
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(false);

  useEffect(() => {
    const fetchFeatures = async () => {
      const destId = order?.destinationId || trashGallery?.destinationId;
      if (!destId) return;
      try {
        const dests = await Promise.resolve<any[]>([]);
        const myDest = dests.find((d: any) => d.id === destId);
        if (myDest?.features?.whiteLabel) {
          setWhiteLabelEnabled(true);
        }
      } catch (e) {
        logger.error("Failed to fetch features", e);
      }
    };
    fetchFeatures();
  }, [order?.destinationId, trashGallery?.destinationId]);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState(0);

  const [isAddToCartModalOpen, setIsAddToCartModalOpen] = useState(false);
  const [photoToAddToCart, setPhotoToAddToCart] = useState<Photo | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isProofingModalOpen, setIsProofingModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [photoToShare, setPhotoToShare] = useState<Photo | null>(null);

  const photosInOrder =
    (order?.items.map((item) => item.photo).filter(Boolean) as Photo[]) || [];
  const [photosWithProofing, setPhotosWithProofing] =
    useState<Photo[]>(photosInOrder);

  // Sync cart to D1 for abandoned cart recovery emails
  useCartSync(order?.email, order?.destinationId);

  useEffect(() => {
    setPhotosWithProofing(photosInOrder);
  }, [order]);

  const onToggleFavorite = useCallback((photoId: string) => {
    setFavoritePhotoIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) newSet.delete(photoId);
      else newSet.add(photoId);
      return newSet;
    });
  }, []);

  const openLightbox = useCallback((photoIndex: number) => {
    setActiveLightboxIndex(photoIndex);
    setIsLightboxOpen(true);
  }, []);

  const handleOpenAddToCartModal = useCallback((photo: Photo) => {
    setPhotoToAddToCart(photo);
    setIsAddToCartModalOpen(true);
  }, []);

  const addItem = useCartStore(state => state.addItem);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const clearCart = useCartStore(state => state.clearCart);

  const handleAddToCart = useCallback(
    (product: Product, quantity: number) => {
      if (!photoToAddToCart) return;
      
      // We pass the product.name, product.price, product.category as format, and derive deliveryType
      const deliveryType = product.category === 'Digital' ? 'digital' : 'print';
      
      for (let i = 0; i < quantity; i++) {
        addItem(photoToAddToCart, product.name, product.price, product.category, deliveryType);
      }
      
      setIsAddToCartModalOpen(false);
      setPhotoToAddToCart(null);
    },
    [photoToAddToCart, addItem],
  );

  const handleUpdateCartQuantity = useCallback(
    (itemId: string, newQuantity: number) => {
      // Find the specific cart item to get its photoId to update via store
      const item = cart.find(i => i.id === itemId);
      if (item) {
        updateQuantity(item.photoId, newQuantity);
      }
    },
    [cart, updateQuantity],
  );

  const handleCheckoutSuccess = (orderId: string) => {
    clearCart();
    setIsCheckoutModalOpen(false);
    setView("Status");
    markCartRecovered(); // Tell D1 this cart converted — don't send recovery email
  };

  const handleUpdateProofingStatus = useCallback(
    (photoId: string, status: "approved" | "rejected" | "pending") => {
      setPhotosWithProofing((prev) =>
        prev.map((photo) =>
          photo.id === photoId ? { ...photo, proofingStatus: status } : photo,
        ),
      );
    },
    [],
  );

  const handleBulkShare = useCallback((photoIds: string[]) => {
    setPhotoToShare(null);
    setIsShareModalOpen(true);
  }, []);

  const handleDownloadHighRes = useCallback(async (photo: Photo) => {
    try {
      await Promise.resolve();
    } catch (error) {
      logger.error("Download failed", error);
      alert("Download failed. Please try again.");
    }
  }, []);

  const cartItemCount = getItemCount();
  const cartTotal = getTotal();
  const productsForStore = useMemo(
    () => MOCK_PRODUCTS.filter((p) => p.category !== "Digital"),
    [],
  );

  const renderView = () => {
    switch (view) {
      case "Gallery":
        return (
          <CustomerGallery
            photos={photosWithProofing}
            favoritePhotoIds={favoritePhotoIds}
            onToggleFavorite={onToggleFavorite}
            onOpenAddToCartModal={handleOpenAddToCartModal}
            onPhotoClick={(photo) =>
              openLightbox(
                photosWithProofing.findIndex((p) => p.id === photo.id),
              )
            }
            onNavigateToDownload={() => setView("Download")}
            onUpdateProofingStatus={handleUpdateProofingStatus}
            onBulkShare={handleBulkShare}
            onOpenProofing={() => setIsProofingModalOpen(true)}
            onDownloadHighRes={handleDownloadHighRes}
            isOrderPaid={
              order?.status === "Completed" || order?.status === "Delivered"
            }
          />
        );
      case "Store":
        return (
          <StorePage
            products={productsForStore}
            photos={photosInOrder}
            onAddToCart={(photo, product) => handleAddToCart(product, 1)}
          />
        );
      case "Favorites":
        return (
          <FavoritesPage
            photos={photosWithProofing.filter((p) =>
              favoritePhotoIds.has(p.id),
            )}
            favoritePhotoIds={favoritePhotoIds}
            onToggleFavorite={onToggleFavorite}
            onOpenAddToCartModal={handleOpenAddToCartModal}
            onPhotoClick={(photo) =>
              openLightbox(
                photosWithProofing.findIndex((p) => p.id === photo.id),
              )
            }
          />
        );
      case "Download":
        return order ? (
          <DownloadPage photos={photosWithProofing} orderId={order.id} />
        ) : null;
      case "Status":
        return order ? <OrderStatusPage order={order} /> : null;
      case "Buy Photos":
        return trashGallery ? (
          <MoneyTrashGallery
            trashGallery={trashGallery}
            favoritePhotoIds={favoritePhotoIds}
            onToggleFavorite={onToggleFavorite}
            onOpenAddToCartModal={(photo) =>
              handleOpenAddToCartModal(photo)
            }
            onPhotoClick={() => {}}
          />
        ) : null;
      default:
        return null;
    }
  };

  const NAV_ITEMS = useMemo(() => {
    const items: CustomerView[] = [];
    if (order)
      items.push("Gallery", "Store", "Favorites", "Download", "Status");
    if (trashGallery) items.push("Buy Photos");
    return items;
  }, [order, trashGallery]);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-cyan-500/30">
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-cyan-500 rounded-xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <img
                src={photosInOrder[0]?.url || "/gallery/logo.png"}
                alt="Gallery"
                className="w-11 h-11 rounded-xl object-cover border border-white/10 relative z-10 shadow-lg"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-black tracking-tight text-white uppercase italic leading-tight">
                {order?.clientName || trashGallery?.eventName || "Guest"}
                <span className="text-blue-500">.</span>Gallery
              </h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase opacity-70">
                {order ? `Order ID: ${order.id}` : "Limited Event Archive"}
              </p>
            </div>
          </div>

          <nav className="flex items-center space-x-1 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner backdrop-blur-md">
            {NAV_ITEMS.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                  view === v
                    ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 border border-cyan-400/50"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {v}
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsCheckoutModalOpen(true)}
              className="relative p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all group shadow-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5.5 h-5.5 bg-cyan-500 text-white text-[10px] font-black rounded-lg flex items-center justify-center shadow-xl border border-slate-900 animate-pulse">
                  {cartItemCount}
                </span>
              )}
            </button>
            <button
              onClick={onLogout}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors py-2 px-1"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-4 pb-16">{renderView()}</main>

      {!whiteLabelEnabled && (
        <footer className="py-8 text-center text-[10px] text-slate-500 font-bold tracking-widest uppercase">
          Powered by <span className="text-cyan-500 font-black italic ml-1">ClickFlash</span>
        </footer>
      )}

      {isLightboxOpen && (
        <EnhancedLightbox
          photos={photosWithProofing}
          startIndex={activeLightboxIndex}
          onClose={() => setIsLightboxOpen(false)}
          favoritePhotoIds={favoritePhotoIds}
          onToggleFavorite={onToggleFavorite}
          onOpenAddToCartModal={handleOpenAddToCartModal}
        />
      )}

      {isAddToCartModalOpen && photoToAddToCart && (
        <AddToCartModal
          isOpen={isAddToCartModalOpen}
          onClose={() => setIsAddToCartModalOpen(false)}
          photo={photoToAddToCart}
          products={productsForStore}
          onAddToCart={handleAddToCart}
        />
      )}

      {isCheckoutModalOpen && (
        <CheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          cart={cart}
          total={cartTotal}
          onUpdateQuantity={handleUpdateCartQuantity}
          clientName={order?.clientName || "Guest"}
          email={order?.email || ""}
          photographerId={typeof order?.photographerId === 'number' ? order.photographerId : parseInt(String(order?.photographerId || "0"), 10)}
          destinationId={order?.destinationId || ""}
          onCheckoutSuccess={handleCheckoutSuccess}
        />
      )}

      {isProofingModalOpen && (
        <ProofingModal
          isOpen={isProofingModalOpen}
          onClose={() => setIsProofingModalOpen(false)}
          photos={photosWithProofing}
          onUpdateProofingStatus={handleUpdateProofingStatus}
        />
      )}

      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setPhotoToShare(null);
          }}
          photo={photoToShare || undefined}
          galleryId={order?.id || trashGallery?.id || ""}
          galleryTitle={
            order
              ? `${order.clientName}'s Gallery`
              : trashGallery?.eventName || "Archived Photos"
          }
        />
      )}
    </div>
  );
};

export default CustomerLayout;
