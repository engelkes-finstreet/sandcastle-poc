import { create } from "zustand";

type CreateLegalRepresentativeModalData = {
  financingCaseId: string;
} | null;

interface CreateLegalRepresentativeModalStore {
  isOpen: boolean;
  data: CreateLegalRepresentativeModalData;
  setIsOpen: (isOpen: boolean) => void;
  setData: (data: CreateLegalRepresentativeModalData) => void;
}

export const useCreateLegalRepresentativeModal =
  create<CreateLegalRepresentativeModalStore>((set) => ({
    isOpen: false,
    data: null,
    setIsOpen: (isOpen) => set({ isOpen }),
    setData: (data) => set({ data, isOpen: true }),
  }));
