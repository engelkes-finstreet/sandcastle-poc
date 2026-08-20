import { create } from "zustand";

interface ConfirmFeedbackModalStore {
  isOpen: boolean;
  isPending: boolean;
  setIsOpen: (isOpen: boolean) => void;
  setIsPending: (isPending: boolean) => void;
}

export const useConfirmFeedbackModal = create<ConfirmFeedbackModalStore>(
  (set) => ({
    isOpen: false,
    isPending: false,
    setIsOpen: (isOpen) => set({ isOpen }),
    setIsPending: (isPending) => set({ isPending }),
  }),
);
