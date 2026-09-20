import { create } from 'zustand';

interface ModalState {
  isPassModalOpen: boolean;
  setIsPassModalOpen: (open: boolean) => void;
  isFaceSearchOpen: boolean;
  setIsFaceSearchOpen: (open: boolean) => void;
  is3DFigureModalOpen: boolean;
  setIs3DFigureModalOpen: (open: boolean) => void;
  isReelModalOpen: boolean;
  setIsReelModalOpen: (open: boolean) => void;
  isCheckoutModalOpen: boolean;
  setIsCheckoutModalOpen: (open: boolean) => void;
  isProofingModalOpen: boolean;
  setIsProofingModalOpen: (open: boolean) => void;
  isShareModalOpen: boolean;
  setIsShareModalOpen: (open: boolean) => void;
  isAddToCartModalOpen: boolean;
  setIsAddToCartModalOpen: (open: boolean) => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isPassModalOpen: false,
  setIsPassModalOpen: (open) => set({ isPassModalOpen: open }),
  isFaceSearchOpen: false,
  setIsFaceSearchOpen: (open) => set({ isFaceSearchOpen: open }),
  is3DFigureModalOpen: false,
  setIs3DFigureModalOpen: (open) => set({ is3DFigureModalOpen: open }),
  isReelModalOpen: false,
  setIsReelModalOpen: (open) => set({ isReelModalOpen: open }),
  isCheckoutModalOpen: false,
  setIsCheckoutModalOpen: (open) => set({ isCheckoutModalOpen: open }),
  isProofingModalOpen: false,
  setIsProofingModalOpen: (open) => set({ isProofingModalOpen: open }),
  isShareModalOpen: false,
  setIsShareModalOpen: (open) => set({ isShareModalOpen: open }),
  isAddToCartModalOpen: false,
  setIsAddToCartModalOpen: (open) => set({ isAddToCartModalOpen: open }),
}));
