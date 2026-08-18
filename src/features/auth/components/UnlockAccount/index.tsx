import { routes } from "@/routes";
import { unlockAccount } from "@/shared/backend/models/auth/server";
import { VStack } from "@styled-system/jsx";
import { Banner } from "@finstreet/ui/components/base/Banner";
import { getExtracted } from "next-intl/server";
import { redirect } from "next/navigation";
import RequestAccountUnlockLink from "./requestAccountUnlockLink";

type UnlockAccountProps = {
  unlockToken: string | undefined;
};

export default async function UnlockAccount(props: UnlockAccountProps) {
  const { unlockToken } = props;
  const t = await getExtracted();

  if (unlockToken) {
    const result = await unlockAccount({
      payload: {
        unlockToken,
      },
    });

    if (result.success) {
      redirect(routes.auth.login());
    } else {
      console.error(result.error);
      return (
        <VStack>
          <Banner type="error">
            {t(
              "Fehler beim Freischalten des Kontos. Bitte versuchen Sie es erneut",
            )}
          </Banner>
          <RequestAccountUnlockLink />
        </VStack>
      );
    }
  }

  redirect(routes.auth.login());
}
