import { CustomerLayoutHeader } from "@/layouts/customer/CustomerLayoutHeader";
import { LayoutFooter } from "@/layouts/LayoutFooter";
import { PortalProvider } from "@/shared/context/portal/portalContext";
import { Wrapper } from "@finstreet/ui/components/pageLayout/Wrapper";
import { Main } from "@finstreet/ui/components/pageLayout/Main";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CustomerLayoutHeader />
      <PortalProvider initialPortal="customer">
        <Main>
          <Wrapper>{children}</Wrapper>
        </Main>
        <LayoutFooter />
      </PortalProvider>
    </>
  );
}
