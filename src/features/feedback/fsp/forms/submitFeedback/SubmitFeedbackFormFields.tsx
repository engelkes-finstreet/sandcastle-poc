import { FieldNamesType, FormFieldsType } from "@finstreet/forms";
import { Fields } from "@finstreet/ui/components/pageLayout/Fields";
import { KeyboardEvent } from "react";

import { Box } from "@styled-system/jsx";

import { DynamicFormField } from "@/shared/components/form/DynamicFormField";

import { SubmitFeedbackType } from "./submitFeedbackSchema";

type SubmitFeedbackFormFieldsProps = {
  fieldNames: FieldNamesType<FormFieldsType<SubmitFeedbackType>>;
};

/**
 * Enter inside a single-line input would otherwise implicitly submit the form and
 * skip the confirmation modal, which is the only intended way to submit here.
 */
const preventImplicitSubmit = (event: KeyboardEvent<HTMLDivElement>) => {
  if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
    event.preventDefault();
  }
};

export const SubmitFeedbackFormFields = ({
  fieldNames,
}: SubmitFeedbackFormFieldsProps) => {
  return (
    <Box onKeyDown={preventImplicitSubmit}>
      <Fields>
        <DynamicFormField fieldName={fieldNames.subject} />
        <DynamicFormField fieldName={fieldNames.category} />
        <DynamicFormField fieldName={fieldNames.message} />
        <DynamicFormField fieldName={fieldNames.responseRequested} />
      </Fields>
    </Box>
  );
};
