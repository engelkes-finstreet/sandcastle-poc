import { create } from "zustand";

type ForwardFinancingCaseModalData = {
  financingCaseId: string;
} | null;

interface ForwardFinancingCaseModalStore {
  isOpen: boolean;
  data: ForwardFinancingCaseModalData;
  setIsOpen: (isOpen: boolean) => void;
  setData: (data: ForwardFinancingCaseModalData) => void;
}

export const useAssignFinancingCaseModal =
  create<ForwardFinancingCaseModalStore>((set) => ({
    isOpen: false,
    data: null,
    setIsOpen: (isOpen) => set({ isOpen }),
    setData: (data) => set({ data, isOpen: true }),
  }));
