import { FormConfig } from "@finstreet/forms";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { useExtracted } from "next-intl";
import { Button } from "@finstreet/ui/components/base/Button";
import { HStack } from "@styled-system/jsx";
import { updateLegalRepresentativeAction } from "../legalRepresentativeFormAction";
import {
  updateLegalRepresentativeSchema,
  UpdateLegalRepresentativeFormState,
  UpdateLegalRepresentativeOutputType,
  UpdateLegalRepresentativeType,
  LegalRepresentativeDefaultValues,
} from "../legalRepresentativeSchema";
import { useLegalRepresentativeUpdateFormFields } from "../useLegalRepresentativeFormFields";
import { useUpdateLegalRepresentativeModal } from "@/features/legalRepresentatives/modals/UpdateLegalRepresentativeModal/store";
import { usePortal } from "@/shared/context/portal/portalContext";
import { dataTestIds } from "e2e/data/dataTestIds";

interface UseUpdateLegalRepresentativeFormConfigProps {
  defaultValues: LegalRepresentativeDefaultValues;
  financingCaseId: string;
}

export function useUpdateLegalRepresentativeFormConfig({
  defaultValues,
  financingCaseId,
}: UseUpdateLegalRepresentativeFormConfigProps): FormConfig<
  UpdateLegalRepresentativeFormState,
  UpdateLegalRepresentativeType,
  UpdateLegalRepresentativeOutputType
> {
  const t = useExtracted();
  const fields = useLegalRepresentativeUpdateFormFields();
  const { setIsOpen } = useUpdateLegalRepresentativeModal();
  const { portal } = usePortal();
  const mergedDefaultValues: LegalRepresentativeDefaultValues = {
    ...defaultValues,
    financingCaseId,
  };

  return {
    fields,
    defaultValues: mergedDefaultValues,
    schema: updateLegalRepresentativeSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: (state, formData) =>
      updateLegalRepresentativeAction(state, formData, portal),
    useErrorAction: () => {
      return (formState: UpdateLegalRepresentativeFormState) => {
        console.error(
          "Update legal representative form error:",
          formState?.error,
        );
      };
    },
    useSuccessAction: () => {
      return (_formState: UpdateLegalRepresentativeFormState) => {
        setIsOpen(false);
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={12} justifyContent={"flex-end"}>
          <Button
            type="button"
            onClick={() => setIsOpen(false)}
            variant="text"
            data-testid={dataTestIds.buttons.cancelButton}
          >
            {t("Abbrechen")}
          </Button>
          <Button
            loading={isPending}
            type="submit"
            data-testid={dataTestIds.buttons.submitButton}
          >
            {t("Aktualisieren")}
          </Button>
        </HStack>
      );
    },
  };
}
