"use client";
import { useConfirmMarketingAgreementFormConfig } from "./confirmMarketingAgreementFormConfig";
import { Form } from "@finstreet/forms";

type ConfirmMarketingAgreementFormProps = {
  token: string;
};

export const ConfirmMarketingAgreementForm = ({
  token,
}: ConfirmMarketingAgreementFormProps) => {
  const config = useConfirmMarketingAgreementFormConfig(token);

  return (
    <Form formConfig={config}>
      <></>
    </Form>
  );
};
