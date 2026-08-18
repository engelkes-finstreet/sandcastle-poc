import { create } from "zustand";

interface DocumentExchangeSwitchStore {
  isChecked: boolean;
  setIsChecked: (isChecked: boolean) => void;
}

export const useDocumentExchangeSwitch = create<DocumentExchangeSwitchStore>(
  (set) => ({
    isChecked: false,
    setIsChecked: (isChecked) => set({ isChecked }),
  }),
);
