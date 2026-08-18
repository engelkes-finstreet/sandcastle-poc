"use client";

import { createFormFieldNames } from "@finstreet/forms/lib";
import { Button } from "@finstreet/ui/components/base/Button";
import { useExtracted } from "next-intl";

import { HStack } from "@styled-system/jsx";

import { assignSubstituteFormAction } from "./assignSubstituteFormAction";
import {
  AssignSubstituteDefaultValues,
  AssignSubstituteFormConfig,
  AssignSubstituteFormState,
  assignSubstituteSchema,
} from "./assignSubstituteSchema";
import { useAssignSubstituteFormFields } from "./useAssignSubstituteFormFields";
import { useAddSubstituteModal } from "../../modals/AddSubstituteModal/store";
import { dataTestIds } from "e2e/data/dataTestIds";

type UseAssignSubstituteFormConfigParams = {
  membershipId?: string | null;
};

export function useAssignSubstituteFormConfig(
  defaultValues: AssignSubstituteDefaultValues,
  { membershipId }: UseAssignSubstituteFormConfigParams = {},
): AssignSubstituteFormConfig {
  const t = useExtracted();
  const fields = useAssignSubstituteFormFields({ membershipId });
  const { closeModal } = useAddSubstituteModal();

  return {
    fields,
    defaultValues,
    schema: assignSubstituteSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: assignSubstituteFormAction,
    useErrorAction: () => {
      return (formState: AssignSubstituteFormState) => {
        console.error(formState?.error);
      };
    },
    useSuccessAction: () => {
      return () => {
        closeModal();
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={12} justifyContent={"space-between"}>
          <Button
            type="button"
            onClick={() => closeModal()}
            variant="text"
            data-testid={dataTestIds.members.addSubstitute.cancelButton}
          >
            {t("Abbrechen")}
          </Button>
          <Button
            loading={isPending}
            type="submit"
            data-testid={dataTestIds.members.addSubstitute.confirmButton}
          >
            {t("Vertretung ernennen")}
          </Button>
        </HStack>
      );
    },
  };
}
