import { FormConfig } from "@finstreet/forms";
import { useExtracted } from "next-intl";
import { useToast } from "@finstreet/ui/components/patterns/Toasts";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { HStack } from "@styled-system/jsx";
import { Button } from "@finstreet/ui/components/base/Button";
import { FaArrowRight } from "react-icons/fa6";
import { GetCaseManagerCandidatesResponse } from "@/features/assignCaseManager/fsp/backend/schema";
import {
  AssignCaseManagerFormState,
  AssignCaseManagerOutputType,
  assignCaseManagerSchema,
  AssignCaseManagerType,
} from "@/features/assignCaseManager/fsp/forms/assignCaseManagerForm/assignCaseManagerSchema";
import { useAssignCaseManagerFields } from "@/features/assignCaseManager/fsp/forms/assignCaseManagerForm/useAssignCaseManagerFields";
import { useAssignFinancingCaseModal } from "@/features/assignCaseManager/fsp/modals/assignFinancingCaseModal/store";
import { assignCaseManagerAction } from "@/features/assignCaseManager/fsp/forms/assignCaseManagerForm/assignCaseManagerAction";

export function useAssignCaseManagerFormConfig({
  financingCaseId,
  caseManagerCandidates,
}: {
  financingCaseId: string;
  caseManagerCandidates: GetCaseManagerCandidatesResponse;
}): FormConfig<
  AssignCaseManagerFormState,
  AssignCaseManagerType,
  AssignCaseManagerOutputType
> {
  const t = useExtracted();
  const fields = useAssignCaseManagerFields(caseManagerCandidates);
  const { setIsOpen } = useAssignFinancingCaseModal();
  const toast = useToast();

  return {
    fields,
    defaultValues: {
      financingCaseId,
      caseManagerId: undefined,
    },
    schema: assignCaseManagerSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: assignCaseManagerAction,
    useErrorAction: () => {
      return (formState: AssignCaseManagerFormState) => {
        console.log(formState?.error);
      };
    },
    useSuccessAction: () => {
      return () => {
        toast.success({ title: t("Sachbearbeiter erfolgreich zugewiesen") });
        setIsOpen(false);
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={12} justifyContent={"space-between"}>
          <Button type="button" onClick={() => setIsOpen(false)} variant="text">
            {t("Abbrechen")}
          </Button>
          <Button loading={isPending} type="submit" icon={<FaArrowRight />}>
            {t("Zuweisen")}
          </Button>
        </HStack>
      );
    },
  };
}
