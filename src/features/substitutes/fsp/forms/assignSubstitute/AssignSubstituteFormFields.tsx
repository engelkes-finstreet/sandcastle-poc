import { FieldNamesType, FormFieldsType } from "@finstreet/forms";
import { Fields } from "@finstreet/ui/components/pageLayout/Fields";

import { DynamicFormField } from "@/shared/components/form/DynamicFormField";

import { AssignSubstituteType } from "./assignSubstituteSchema";

type AssignSubstituteFormFieldsProps = {
  fieldNames: FieldNamesType<FormFieldsType<AssignSubstituteType>>;
};

export const AssignSubstituteFormFields = ({
  fieldNames,
}: AssignSubstituteFormFieldsProps) => {
  return (
    <Fields>
      <DynamicFormField fieldName={fieldNames.substitudeId} />
    </Fields>
  );
};
