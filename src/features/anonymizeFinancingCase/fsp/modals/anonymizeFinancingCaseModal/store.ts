import { create } from "zustand";

type AnonymizeFinancingCaseModalData = {
  financingCaseId: string;
} | null;

interface AnonymizeFinancingCaseModalStore {
  isOpen: boolean;
  data: AnonymizeFinancingCaseModalData;
  setIsOpen: (isOpen: boolean) => void;
  setData: (data: AnonymizeFinancingCaseModalData) => void;
}

export const useAnonymizeFinancingCaseModal =
  create<AnonymizeFinancingCaseModalStore>((set) => ({
    isOpen: false,
    data: null,
    setIsOpen: (isOpen) => set({ isOpen }),
    setData: (data) => set({ data, isOpen: true }),
  }));
