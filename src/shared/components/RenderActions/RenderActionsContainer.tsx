import { Panel } from "@finstreet/ui/components/base/Panel";
import { Typography } from "@finstreet/ui/components/base/Typography";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleToggle,
} from "@finstreet/ui/components/patterns/Collapsible";
import { Box } from "@styled-system/jsx";
import { ReactNode } from "react";

type RenderActionsContainerProps = {
  children: ReactNode;
  translations: { actionLabel: string };
};

const RenderDesktopActions = ({ children }: { children: ReactNode }) => (
  <Box css={{ hideBelow: "lg" }} py={4}>
    {children}
  </Box>
);

const RenderMobileActions = ({
  children,
  translations,
}: RenderActionsContainerProps) => (
  <Box css={{ hideFrom: "lg" }}>
    <Panel p={0}>
      <Collapsible>
        <CollapsibleToggle>
          <Box p={4}>
            <Typography color={"text.primary"} as={"p"}>
              {translations.actionLabel}
            </Typography>
          </Box>
        </CollapsibleToggle>
        <CollapsibleContent>
          <Box p={4} py={4}>
            {children}
          </Box>
        </CollapsibleContent>
      </Collapsible>
    </Panel>
  </Box>
);

export const RenderActionsContainer = ({
  children,
  translations,
}: RenderActionsContainerProps) => (
  <>
    <RenderMobileActions translations={translations}>
      {children}
    </RenderMobileActions>
    <RenderDesktopActions>{children}</RenderDesktopActions>
  </>
);
