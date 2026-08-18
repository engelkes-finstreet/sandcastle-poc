import { create } from "zustand";
import { LegalRepresentativeDefaultValues } from "@/features/legalRepresentatives/forms/legalRepresentativeSchema";

type UpdateLegalRepresentativeModalData = {
  financingCaseId: string;
  legalRepresentativeDefaultValues: LegalRepresentativeDefaultValues;
} | null;

interface UpdateLegalRepresentativeModalStore {
  isOpen: boolean;
  data: UpdateLegalRepresentativeModalData;
  setIsOpen: (isOpen: boolean) => void;
  setData: (data: UpdateLegalRepresentativeModalData) => void;
}

export const useUpdateLegalRepresentativeModal =
  create<UpdateLegalRepresentativeModalStore>((set) => ({
    isOpen: false,
    data: null,
    setIsOpen: (isOpen) => set({ isOpen }),
    setData: (data) => set({ data, isOpen: true }),
  }));
