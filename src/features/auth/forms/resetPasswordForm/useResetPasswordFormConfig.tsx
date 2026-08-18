import { HStack } from "@styled-system/jsx";
import { FormConfig } from "@finstreet/forms";
import { DeepPartial } from "react-hook-form";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { Button } from "@finstreet/ui/components/base/Button";
import { resetPasswordFormAction } from "./resetPasswordFormAction";
import { dataTestIds } from "../../../../../e2e/data/dataTestIds";
import { useExtracted } from "next-intl";
import {
  ResetPasswordFormState,
  ResetPasswordType,
  resetPasswordSchema,
} from "@/features/auth/forms/resetPasswordForm/resetPasswordFormSchema";
import { useResetPasswordFormFields } from "@/features/auth/forms/resetPasswordForm/useResetPasswordFormFields";

export function useResetPasswordFormConfig({
  passwordResetToken,
}: {
  passwordResetToken: string;
}): FormConfig<ResetPasswordFormState, ResetPasswordType> {
  const t = useExtracted();

  const defaultValues: DeepPartial<ResetPasswordType> = {
    password: "",
    passwordConfirmation: "",
    passwordResetToken,
  };

  const fields = useResetPasswordFormFields();

  return {
    fields,
    defaultValues,
    schema: resetPasswordSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: resetPasswordFormAction,
    useErrorAction: () => {
      return (formState: ResetPasswordFormState) => {
        console.log(formState?.error);
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={4} justifyContent={"flex-end"}>
          <Button
            loading={isPending}
            type="submit"
            data-testid={dataTestIds.resetPassword.submitButton}
          >
            {t("Passwort zurücksetzen")}
          </Button>
        </HStack>
      );
    },
  };
}
