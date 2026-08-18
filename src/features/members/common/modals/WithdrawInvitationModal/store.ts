import { create } from "zustand";

type WithdrawMemberInvitationModalData = {
  invitationId: string;
  memberEmail: string;
  memberName: string;
} | null;

interface WithdrawMemberInvitationModalStore {
  isOpen: boolean;
  data: WithdrawMemberInvitationModalData;
  setIsOpen: (isOpen: boolean) => void;
  setData: (data: WithdrawMemberInvitationModalData) => void;
}

export const useWithdrawMemberInvitationModal =
  create<WithdrawMemberInvitationModalStore>((set) => ({
    isOpen: false,
    data: null,
    setIsOpen: (isOpen) => set({ isOpen }),
    setData: (data) => set({ data, isOpen: true }),
  }));
