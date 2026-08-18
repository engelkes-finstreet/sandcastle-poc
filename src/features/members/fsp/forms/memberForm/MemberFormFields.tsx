import { InviteMemberFormType } from "@/features/members/fsp/forms/memberForm/inviteMemberFormSchema";
import { DynamicFormField } from "@/shared/components/form/DynamicFormField";
import { FieldNamesType, FormFieldsType } from "@finstreet/forms";
import { Banner } from "@finstreet/ui/components/base/Banner";

import {
  Fieldset,
  FieldsetLegend,
} from "@finstreet/ui/components/base/Form/Fieldset";
import { VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";

type InviteMemberFormFieldsProps = {
  fieldNames: FieldNamesType<FormFieldsType<InviteMemberFormType>>;
  isUpdateMode?: boolean;
};

export const MemberFormFields = ({
  fieldNames,
  isUpdateMode = false,
}: InviteMemberFormFieldsProps) => {
  const t = useExtracted();

  return (
    <VStack gap={16} alignItems={"stretch"}>
      <Fieldset disabled={isUpdateMode}>
        <VStack gap={8} alignItems={"stretch"}>
          <FieldsetLegend>{t("Angaben zur Person")}</FieldsetLegend>
          <DynamicFormField fieldName={fieldNames.firstName} />
          <DynamicFormField fieldName={fieldNames.lastName} />
          <DynamicFormField fieldName={fieldNames.email} />
          <DynamicFormField fieldName={fieldNames.department} />
          {!isUpdateMode && (
            <Banner type={"warning"}>
              {t(
                "An diese E-Mail-Adresse wird ein Link zur Passwortvergabe und Freischaltung gesendet.",
              )}
            </Banner>
          )}
        </VStack>
      </Fieldset>

      <Fieldset>
        <VStack gap={8} alignItems={"stretch"}>
          <FieldsetLegend>{t("Berechtigungen")}</FieldsetLegend>
          <Fieldset disabled={isUpdateMode}>
            <DynamicFormField fieldName={fieldNames.signingGroup} />
          </Fieldset>
          <DynamicFormField fieldName={fieldNames.conditionsManagement} />
        </VStack>
      </Fieldset>
    </VStack>
  );
};
