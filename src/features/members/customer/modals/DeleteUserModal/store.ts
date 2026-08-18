import { create } from "zustand";

type DeleteUserModalData = {
  membershipId: string;
  name: string;
  email: string;
} | null;

interface DeleteUserModalStore {
  isOpen: boolean;
  data: DeleteUserModalData;
  setIsOpen: (isOpen: boolean) => void;
  setData: (data: DeleteUserModalData) => void;
}

export const useDeleteUserModal = create<DeleteUserModalStore>((set) => ({
  isOpen: false,
  data: null,
  setIsOpen: (isOpen) => set({ isOpen }),
  setData: (data) => set({ data, isOpen: true }),
}));
