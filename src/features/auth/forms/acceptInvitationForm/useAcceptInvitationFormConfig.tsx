import { FormConfig } from "@finstreet/forms";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { DeepPartial } from "react-hook-form";
import { useExtracted } from "next-intl";
import { Button } from "@finstreet/ui/components/base/Button";
import { HStack } from "@styled-system/jsx";
import { FaArrowRight } from "react-icons/fa6";
import { acceptInvitationFormAction } from "@/features/auth/forms/acceptInvitationForm/acceptInvitationFormAction";
import { dataTestIds } from "e2e/data/dataTestIds";
import {
  AcceptInvitationFormState,
  AcceptInvitationType,
  acceptInvitationSchema,
} from "@/features/auth/forms/acceptInvitationForm/acceptInvitationFormSchema";
import { useAcceptInvitationFormFields } from "@/features/auth/forms/acceptInvitationForm/useAcceptInvitationFormFields";

export function useAcceptInvitationFormConfig({
  token,
  firstName,
  lastName,
}: {
  token: string;
  firstName: string;
  lastName: string;
}): FormConfig<AcceptInvitationFormState, AcceptInvitationType> {
  const t = useExtracted();

  const defaultValues: DeepPartial<AcceptInvitationType> = {
    password: "",
    passwordConfirmation: "",
    token,
    firstName,
    lastName,
  };

  const fields = useAcceptInvitationFormFields();

  return {
    fields,
    defaultValues,
    schema: acceptInvitationSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: acceptInvitationFormAction,
    useErrorAction: () => {
      return (formState: AcceptInvitationFormState) => {
        console.log(formState?.error);
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={12} justifyContent={"flex-end"}>
          <Button
            loading={isPending}
            type="submit"
            icon={<FaArrowRight />}
            data-testid={dataTestIds.acceptInvitation.submitButton}
          >
            {t("Jetzt registrieren")}
          </Button>
        </HStack>
      );
    },
  };
}
