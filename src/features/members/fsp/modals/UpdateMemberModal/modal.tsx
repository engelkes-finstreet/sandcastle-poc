"use client";

import {
  Modal,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { useUpdateMemberModal } from "./store";
import {
  GetDepartmentOptionsResponseType,
  GetSigningGroupOptionsResponseType,
} from "@/shared/backend/models/memberships/schema";
import { UpdateMemberForm } from "@/features/members/fsp/forms/memberForm/updateMember/UpdateMemberForm";

type UpdateMemberModalProps = {
  departments: GetDepartmentOptionsResponseType;
  signingGroups: GetSigningGroupOptionsResponseType;
};

export const UpdateMemberModal = ({
  departments,
  signingGroups,
}: UpdateMemberModalProps) => {
  const { isOpen, data, setIsOpen } = useUpdateMemberModal();

  if (!data) {
    return null;
  }

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTitle>Update Member</ModalTitle>
      <ModalContent>
        <UpdateMemberForm
          departments={departments}
          signingGroups={signingGroups}
          member={data}
        />
      </ModalContent>
    </Modal>
  );
};
