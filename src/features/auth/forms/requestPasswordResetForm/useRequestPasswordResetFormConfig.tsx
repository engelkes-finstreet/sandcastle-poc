import { HStack } from "@styled-system/jsx";
import { FormConfig } from "@finstreet/forms";
import { DeepPartial } from "react-hook-form";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { Button } from "@finstreet/ui/components/base/Button";
import { requestPasswordResetFormAction } from "./requestPasswordResetFormAction";
import { dataTestIds } from "e2e/data/dataTestIds";
import { useExtracted } from "next-intl";
import {
  RequestPasswordResetFormState,
  RequestPasswordResetType,
  requestPasswordResetSchema,
} from "@/features/auth/forms/requestPasswordResetForm/requestPasswordResetFormSchema";
import { useRequestPasswordResetFormFields } from "@/features/auth/forms/requestPasswordResetForm/useRequestPasswordResetFormFields";

export function useRequestPasswordResetFormConfig(): FormConfig<
  RequestPasswordResetFormState,
  RequestPasswordResetType
> {
  const t = useExtracted();

  const defaultValues: DeepPartial<RequestPasswordResetType> = {
    email: "",
  };

  const fields = useRequestPasswordResetFormFields();

  return {
    fields,
    defaultValues,
    schema: requestPasswordResetSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: requestPasswordResetFormAction,
    useErrorAction: () => {
      return (formState: RequestPasswordResetFormState) => {
        console.log(formState?.error);
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={4} justifyContent={"flex-end"}>
          <Button
            loading={isPending}
            type="submit"
            data-testid={dataTestIds.requestPasswordReset.submitButton}
          >
            {t("Passwort zurücksetzen")}
          </Button>
        </HStack>
      );
    },
  };
}
