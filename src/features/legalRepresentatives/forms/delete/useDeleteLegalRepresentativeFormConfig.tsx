import { FormConfig } from "@finstreet/forms";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { useExtracted } from "next-intl";
import { Button } from "@finstreet/ui/components/base/Button";
import { HStack } from "@styled-system/jsx";
import { deleteLegalRepresentativeAction } from "./deleteLegalRepresentativeFormAction";
import {
  deleteLegalRepresentativeSchema,
  DeleteLegalRepresentativeFormState,
  DeleteLegalRepresentativeOutputType,
  DeleteLegalRepresentativeType,
  DeleteLegalRepresentativeDefaultValues,
} from "./deleteLegalRepresentativeSchema";
import { useDeleteLegalRepresentativeFormFields } from "./useDeleteLegalRepresentativeFormFields";
import { useDeleteLegalRepresentativeModal } from "@/features/legalRepresentatives/modals/DeleteLegalRepresentativeModal/store";
import { usePortal } from "@/shared/context/portal/portalContext";
import { dataTestIds } from "e2e/data/dataTestIds";

interface UseDeleteLegalRepresentativeFormConfigParams {
  financingCaseId: string;
  legalRepresentativeId: string;
}

export function useDeleteLegalRepresentativeFormConfig({
  financingCaseId,
  legalRepresentativeId,
}: UseDeleteLegalRepresentativeFormConfigParams): FormConfig<
  DeleteLegalRepresentativeFormState,
  DeleteLegalRepresentativeType,
  DeleteLegalRepresentativeOutputType
> {
  const t = useExtracted();
  const { setIsOpen } = useDeleteLegalRepresentativeModal();
  const fields = useDeleteLegalRepresentativeFormFields();
  const { portal } = usePortal();

  const defaultValues: DeleteLegalRepresentativeDefaultValues = {
    financingCaseId,
    legalRepresentativeId,
  };

  return {
    fields,
    defaultValues,
    schema: deleteLegalRepresentativeSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: (state, formData) =>
      deleteLegalRepresentativeAction(state, formData, portal),
    useErrorAction: () => {
      return (formState: DeleteLegalRepresentativeFormState) => {
        console.error(formState?.error);
      };
    },
    useSuccessAction: () => {
      return (_formState: DeleteLegalRepresentativeFormState) => {
        setIsOpen(false);
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={12} justifyContent={"flex-end"}>
          <Button
            loading={isPending}
            type="submit"
            variant="destructive"
            data-testid={dataTestIds.buttons.submitButton}
          >
            {t("Löschen")}
          </Button>
        </HStack>
      );
    },
  };
}
