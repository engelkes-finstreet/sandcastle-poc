import { FormFieldsType } from "@finstreet/forms";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { Button } from "@finstreet/ui/components/base/Button";
import { HStack } from "@styled-system/jsx";
import { useArchiveFinancingCaseModal } from "../../modals/archiveFinancingCaseModal/store";
import { archiveFinancingCaseFormAction } from "./archiveFinancingCaseFormAction";
import {
  ArchiveFinancingCaseDefaultValues,
  ArchiveFinancingCaseFormConfig,
  ArchiveFinancingCaseFormState,
  archiveFinancingCaseSchema,
  ArchiveFinancingCaseType,
} from "@/features/archiveFinancingCase/fsp/forms/archiveFinancingCaseForm/archiveFinancingCaseFormSchema";
import { useExtracted } from "next-intl";
import { useToast } from "@finstreet/ui/components/patterns/Toasts";
import { GetArchiveOptionsResponse } from "@/features/archiveFinancingCase/fsp/backend/schema";

export function useArchiveFinancingCaseFormConfig(
  financingCaseId: string,
  archivalOptions: GetArchiveOptionsResponse,
): ArchiveFinancingCaseFormConfig {
  const { setIsOpen } = useArchiveFinancingCaseModal();
  const t = useExtracted();
  const toast = useToast();

  const defaultValues: ArchiveFinancingCaseDefaultValues = {
    financingCaseId,
    archiveReason: undefined,
  };

  const fields: FormFieldsType<ArchiveFinancingCaseType> = {
    financingCaseId: {
      type: "hidden",
    },
    archiveReason: {
      type: "select",
      label: t("Archivierungsgrund"),
      items: archivalOptions,
    },
  };

  return {
    fields,
    defaultValues,
    schema: archiveFinancingCaseSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: archiveFinancingCaseFormAction,
    useSuccessAction: () => {
      return () => {
        toast.success({ title: t("Finanzierungsfall erfolgreich archiviert") });
        setIsOpen(false);
      };
    },
    useErrorAction: () => {
      return (formState: ArchiveFinancingCaseFormState) => {
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
          <Button loading={isPending} type="submit">
            {t("Archivieren")}
          </Button>
        </HStack>
      );
    },
  };
}
