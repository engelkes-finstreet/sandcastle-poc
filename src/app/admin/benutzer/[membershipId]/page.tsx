import { Metadata } from "next";
import { Constants } from "@/shared/utils/constants";
import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderTitle,
} from "@finstreet/ui/components/pageLayout/PageHeader";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { PageContent } from "@finstreet/ui/components/pageLayout/PageContent";
import { getExtracted } from "next-intl/server";
import { fetchWithErrorHandling } from "@/shared/backend/fetchWithErrorHandling";
import { SubstitutesService } from "@/shared/backend/models/substitutes/fsp/server";
import { AddSubstituteModal } from "@/features/substitutes/fsp/modals/AddSubstituteModal/modal";
import { StopSubstituteModal } from "@/features/substitutes/fsp/modals/StopSubstituteModal/modal";
import { SubstitutesContent } from "@/features/substitutes/fsp/components/SubstitutesContent";
import { routes } from "@/routes";

export const metadata: Metadata = {
  title: `Vertretungen verwalten | ${Constants.companyName}`,
};

type AdminMemberSubstitutesPageProps = {
  params: Promise<{
    membershipId: string;
  }>;
};

export default async function AdminMemberSubstitutesPage({
  params,
}: AdminMemberSubstitutesPageProps) {
  const { membershipId } = await params;
  const t = await getExtracted();
  const memberSubstitutions = await fetchWithErrorHandling(() =>
    SubstitutesService.getMembershipSubstitutions({
      pathVariables: { membershipId },
    }),
  );

  const memberName = `${memberSubstitutions.membership?.firstName} ${memberSubstitutions.membership?.lastName}`;
  const substituteName = `${memberSubstitutions.substitute?.firstName} ${memberSubstitutions.substitute?.lastName}`;

  return (
    <>
      <PageHeader>
        <PageHeaderBackButton href={routes.admin.members.index}>
          {t("Zurück")}
        </PageHeaderBackButton>
        <PageHeaderTitle>
          <Headline as={"h1"}>
            {t("Vertretungen von {name} verwalten", { name: memberName })}
          </Headline>
        </PageHeaderTitle>
      </PageHeader>
      <PageContent>
        <SubstitutesContent
          substitutions={memberSubstitutions}
          membershipId={membershipId}
          openButton={{
            label: t("Eine Vertretung für {name} ernennen", {
              name: memberName,
            }),
            tooltip: t(
              "Während {name} vertreten wird, können Sie keine Vertretung für ihn ernennen.",
              { name: memberName },
            ),
          }}
          listTitle={t("Von {name} vertretene Personen", {
            name: memberName,
          })}
          description={t.rich(
            "Im Falle einer Abwesenheit können Sie hier eine Vertretung ernennen. Die ernannte Person wird über die Vertretung informiert und erhält für die Dauer der Vertretung die gleichen Email-Benachrichtigungen über die Vorgänge von {name}.<br></br>{name} erhält die Benachrichtigungen weiterhin, sodass {name} bei seiner / ihrer Rückkehr möglichst schnell auf dem aktuellen Stand ist.",
            {
              br: () => <br />,
              name: memberName,
            },
          )}
          currentlySubstitutedBy={t(
            "{absentee} wird zur Zeit vertreten durch {substitute}.",
            {
              absentee: memberName,
              substitute: substituteName,
            },
          )}
        />
      </PageContent>
      <AddSubstituteModal />
      <StopSubstituteModal />
    </>
  );
}
