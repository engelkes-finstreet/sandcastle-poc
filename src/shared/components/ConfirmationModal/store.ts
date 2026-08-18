import { create } from "zustand";

interface ConfirmationModalStore {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isPending: boolean;
  setIsPending: (isPending: boolean) => void;
}

export const useConfirmationModal = create<ConfirmationModalStore>((set) => ({
  isOpen: false,
  isPending: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  setIsPending: (isPending) => set({ isPending }),
}));
