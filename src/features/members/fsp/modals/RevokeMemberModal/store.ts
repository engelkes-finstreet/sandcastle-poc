import { create } from "zustand";

type RevokeMemberModalData = {
  membershipId: string;
  membershipName: string;
} | null;

interface RevokeMemberModalStore {
  isOpen: boolean;
  data: RevokeMemberModalData;
  setIsOpen: (isOpen: boolean) => void;
  setData: (data: RevokeMemberModalData) => void;
}

export const useRevokeMemberModal = create<RevokeMemberModalStore>((set) => ({
  isOpen: false,
  data: null,
  setIsOpen: (isOpen) => set({ isOpen }),
  setData: (data) => set({ data, isOpen: true }),
}));
