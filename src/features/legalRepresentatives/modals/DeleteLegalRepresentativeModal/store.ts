import { create } from "zustand";

type DeleteLegalRepresentativeModalData = {
  financingCaseId: string;
  legalRepresentativeId: string;
  name: string;
} | null;

interface DeleteLegalRepresentativeModalStore {
  isOpen: boolean;
  data: DeleteLegalRepresentativeModalData;
  setIsOpen: (isOpen: boolean) => void;
  setData: (data: DeleteLegalRepresentativeModalData) => void;
}

export const useDeleteLegalRepresentativeModal =
  create<DeleteLegalRepresentativeModalStore>((set) => ({
    isOpen: false,
    data: null,
    setIsOpen: (isOpen) => set({ isOpen }),
    setData: (data) => set({ data, isOpen: true }),
  }));
