import { FormConfig } from "@finstreet/forms";
import { DeepPartial } from "react-hook-form";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { setNewPasswordFormAction } from "./setNewPasswordFormAction";
import { Button } from "@finstreet/ui/components/base/Button";
import { useExtracted } from "next-intl";
import { HStack } from "@styled-system/jsx";
import {
  SetNewPasswordFormState,
  SetNewPasswordType,
  setNewPasswordSchema,
} from "@/features/auth/forms/setNewPasswordForm/setNewPasswordFormSchema";
import { useSetNewPasswordFormFields } from "@/features/auth/forms/setNewPasswordForm/useSetNewPasswordFormFields";

export function useSetNewPasswordFormConfig(): FormConfig<
  SetNewPasswordFormState,
  SetNewPasswordType
> {
  const t = useExtracted();

  const defaultValues: DeepPartial<SetNewPasswordType> = {
    password: "",
  };

  const fields = useSetNewPasswordFormFields();

  return {
    fields,
    defaultValues,
    schema: setNewPasswordSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: setNewPasswordFormAction,
    useErrorAction: () => {
      return (formState: SetNewPasswordFormState) => {
        console.log(formState?.error);
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={4} justifyContent={"flex-end"}>
          <Button loading={isPending} type="submit">
            {t("Passwort ändern")}
          </Button>
        </HStack>
      );
    },
  };
}
