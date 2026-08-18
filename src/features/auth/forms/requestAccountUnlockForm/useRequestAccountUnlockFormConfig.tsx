import { FormConfig } from "@finstreet/forms";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { DeepPartial } from "react-hook-form";
import { Button } from "@finstreet/ui/components/base/Button";
import { HStack } from "@styled-system/jsx";
import { requestAccountUnlockFormAction } from "./requestAccountUnlockFormAction";
import { dataTestIds } from "e2e/data/dataTestIds";
import { useExtracted } from "next-intl";
import {
  RequestAccountUnlockFormState,
  RequestAccountUnlockType,
  requestAccountUnlockSchema,
} from "@/features/auth/forms/requestAccountUnlockForm/requestAccountUnlockFormSchema";
import { useRequestAccountUnlockFormFields } from "@/features/auth/forms/requestAccountUnlockForm/useRequestAccountUnlockFormFields";

export function useRequestAccountUnlockFormConfig(): FormConfig<
  RequestAccountUnlockFormState,
  RequestAccountUnlockType
> {
  const t = useExtracted();

  const defaultValues: DeepPartial<RequestAccountUnlockType> = {
    email: "",
  };

  const fields = useRequestAccountUnlockFormFields();

  return {
    fields,
    defaultValues,
    schema: requestAccountUnlockSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: requestAccountUnlockFormAction,
    useErrorAction: () => {
      return (formState: RequestAccountUnlockFormState) => {
        console.log(formState?.error);
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={4} justifyContent={"flex-end"}>
          <Button
            loading={isPending}
            type="submit"
            data-testid={dataTestIds.requestAccountUnlock.submitButton}
          >
            {t("Freischaltung anfordern")}
          </Button>
        </HStack>
      );
    },
  };
}
