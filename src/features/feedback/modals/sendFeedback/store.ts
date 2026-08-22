import { create } from "zustand";

interface SendFeedbackModalStore {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useSendFeedbackModal = create<SendFeedbackModalStore>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
}));
