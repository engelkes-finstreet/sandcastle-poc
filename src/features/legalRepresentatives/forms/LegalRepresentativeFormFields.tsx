import { FieldNamesType, FormFieldsType } from "@finstreet/forms";
import { DynamicFormField } from "@/shared/components/form/DynamicFormField";
import {
  CreateLegalRepresentativeType,
  UpdateLegalRepresentativeType,
} from "./legalRepresentativeSchema";
import {
  Fieldset,
  FieldsetLegend,
} from "@finstreet/ui/components/base/Form/Fieldset";
import { useExtracted } from "next-intl";
import { Fields } from "@finstreet/ui/components/pageLayout/Fields";

type LegalRepresentativeFormFieldsProps = {
  fieldNames: FieldNamesType<
    FormFieldsType<
      CreateLegalRepresentativeType | UpdateLegalRepresentativeType
    >
  >;
};

export const LegalRepresentativeFormFields = ({
  fieldNames,
}: LegalRepresentativeFormFieldsProps) => {
  const t = useExtracted();

  return (
    <Fieldset>
      <Fields>
        <FieldsetLegend>{t("Angaben zur Person")}</FieldsetLegend>
        <DynamicFormField fieldName={fieldNames.soleSignatureAuthorized} />
        <DynamicFormField fieldName={fieldNames.firstName} />
        <DynamicFormField fieldName={fieldNames.lastName} />
        <DynamicFormField fieldName={fieldNames.email} />
        <DynamicFormField fieldName={fieldNames.phoneNumber} />
      </Fields>
    </Fieldset>
  );
};
