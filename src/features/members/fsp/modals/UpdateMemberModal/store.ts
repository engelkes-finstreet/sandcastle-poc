import { create } from "zustand";
import type { FspMemberType } from "@/shared/backend/models/fspMembers/schema";

type UpdateMemberModalData = FspMemberType | null;

interface UpdateMemberModalStore {
  isOpen: boolean;
  data: UpdateMemberModalData;
  setIsOpen: (isOpen: boolean) => void;
  setData: (data: UpdateMemberModalData) => void;
}

export const useUpdateMemberModal = create<UpdateMemberModalStore>((set) => ({
  isOpen: false,
  data: null,
  setIsOpen: (isOpen) => set({ isOpen }),
  setData: (data) => set({ data, isOpen: true }),
}));
