import { PortalProvider } from "@/shared/context/portal/portalContext";
import { LayoutFooter } from "@/layouts/LayoutFooter";
import { Main } from "@finstreet/ui/components/pageLayout/Main";
import { Wrapper } from "@finstreet/ui/components/pageLayout/Wrapper";
import { FspLayoutHeader } from "@/layouts/fsp/FspLayoutHeader";

export default async function FspLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <FspLayoutHeader />
      <PortalProvider initialPortal={"operations"}>
        <Main>
          <Wrapper>{children}</Wrapper>
        </Main>
        <LayoutFooter />
      </PortalProvider>
    </>
  );
}
