import { ResetPasswordForm } from "@/features/auth/forms/resetPasswordForm/ResetPasswordForm";
import { Panel } from "@finstreet/ui/components/base/Panel";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { Metadata } from "next";
import { Constants } from "@/shared/utils/constants";
import { VStack } from "@styled-system/jsx";
import { getExtracted } from "next-intl/server";

export const metadata: Metadata = {
  title: `Passwort zurücksetzen | ${Constants.companyName}`,
};

type ResetPasswordPageProps = {
  searchParams: Promise<{
    passwordResetToken: string;
  }>;
};

export default async function ResetPasswordPage(props: ResetPasswordPageProps) {
  const { passwordResetToken } = await props.searchParams;
  const t = await getExtracted();

  return (
    <Panel p={8}>
      <VStack gap={4} alignItems={"stretch"}>
        <Headline as={"h1"}>{t("Passwort zurücksetzen")}</Headline>
        <Typography as={"p"}>
          {t(
            "Bitte geben Sie Ihr neues Passwort ein und bestätigen Sie dieses",
          )}
        </Typography>
        <ResetPasswordForm passwordResetToken={passwordResetToken} />
      </VStack>
    </Panel>
  );
}
