import AcceptInvitationPageContent from "@/features/auth/components/AcceptInvitation/acceptInvitationPageContent";
import { previewInvitation } from "@/shared/backend/models/auth/server";
import { Metadata } from "next";
import { Constants } from "@/shared/utils/constants";
import { notFound, redirect } from "next/navigation";
import { routes } from "@/routes";
import { TokenExpiredBanner } from "@/features/auth/components/AcceptInvitation/TokenExpiredBanner";
export const metadata: Metadata = {
  title: `Einladung annehmen | ${Constants.companyName}`,
};

type AcceptInvitationPageProps = {
  searchParams: Promise<{
    invitationToken: string;
  }>;
};

export default async function AcceptInvitationPage(
  props: AcceptInvitationPageProps,
) {
  const { invitationToken } = await props.searchParams;
  const invitationPreview = await previewInvitation({
    pathVariables: {
      token: invitationToken,
    },
  });

  if (!invitationPreview.success) {
    const status = invitationPreview.error.status;

    switch (status) {
      case 401:
        return <TokenExpiredBanner />;
      case 403:
        return redirect(routes.forbidden);
      case 404:
        return notFound();
      case 500:
        throw new Error();
    }
  } else {
    return (
      <AcceptInvitationPageContent
        invitationPreview={invitationPreview.data}
        invitationToken={invitationToken}
      />
    );
  }
}
