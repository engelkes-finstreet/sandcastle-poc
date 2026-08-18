import { Box, styled } from "@styled-system/jsx";
import { AuthLayoutHeader } from "@/layouts/auth/AuthLayoutHeader";
import { LayoutFooter } from "@/layouts/LayoutFooter";
import { Main } from "@finstreet/ui/components/pageLayout/Main";
import { Wrapper } from "@finstreet/ui/components/pageLayout/Wrapper";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthLayoutHeader />
      <Main>
        <Wrapper>
          <Box mt={8}>{children}</Box>

          {/* making sure that error color and padding bottom classes get generated which are needed for error messages in forms. */}
          <styled.span color={"error"} display={"none"} paddingBottom={8} />
        </Wrapper>
      </Main>
      <LayoutFooter />
    </>
  );
}
