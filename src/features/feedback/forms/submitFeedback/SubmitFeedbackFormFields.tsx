import { FieldNamesType, FormFieldsType } from "@finstreet/forms";
import { DynamicFormField } from "@/shared/components/form/DynamicFormField";
import { Fields } from "@finstreet/ui/components/pageLayout/Fields";
import { SubmitFeedbackType } from "@/features/feedback/forms/submitFeedback/submitFeedbackSchema";

type SubmitFeedbackFormFieldsProps = {
  fieldNames: FieldNamesType<FormFieldsType<SubmitFeedbackType>>;
};

export const SubmitFeedbackFormFields = ({
  fieldNames,
}: SubmitFeedbackFormFieldsProps) => {
  return (
    <Fields>
      <DynamicFormField fieldName={fieldNames.subject} />
      <DynamicFormField fieldName={fieldNames.category} />
      <DynamicFormField fieldName={fieldNames.message} />
      <DynamicFormField fieldName={fieldNames.responseRequested} />
    </Fields>
  );
};
