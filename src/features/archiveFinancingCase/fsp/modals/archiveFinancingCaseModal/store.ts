import { create } from "zustand";

type ArchiveFinancingCaseModalData = {
  financingCaseId: string;
} | null;

interface ArchiveFinancingCaseModalStore {
  isOpen: boolean;
  data: ArchiveFinancingCaseModalData;
  setIsOpen: (isOpen: boolean) => void;
  setData: (data: ArchiveFinancingCaseModalData) => void;
}

export const useArchiveFinancingCaseModal =
  create<ArchiveFinancingCaseModalStore>((set) => ({
    isOpen: false,
    data: null,
    setIsOpen: (isOpen) => set({ isOpen }),
    setData: (data) => set({ data, isOpen: true }),
  }));
