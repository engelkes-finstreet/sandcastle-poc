"use client";

import { useArchiveFinancingCaseFormConfig } from "./archiveFinancingCaseFormConfig";
import { DynamicFormField } from "@/shared/components/form/DynamicFormField";
import { Form } from "@/shared/components/form/Form";
import { useGetArchiveOptionsQuery } from "@/features/archiveFinancingCase/fsp/backend/queries/useGetArchiveOptionsQuery";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { Center } from "@styled-system/jsx";
import { useExtracted } from "next-intl";

interface ArchiveFinancingCaseFormProps {
  financingCaseId: string;
}

export const ArchiveFinancingCaseForm = ({
  financingCaseId,
}: ArchiveFinancingCaseFormProps) => {
  const t = useExtracted();
  const { data: archivalOptions } = useGetArchiveOptionsQuery();

  const config = useArchiveFinancingCaseFormConfig(
    financingCaseId,
    archivalOptions,
  );
  const { fieldNames } = config;

  if (archivalOptions.length === 0) {
    return (
      <Center>
        <Typography>{t("Keine Archivierungsgründe gefunden")}</Typography>
      </Center>
    );
  }

  return (
    <Form formConfig={config}>
      <DynamicFormField fieldName={fieldNames.archiveReason} />
    </Form>
  );
};
