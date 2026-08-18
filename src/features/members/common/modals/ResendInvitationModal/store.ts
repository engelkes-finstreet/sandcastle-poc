import { create } from "zustand";

type ResendInvitationModalData = {
  invitationId: string;
  memberEmail: string;
  memberName: string;
} | null;

interface ResendInvitationModalStore {
  isOpen: boolean;
  data: ResendInvitationModalData;
  setIsOpen: (isOpen: boolean) => void;
  setData: (data: ResendInvitationModalData) => void;
}

export const useResendInvitationModal = create<ResendInvitationModalStore>(
  (set) => ({
    isOpen: false,
    data: null,
    setIsOpen: (isOpen) => set({ isOpen }),
    setData: (data) => set({ data, isOpen: true }),
  }),
);
