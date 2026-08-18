import { create } from "zustand";

interface AddSubstituteModalStore {
  isOpen: boolean;
  membershipId: string | null;
  openModal: (membershipId?: string) => void;
  closeModal: () => void;
}

export const useAddSubstituteModal = create<AddSubstituteModalStore>((set) => ({
  isOpen: false,
  membershipId: null,
  openModal: (membershipId) =>
    set({ isOpen: true, membershipId: membershipId ?? null }),
  closeModal: () => set({ isOpen: false, membershipId: null }),
}));
