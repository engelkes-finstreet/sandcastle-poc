import {
  WithdrawInvitationDefaultValues,
  WithdrawInvitationFormConfig,
  withdrawInvitationFormSchema,
  WithdrawInvitationFormState,
  WithdrawInvitationFormType,
} from "@/features/members/common/forms/withdrawInvitaionForm/withdrawInvitationFormSchema";
import { FormFieldsType } from "@finstreet/forms";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { HStack } from "@styled-system/jsx";
import { Button } from "@finstreet/ui/components/base/Button";
import { useWithdrawMemberInvitationModal } from "@/features/members/common/modals/WithdrawInvitationModal/store";
import { useExtracted } from "next-intl";
import { dataTestIds } from "e2e/data/dataTestIds";
import { withdrawInvitationFormAction } from "@/features/members/common/forms/withdrawInvitaionForm/withdrawInvitationFormAction";

export function useWithdrawInvitationFormConfig(
  invitationId: string,
): WithdrawInvitationFormConfig {
  const { setIsOpen } = useWithdrawMemberInvitationModal();
  const t = useExtracted();

  const defaultValues: WithdrawInvitationDefaultValues = {
    invitationId,
  };

  const fields: FormFieldsType<WithdrawInvitationFormType> = {
    invitationId: {
      type: "hidden",
    },
  };

  return {
    fields,
    defaultValues,
    schema: withdrawInvitationFormSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: withdrawInvitationFormAction,
    useSuccessAction: () => {
      return () => {
        setIsOpen(false);
      };
    },
    useErrorAction: () => {
      return (formState: WithdrawInvitationFormState) => {
        console.log(formState?.error);
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={12} justifyContent={"space-between"}>
          <Button type="button" onClick={() => setIsOpen(false)} variant="text">
            {t("Abbrechen")}
          </Button>
          <Button
            variant="destructive"
            loading={isPending}
            type="submit"
            data-testid={
              dataTestIds.members.withdrawInvitation
                .withdrawInvitationConfirmButton
            }
          >
            {t("Einladung zurückziehen")}
          </Button>
        </HStack>
      );
    },
  };
}
