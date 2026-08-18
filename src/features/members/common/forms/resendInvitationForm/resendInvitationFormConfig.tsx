import {
  ResendInvitationDefaultValues,
  ResendInvitationFormConfig,
  resendInvitationFormSchema,
  ResendInvitationFormState,
  ResendInvitationFormType,
} from "@/features/members/common/forms/resendInvitationForm/resendInvitationFormSchema";
import { FormFieldsType } from "@finstreet/forms";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { resendInvitationFormAction } from "@/features/members/common/forms/resendInvitationForm/resendInvitationFormAction";
import { Button } from "@finstreet/ui/components/base/Button";
import { HStack } from "@styled-system/jsx";
import { useResendInvitationModal } from "@/features/members/common/modals/ResendInvitationModal/store";
import { useExtracted } from "next-intl";
import { dataTestIds } from "e2e/data/dataTestIds";

export function useResendInvitationFormConfig(
  invitationId: string,
): ResendInvitationFormConfig {
  const { setIsOpen } = useResendInvitationModal();
  const t = useExtracted();

  const defaultValues: ResendInvitationDefaultValues = {
    invitationId,
  };

  const fields: FormFieldsType<ResendInvitationFormType> = {
    invitationId: {
      type: "hidden",
    },
  };

  return {
    fields,
    defaultValues,
    schema: resendInvitationFormSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: resendInvitationFormAction,
    useErrorAction: () => {
      return (formState: ResendInvitationFormState) => {
        console.log(formState?.error);
      };
    },
    useSuccessAction: () => {
      return (_formState: ResendInvitationFormState) => {
        setIsOpen(false);
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={12} justifyContent={"space-between"}>
          <Button type="button" onClick={() => setIsOpen(false)} variant="text">
            {t("Abbrechen")}
          </Button>
          <Button
            loading={isPending}
            type="submit"
            variant="primary"
            data-testid={
              dataTestIds.members.resendInvitation.resendInvitationConfirmButton
            }
          >
            {t("Einladung erneut senden")}
          </Button>
        </HStack>
      );
    },
  };
}
