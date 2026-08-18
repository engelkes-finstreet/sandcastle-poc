import { create } from "zustand";

interface StopSubstituteModalStore {
  isOpen: boolean;
  membershipId: string | null;
  openModal: (membershipId?: string) => void;
  closeModal: () => void;
}

export const useStopSubstituteModal = create<StopSubstituteModalStore>(
  (set) => ({
    isOpen: false,
    membershipId: null,
    openModal: (membershipId) =>
      set({ isOpen: true, membershipId: membershipId ?? null }),
    closeModal: () => set({ isOpen: false, membershipId: null }),
  }),
);
