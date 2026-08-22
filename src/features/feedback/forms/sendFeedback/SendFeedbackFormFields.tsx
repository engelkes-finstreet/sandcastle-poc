import { SendFeedbackType } from "@/features/feedback/forms/sendFeedback/sendFeedbackSchema";
import { DynamicFormField } from "@/shared/components/form/DynamicFormField";
import { FieldNamesType, FormFieldsType } from "@finstreet/forms";
import { Fields } from "@finstreet/ui/components/pageLayout/Fields";

type SendFeedbackFormFieldsProps = {
  fieldNames: FieldNamesType<FormFieldsType<SendFeedbackType>>;
};

export const SendFeedbackFormFields = ({
  fieldNames,
}: SendFeedbackFormFieldsProps) => {
  return (
    <Fields>
      <DynamicFormField fieldName={fieldNames.subject} />
      <DynamicFormField fieldName={fieldNames.category} />
      <DynamicFormField fieldName={fieldNames.message} />
      <DynamicFormField fieldName={fieldNames.responseRequested} />
    </Fields>
  );
};
