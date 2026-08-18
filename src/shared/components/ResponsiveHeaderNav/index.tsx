"use client";

import { dataTestIds } from "e2e/data/dataTestIds";
import { Box, Divider, HStack, styled } from "@styled-system/jsx";
import {
  HeaderNav,
  HeaderUserNav,
} from "@finstreet/ui/components/pageLayout/Header";
import {
  Sidebar,
  SidebarProvider,
  useSidebar,
} from "@finstreet/ui/components/pageLayout/Sidebar";
import { Button } from "@finstreet/ui/components/base/Button";
import { FaBars } from "react-icons/fa6";
import { IconButton } from "@finstreet/ui/components/base/IconButton";
import { FaTimes } from "react-icons/fa";
import { useResponsiveHeaderNav } from "./useResponsiveHeaderNav";
import { Typography } from "@finstreet/ui/components/base/Typography";

type ResponsiveHeaderNavProps = {
  logoLink: string;
  headerNavLinks: React.ReactNode;
  userNavLinks: React.ReactNode;
  offset?: number;
};

export const ResponsiveHeaderNav = ({
  //logoLink,
  headerNavLinks,
  userNavLinks,
  offset = 40,
}: ResponsiveHeaderNavProps) => {
  const { logoRef, navRef, containerRef, isOverflown } = useResponsiveHeaderNav(
    { offset },
  );

  return (
    <HStack justifyContent={"space-between"} width={"100%"} ref={containerRef}>
      <Box ref={logoRef}>
        {/* <a href={logoLink}>
          <Logo
            width={200}
            height={85}
            fspName="SozialFactoring"
            src={LogoSvg}
          />
        </a> */}
        <Typography as={"p"} color="text.dark" fontSize={"xl"}>
          Replace with logo
        </Typography>
      </Box>
      <Box flexGrow={1} />
      {isOverflown ? (
        <MobileNav
          headerNavLinks={headerNavLinks}
          userNavLinks={userNavLinks}
        />
      ) : (
        <DesktopNav
          headerNavLinks={headerNavLinks}
          userNavLinks={userNavLinks}
          ref={navRef}
        />
      )}
    </HStack>
  );
};

type DesktopNavProps = {
  headerNavLinks: React.ReactNode;
  userNavLinks: React.ReactNode;
  ref: React.RefObject<HTMLDivElement | null>;
};

const DesktopNav = ({ headerNavLinks, userNavLinks, ref }: DesktopNavProps) => {
  return (
    <HStack gap={8} ref={ref}>
      <HeaderNav>{headerNavLinks}</HeaderNav>
      <HeaderUserNav data-testid={dataTestIds.header.userMenu.root}>
        {userNavLinks}
      </HeaderUserNav>
    </HStack>
  );
};

type MobileNavProps = {
  headerNavLinks: React.ReactNode;
  userNavLinks: React.ReactNode;
};

const MobileNav = ({ headerNavLinks, userNavLinks }: MobileNavProps) => {
  return (
    <SidebarProvider>
      <OpenSidebarButton />
      <Sidebar position={"right"}>
        <styled.ul
          gap={7}
          alignItems={"stretch"}
          width={"80vw"}
          height={"100%"}
          p={6}
        >
          {headerNavLinks}
        </styled.ul>
        <Box flexGrow={1} />
        <Divider color={"neutral.light"} />
        <styled.ul
          gap={7}
          alignItems={"stretch"}
          width={"80vw"}
          height={"100%"}
          p={6}
        >
          {userNavLinks}
        </styled.ul>
        <Divider color={"neutral.light"} />
        <CloseSidebarButton />
      </Sidebar>
    </SidebarProvider>
  );
};

const OpenSidebarButton = () => {
  const { openSidebar } = useSidebar();
  return <IconButton Icon={FaBars} onClick={openSidebar} variant="onlyIcon" />;
};

const CloseSidebarButton = () => {
  const { closeSidebar } = useSidebar();
  return (
    <Button onClick={closeSidebar} variant="text">
      <FaTimes /> Navigation schließen
    </Button>
  );
};
