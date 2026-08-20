import { SubmitFeedbackFormType } from "@/features/feedback/admin/forms/submitFeedback/submitFeedbackSchema";
import { DynamicFormField } from "@/shared/components/form/DynamicFormField";
import { FieldNamesType, FormFieldsType } from "@finstreet/forms";
import { VStack } from "@styled-system/jsx";

type SubmitFeedbackFormFieldsProps = {
  fieldNames: FieldNamesType<FormFieldsType<SubmitFeedbackFormType>>;
};

export const SubmitFeedbackFormFields = ({
  fieldNames,
}: SubmitFeedbackFormFieldsProps) => {
  return (
    <VStack gap={8} alignItems={"stretch"}>
      <DynamicFormField fieldName={fieldNames.subject} />
      <DynamicFormField fieldName={fieldNames.category} />
      <DynamicFormField fieldName={fieldNames.message} />
      <DynamicFormField fieldName={fieldNames.responseRequested} />
    </VStack>
  );
};
