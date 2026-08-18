import * as z from "@/lib/zod";
import { FormConfig, FormFieldsType, FormState } from "@finstreet/forms";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { DeepPartial } from "react-hook-form";
import { Button } from "@finstreet/ui/components/base/Button";
import { HStack } from "@styled-system/jsx";
import { confirmMarketingAgreementFormAction } from "@/features/customer/forms/confirmMarketingAgreement/confirmMarketingAgreementFormAction";
import { useExtracted } from "next-intl";

const confirmMarketingAgreementSchema = z.object({
  token: z.trimmedString().min(1, "Token is required"),
});

export type ConfirmMarketingAgreementType = z.infer<
  typeof confirmMarketingAgreementSchema
>;
export type ConfirmMarketingAgreementFormState = FormState;

export function useConfirmMarketingAgreementFormConfig(
  token: string,
): FormConfig<
  ConfirmMarketingAgreementFormState,
  ConfirmMarketingAgreementType
> {
  const t = useExtracted();
  const defaultValues: DeepPartial<ConfirmMarketingAgreementType> = {
    token,
  };

  const fields: FormFieldsType<ConfirmMarketingAgreementType> = {
    token: {
      type: "hidden",
    },
  };

  return {
    fields,
    defaultValues,
    schema: confirmMarketingAgreementSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: confirmMarketingAgreementFormAction,
    useErrorAction: () => {
      return (formState: ConfirmMarketingAgreementFormState) => {
        console.log(formState?.error);
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack justifyContent={"flex-end"}>
          <Button loading={isPending} type="submit">
            {t("Werbeeinwilligung bestätigen")}
          </Button>
        </HStack>
      );
    },
  };
}
