import { FormFieldsType } from "@finstreet/forms";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { updateInternalRemarkFormAction } from "@/features/financingCaseOverview/fsp/forms/updateInternalRemarksForm/updateInternalRemarkFormAction";
import { HStack } from "@styled-system/jsx";
import { Button } from "@finstreet/ui/components/base/Button";
import { FaFloppyDisk } from "react-icons/fa6";

import { useExtracted } from "next-intl";
import {
  UpdateInternalRemarkFormConfig,
  UpdateInternalRemarkFormDefaultValues,
  updateInternalRemarkFormSchema,
  UpdateInternalRemarkFormState,
  UpdateInternalRemarkFormType,
} from "@/features/financingCaseOverview/fsp/forms/updateInternalRemarksForm/updateInternalRemarkFormSchema";
import { useInternalRemarkPanelStore } from "@/features/financingCaseOverview/fsp/taskGroups/internal/FspInternalRemarksTaskPanel";

export function useUpdateInternalRemarkFormConfig(
  financingCaseId: string,
  currentInternalRemark?: string | null,
): UpdateInternalRemarkFormConfig {
  const { setIsEditing } = useInternalRemarkPanelStore();
  const t = useExtracted();

  const defaultValues: UpdateInternalRemarkFormDefaultValues = {
    financingCaseId: financingCaseId,
    internalRemark: currentInternalRemark || "",
  };

  const fields: FormFieldsType<UpdateInternalRemarkFormType> = {
    financingCaseId: {
      type: "hidden",
    },
    internalRemark: {
      type: "textarea",
      label: "",
    },
  };

  return {
    fields,
    defaultValues,
    schema: updateInternalRemarkFormSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: updateInternalRemarkFormAction,
    useErrorAction: () => {
      return (formState: UpdateInternalRemarkFormState) => {
        console.log(formState?.error);
      };
    },
    useSuccessAction: () => {
      return (_formState: UpdateInternalRemarkFormState) => {
        setIsEditing(false);
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={12} justifyContent={"flex-end"}>
          <Button variant="text" onClick={() => setIsEditing(false)}>
            {t("Abbrechen")}
          </Button>
          <Button loading={isPending} type="submit" icon={<FaFloppyDisk />}>
            {t("Speichern")}
          </Button>
        </HStack>
      );
    },
  };
}
