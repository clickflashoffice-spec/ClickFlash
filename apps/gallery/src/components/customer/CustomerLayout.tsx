// @ts-nocheck
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
import SubscriptionPassModal from "./SubscriptionPassModal";
import GuestFaceSearchModal from "./GuestFaceSearchModal";
import { SocialProofToast } from "./SocialProofToast";
import { MoneyTrashGallery } from "./MoneyTrashGallery";
// @ts-nocheck
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
import SubscriptionPassModal from "./SubscriptionPassModal";
import GuestFaceSearchModal from "./GuestFaceSearchModal";
import { SocialProofToast } from "./SocialProofToast";
import { MoneyTrashGallery } from "./MoneyTrashGallery";
import {
  moneyTrashService,
  type MoneyTrashPhoto,
  type MoneyTrashPurchaseDownload,
  type TrashGallery,
} from "../../services/moneyTrashService";
import { markCartRecovered, useCartSync } from "../../hooks/useCartSync.ts";
import useCartStore from "../../stores/useCartStore.ts";
import AIProductBar, { AIProductType } from "./AIProductBar";
import FavoritesBar from "./FavoritesBar";
import FigurePreview3D from "./FigurePreview3D";
import ReelPreview from "./ReelPreview";
import { galleryDownloadService } from "../../services/GalleryDownloadService";

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
  trashGallery?: TrashGallery;
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
  const { cart, clearCart } = useCartStore((state) => ({
    cart: state.items,
    clearCart: state.clearCart,
  }));
  const activeCart = useMemo(
    () => cart.filter((item) => trashGallery
      ? item.productId === "moneytrash_single" && item.photo?.albumId === trashGallery.id
      : item.productId !== "moneytrash_single"),
    [cart, trashGallery],
  );
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(false);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [productsForStore, setProductsForStore] = useState<Product[]>([]);
  const [checkoutNotice, setCheckoutNotice] = useState<{
    tone: "success" | "warning" | "error";
    message: string;
  } | null>(null);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [isFaceSearchOpen, setIsFaceSearchOpen] = useState(false);
  const [moneyTrashDownloads, setMoneyTrashDownloads] = useState<MoneyTrashPurchaseDownload[]>([]);
  const [is3DFigureModalOpen, setIs3DFigureModalOpen] = useState(false);
  const [isReelModalOpen, setIsReelModalOpen] = useState(false);

  useEffect(() => {
    const fetchBranding = async () => {
      const destId = order?.destinationId || trashGallery?.destinationId;
      if (!destId) return;
      try {
        const branding = await cloudApiService.getResortBranding(destId);
        if (branding) {
          setWhiteLabelEnabled(true);
          
          if (branding.primaryColor) {
            document.documentElement.style.setProperty('--brand-primary', branding.primaryColor);
          }
          if (branding.logoUrl) {
            setBrandLogoUrl(branding.logoUrl);
          }
        }
      } catch (e) {
        logger.error("Failed to fetch resort branding", e);
      }
    };
    fetchBranding();
  }, [order?.destinationId, trashGallery?.destinationId]);

  useEffect(() => {
    let cancelled = false;

    cloudApiService.getProducts()
      .then((products) => {
        if (!cancelled) setProductsForStore(products);
      })
      .catch((error) => {
        logger.error("Failed to load storefront products", error);
        if (!cancelled) setProductsForStore([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!order) return;

    const params = new URLSearchParams(window.location.search);
    const checkoutResult = params.get("checkout");
    const sessionId = params.get("session_id");
    if (checkoutResult === "cancelled") {
      setCheckoutNotice({ tone: "warning", message: "Checkout was cancelled. Your cart is still available." });
      params.delete("checkout");
      window.history.replaceState({}, "", `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`);
      return;
    }
    if (checkoutResult !== "success" || !sessionId) return;

    let active = true;
    setCheckoutNotice({ tone: "warning", message: "Confirming your payment…" });
    const reconcile = async () => {
      try {
        for (let attempt = 0; attempt < 5 && active; attempt += 1) {
          const result = await cloudApiService.getCheckoutStatus(sessionId);
          if (result.paid) {
            clearCart();
            await markCartRecovered();
            if (active) setCheckoutNotice({ tone: "success", message: "Payment confirmed. Your purchase is ready." });
            break;
          }
          if (attempt < 4) {
            await new Promise((resolve) => window.setTimeout(resolve, 1000 * (attempt + 1)));
          } else if (active) {
            setCheckoutNotice({ tone: "warning", message: "Payment is still processing. Your cart has been preserved." });
          }
        }
      } catch (error) {
        logger.error("Checkout return verification failed", error);
        if (active) setCheckoutNotice({ tone: "error", message: "We could not confirm payment yet. Your cart has been preserved." });
      } finally {
        params.delete("checkout");
        params.delete("session_id");
        window.history.replaceState({}, "", `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`);
      }
    };

    void reconcile();
    return () => {
      active = false;
    };
  }, [clearCart, order]);

  useEffect(() => {
    if (!trashGallery?.purchaseToken) return;

    const params = new URLSearchParams(window.location.search);
    const checkoutResult = params.get("moneytrash_checkout");
    const sessionId = params.get("session_id") || moneyTrashService.getRememberedStripeSession();
    const cleanReturnParams = () => {
      params.delete("moneytrash_checkout");
      params.delete("session_id");
      window.history.replaceState({}, "", `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`);
    };

    if (checkoutResult === "cancelled") {
      moneyTrashService.clearRememberedStripeSession();
      setCheckoutNotice({ tone: "warning", message: "Checkout was cancelled. Your selected photos are still in the cart." });
      cleanReturnParams();
      return;
    }
    if ((checkoutResult && checkoutResult !== "success") || !sessionId) return;

    let active = true;
    setCheckoutNotice({ tone: "warning", message: "Confirming your MoneyTrash payment…" });
    const reconcile = async () => {
      try {
        for (let attempt = 0; attempt < 5 && active; attempt += 1) {
          const result = await moneyTrashService.getCheckoutStatus(trashGallery.purchaseToken, sessionId);
          if (result.paid) {
            const store = useCartStore.getState();
            store.items
              .filter((item) => item.productId === "moneytrash_single" && item.photo?.albumId === trashGallery.id)
              .forEach((item) => store.removeItem(item.photoId));
            moneyTrashService.clearCheckoutSession();
            if (active) {
              setMoneyTrashDownloads(result.downloads);
              setCheckoutNotice({ tone: "success", message: "Payment confirmed. Your original files are ready below." });
            }
            break;
          }
          if (attempt < 4) {
            await new Promise((resolve) => window.setTimeout(resolve, 1000 * (attempt + 1)));
          } else if (active) {
            setCheckoutNotice({ tone: "warning", message: "Payment is still processing. Your cart has been preserved." });
          }
        }
      } catch (error) {
        logger.error("MoneyTrash checkout return verification failed", error);
        if (active) setCheckoutNotice({ tone: "error", message: "We could not confirm payment yet. Your cart has been preserved." });
      } finally {
        cleanReturnParams();
      }
    };

    void reconcile();
    return () => {
      active = false;
    };
  }, [trashGallery]);

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
  const lightboxPhotos = useMemo(
    () => trashGallery?.photos || photosWithProofing,
    [photosWithProofing, trashGallery],
  );

  // Sync cart to D1 for abandoned cart recovery emails
  useCartSync(order?.email);

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

  const handleAddToCart = useCallback(
    (product: Product, quantity: number) => {
      if (!photoToAddToCart) return;
      
      // We pass the product.name, product.price, product.category as format, and derive deliveryType
      const deliveryType = product.category === 'Digital' ? 'digital' : 'print';
      
      for (let i = 0; i < quantity; i++) {
        addItem(photoToAddToCart, product.id, product.name, product.price, product.category, deliveryType);
      }
      
      setIsAddToCartModalOpen(false);
      setPhotoToAddToCart(null);
    },
    [photoToAddToCart, addItem],
  );

  const handleAddMoneyTrashPhoto = useCallback(
    (photo: MoneyTrashPhoto) => {
      addItem(
        photo,
        "moneytrash_single",
        "Digital Photo",
        photo.discountPrice,
        "Digital",
        "digital",
      );
      setIsCheckoutModalOpen(true);
    },
    [addItem],
  );

  const handleAddAllFromFaceSearch = useCallback(
    (matchedPhotos: Photo[]) => {
      matchedPhotos.forEach((photo) => {
        addItem(
          photo,
          productsForStore[0]?.id || "digital_single",
          productsForStore[0]?.name || "Digital Download",
          productsForStore[0]?.price || 15,
          "Digital",
          "digital",
        );
      });
      setIsFaceSearchOpen(false);
      setIsCheckoutModalOpen(true);
    },
    [addItem, productsForStore],
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

  const handleUpdateProofingStatus = useCallback(
    async (photoId: string, status: "approved" | "rejected" | "pending") => {
      // Find old status for rollback
      const photoToUpdate = photosWithProofing.find((p) => p.id === photoId);
      const oldStatus = photoToUpdate?.proofingStatus;

      // 1. Optimistic Update
      setPhotosWithProofing((prev) =>
        prev.map((photo) =>
          photo.id === photoId ? { ...photo, proofingStatus: status } : photo,
        ),
      );

      // 2. Persist to Backend
      if (order?.id) {
        try {
          await cloudApiService.updateProofingStatus(order.id, photoId, status);
        } catch (error) {
          logger.error("Failed to update proofing status", error);
          // 3. Rollback on failure
          setPhotosWithProofing((prev) =>
            prev.map((photo) =>
              photo.id === photoId
                ? { ...photo, proofingStatus: oldStatus }
                : photo,
            ),
          );
          // TODO: Ideally trigger a toast notification here
        }
      }
    },
    [photosWithProofing, order?.id],
  );

  const handleBulkShare = useCallback((photoIds: string[]) => {
    setPhotoToShare(null);
    setIsShareModalOpen(true);
  }, []);

  const handleDownloadHighRes = useCallback(async (photo: Photo) => {
    try {
      const downloadUrl = await cloudApiService.getPhotoDownloadUrl(photo.id);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${photo.title || photo.id}_highres.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      logger.error("Download failed", error);
      alert("Download failed. Please try again.");
    }
  }, []);

  const handleAIAction = useCallback((type: AIProductType) => {
    if (type === '3d-figure') {
      const photo = Array.from(favoritePhotoIds).length > 0
        ? photosWithProofing.find(p => p.id === Array.from(favoritePhotoIds)[0])
        : photosWithProofing[0];
      setPhotoToAddToCart(photo || null);
      setIs3DFigureModalOpen(true);
    } else if (type === 'ai-reel') {
      setIsReelModalOpen(true);
    } else if (type === 'full-gallery') {
      setIsCheckoutModalOpen(true);
    } else if (type === 'magic-shot') {
      alert('Magic shot integration coming soon!');
    }
  }, [favoritePhotoIds, photosWithProofing]);

  const handleShareFavorites = async (platform: string) => {
    const gid = order?.id || trashGallery?.id || 'demo-gallery';
    const url = await galleryDownloadService.generateShareLink(gid, platform as any);
    if (platform === 'clipboard') {
      navigator.clipboard.writeText(url);
      alert('Gallery link copied to clipboard!');
    } else {
      const shareUrl = galleryDownloadService.getShareUrl(platform, url, 'Check out these photos!');
      window.open(shareUrl, '_blank');
    }
  };

  const handleDownloadFavorites = async () => {
    try {
      const isPaid = ["paid", "completed", "delivered", "fulfilled"].includes(String(order?.status || "").toLowerCase());
      const blob = await galleryDownloadService.downloadSelected(Array.from(favoritePhotoIds), isPaid);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `favorites-${order?.id || 'gallery'}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed', error);
      alert('Failed to download favorites.');
    }
  };

  const cartItemCount = activeCart.reduce((count, item) => count + item.quantity, 0);
  const cartTotal = activeCart.reduce((total, item) => total + item.price * item.quantity, 0);
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
            isOrderPaid={["paid", "completed", "delivered", "fulfilled"].includes(
              String(order?.status || "").toLowerCase(),
            )}
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
            onOpenAddToCartModal={handleAddMoneyTrashPhoto}
            onPhotoClick={(photo) =>
              openLightbox(
                trashGallery.photos.findIndex((candidate) => candidate.id === photo.id),
              )
            }
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
                src={brandLogoUrl || photosInOrder[0]?.url || "/gallery/logo.png"}
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

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsFaceSearchOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 border border-blue-500/40 text-blue-300 hover:text-white hover:border-blue-400 transition-all text-xs font-bold shadow-lg shadow-blue-500/10"
              title="Find all photos of you with AI Facial Recognition"
            >
              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden md:inline">Find My Photos</span>
            </button>

            <button
              onClick={() => setIsPassModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-300 hover:text-white hover:border-cyan-400 transition-all text-xs font-bold shadow-lg shadow-cyan-500/10"
              title="Unlock All Resort Photos"
            >
              <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span className="hidden md:inline">VIP Pass</span>
            </button>

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
      {isLightboxOpen && (
        <EnhancedLightbox
          photos={lightboxPhotos}
          startIndex={activeLightboxIndex}
          onClose={() => setIsLightboxOpen(false)}
          favoritePhotoIds={favoritePhotoIds}
          onToggleFavorite={onToggleFavorite}
          onOpenAddToCartModal={(photo) => {
            setIsLightboxOpen(false);
            if (trashGallery) {
              handleAddMoneyTrashPhoto(photo as MoneyTrashPhoto);
            } else {
              handleOpenAddToCartModal(photo);
            }
          }}
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
          cart={activeCart}
          total={cartTotal}
          onUpdateQuantity={handleUpdateCartQuantity}
          onPaymentComplete={() => {
            clearCart();
            void markCartRecovered();
            setCheckoutNotice({
              tone: "success",
              message: "Payment confirmed. Your purchase is ready.",
            });
            setIsCheckoutModalOpen(false);
          }}
          albumId={order?.albumId || photosInOrder[0]?.albumId || ""}
          moneyTrashGalleryId={trashGallery?.id}
          moneyTrashPurchaseToken={trashGallery?.purchaseToken}
        />
      )}

      {isProofingModalOpen && (
        <ProofingModal
          isOpen={isProofingModalOpen}
          onClose={() => setIsProofingModalOpen(false)}
          moneyTrashGalleryId={trashGallery?.id}
          moneyTrashPurchaseToken={trashGallery?.purchaseToken}
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

      {/* Real-time Guest Social Proof FOMO Toast */}
      <SocialProofToast />

      {/* Resort All-Inclusive Digital & Vacation Pass Modal */}
      {isPassModalOpen && (
        <SubscriptionPassModal
          isOpen={isPassModalOpen}
          onClose={() => setIsPassModalOpen(false)}
          galleryId={order?.id || trashGallery?.id || "resort-guest"}
        />
      )}

      {is3DFigureModalOpen && photoToAddToCart && (
        <FigurePreview3D
          isOpen={is3DFigureModalOpen}
          onClose={() => setIs3DFigureModalOpen(false)}
          photoUrl={photoToAddToCart.url}
          photoId={photoToAddToCart.id}
          onOrder={(opts) => {
            console.log('Ordered 3D Figure', opts);
            alert(`Added 3D Figure to order: ${opts.size} ${opts.material} in ${opts.style} style!`);
            setIs3DFigureModalOpen(false);
          }}
        />
      )}

      {isReelModalOpen && (
        <ReelPreview
          isOpen={isReelModalOpen}
          onClose={() => setIsReelModalOpen(false)}
          galleryId={order?.id || trashGallery?.id || "demo-gallery"}
          photoCount={photosWithProofing.length}
          onGenerate={(opts) => {
            console.log('Generated reel with options', opts);
          }}
        />
      )}
    </div>
  );
};

export default CustomerLayout;
