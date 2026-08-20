import { create } from "zustand";

interface ConfirmFeedbackModalStore {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useConfirmFeedbackModal = create<ConfirmFeedbackModalStore>(
  (set) => ({
    isOpen: false,
    setIsOpen: (isOpen) => set({ isOpen }),
  }),
);
