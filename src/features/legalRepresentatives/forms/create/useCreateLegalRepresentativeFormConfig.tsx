import { FormConfig } from "@finstreet/forms";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { useExtracted } from "next-intl";
import { Button } from "@finstreet/ui/components/base/Button";
import { HStack } from "@styled-system/jsx";
import { createLegalRepresentativeAction } from "../legalRepresentativeFormAction";
import {
  createLegalRepresentativeSchema,
  CreateLegalRepresentativeFormState,
  CreateLegalRepresentativeOutputType,
  CreateLegalRepresentativeType,
} from "../legalRepresentativeSchema";
import { useLegalRepresentativeFormFields } from "../useLegalRepresentativeFormFields";
import { useCreateLegalRepresentativeModal } from "@/features/legalRepresentatives/modals/CreateLegalRepresentativeModal/store";
import { usePortal } from "@/shared/context/portal/portalContext";
import { dataTestIds } from "e2e/data/dataTestIds";

interface UseCreateLegalRepresentativeFormConfigProps {
  financingCaseId: string;
}

export function useCreateLegalRepresentativeFormConfig({
  financingCaseId,
}: UseCreateLegalRepresentativeFormConfigProps): FormConfig<
  CreateLegalRepresentativeFormState,
  CreateLegalRepresentativeType,
  CreateLegalRepresentativeOutputType
> {
  const t = useExtracted();
  const fields = useLegalRepresentativeFormFields();
  const { setIsOpen } = useCreateLegalRepresentativeModal();
  const { portal } = usePortal();

  const defaultValues: Partial<CreateLegalRepresentativeType> = {
    financingCaseId,
    soleSignatureAuthorized: false,
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
  };

  return {
    fields,
    defaultValues,
    schema: createLegalRepresentativeSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: (state, formData) =>
      createLegalRepresentativeAction(state, formData, portal),
    useErrorAction: () => {
      return (formState: CreateLegalRepresentativeFormState) => {
        console.error(
          "Create legal representative form error:",
          formState?.error,
        );
      };
    },
    useSuccessAction: () => {
      return (_formState: CreateLegalRepresentativeFormState) => {
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
            {t("Speichern")}
          </Button>
        </HStack>
      );
    },
  };
}
