import { AdminLayoutHeader } from "@/layouts/admin/AdminLayoutHeader";
import { LayoutFooter } from "@/layouts/LayoutFooter";
import { Main } from "@finstreet/ui/components/pageLayout/Main";
import { Wrapper } from "@finstreet/ui/components/pageLayout/Wrapper";

export default async function AdminFeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminLayoutHeader />
      <Main>
        <Wrapper>{children}</Wrapper>
      </Main>
      <LayoutFooter />
    </>
  );
}
