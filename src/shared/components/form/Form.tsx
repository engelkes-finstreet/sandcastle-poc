import { useTranslatedError } from "@/i18n/useTranslatedError";
import { Form as FormFactory, FormConfig } from "@finstreet/forms";

type FormProps = {
  formConfig: FormConfig<any, any, any, any>;
  children: React.ReactNode;
};

export const Form = ({ formConfig, children }: FormProps) => {
  const error = useTranslatedError();

  return (
    <FormFactory
      formConfig={formConfig}
      schemaOptions={{
        error,
        reportInput: true,
      }}
    >
      {children}
    </FormFactory>
  );
};
