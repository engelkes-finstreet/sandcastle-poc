import { FormFieldsType } from "@finstreet/forms";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { Button } from "@finstreet/ui/components/base/Button";
import { HStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { useToast } from "@finstreet/ui/components/patterns/Toasts";
import {
  AnonymizeFinancingCaseDefaultValues,
  AnonymizeFinancingCaseFormConfig,
  AnonymizeFinancingCaseFormState,
  anonymizeFinancingCaseSchema,
  AnonymizeFinancingCaseType,
} from "@/features/anonymizeFinancingCase/fsp/forms/anonymizeFinancingCaseForm/anonymizeFinancingCaseFormSchema";
import { useAnonymizeFinancingCaseModal } from "@/features/anonymizeFinancingCase/fsp/modals/anonymizeFinancingCaseModal/store";
import anonymizeFinancingCaseFormAction from "@/features/anonymizeFinancingCase/fsp/forms/anonymizeFinancingCaseForm/anonymizeFinancingCaseFormAction";

export function useAnonymizeFinancingCaseFormConfig(
  financingCaseId: string,
): AnonymizeFinancingCaseFormConfig {
  const { setIsOpen } = useAnonymizeFinancingCaseModal();
  const t = useExtracted();
  const toast = useToast();

  const defaultValues: AnonymizeFinancingCaseDefaultValues = {
    financingCaseId,
  };

  const fields: FormFieldsType<AnonymizeFinancingCaseType> = {
    financingCaseId: {
      type: "hidden",
    },
  };

  return {
    fields,
    defaultValues,
    schema: anonymizeFinancingCaseSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: anonymizeFinancingCaseFormAction,
    useSuccessAction: () => {
      return () => {
        toast.success({
          title: t("Finanzierungsfall erfolgreich anonymisiert"),
        });
        setIsOpen(false);
      };
    },
    useErrorAction: () => {
      return (formState: AnonymizeFinancingCaseFormState) => {
        console.log(formState?.error);
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={12} justifyContent={"space-between"}>
          <Button
            type="button"
            onClick={() => {
              setIsOpen(false);
            }}
            variant="text"
          >
            {t("Abbrechen")}
          </Button>
          <Button variant={"destructive"} loading={isPending} type="submit">
            {t("Anonymisieren")}
          </Button>
        </HStack>
      );
    },
  };
}
