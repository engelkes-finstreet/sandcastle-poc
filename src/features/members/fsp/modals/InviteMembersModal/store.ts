import {
  GetDepartmentOptionsResponseType,
  GetSigningGroupOptionsResponseType,
} from "@/shared/backend/models/memberships/schema";
import { create } from "zustand";

type InviteMemberModalData = {
  departments: GetDepartmentOptionsResponseType;
  signingGroups: GetSigningGroupOptionsResponseType;
} | null;

interface InviteMemberModalStore {
  isOpen: boolean;
  data: InviteMemberModalData;
  setIsOpen: (isOpen: boolean) => void;
  setData: (data: InviteMemberModalData) => void;
}

export const useInviteMemberModal = create<InviteMemberModalStore>((set) => ({
  isOpen: false,
  data: null,
  setIsOpen: (isOpen) => set({ isOpen }),
  setData: (data) => set({ data, isOpen: true }),
}));
