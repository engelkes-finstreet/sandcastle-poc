"use client";

import { Box, HStack } from "@styled-system/jsx";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { Substitutions } from "@/shared/backend/models/substitutes/fsp/schema";
import { OpenAddSubstituteModalButton } from "@/features/substitutes/fsp/modals/AddSubstituteModal/OpenAddSubstituteModalButton";
import { OpenStopSubstituteModalButton } from "@/features/substitutes/fsp/modals/StopSubstituteModal/OpenStopSubstituteModalButton";
import { MySubstitutesPresentationList } from "@/features/substitutes/fsp/interactiveLists/mySubstitutes/MySubstitutesPresentationList";
import React from "react";

type SubstitutesContentProps = {
  substitutions: Substitutions;
  membershipId?: string;
  listTitle: string;
  description: React.ReactNode;
  openButton: {
    label: string;
    tooltip: string;
  };
  currentlySubstitutedBy: string;
};

export const SubstitutesContent = ({
  substitutions,
  membershipId,
  listTitle,
  description,
  currentlySubstitutedBy,
  openButton,
}: SubstitutesContentProps) => {
  return (
    <>
      <Box mb={6}>
        <Typography>{description}</Typography>
      </Box>
      {substitutions.hasSubstitute && substitutions.substitute ? (
        <HStack gap={4} alignItems="center">
          <Typography>{currentlySubstitutedBy}</Typography>
          <OpenStopSubstituteModalButton membershipId={membershipId} />
        </HStack>
      ) : (
        <Box width="fit-content">
          <OpenAddSubstituteModalButton
            isSubstituting={substitutions.isSubstituting}
            membershipId={membershipId}
            buttonLabel={openButton.label}
            tooltip={openButton.tooltip}
          />
        </Box>
      )}
      <MySubstitutesPresentationList
        data={[
          {
            title: listTitle,
            items: substitutions.representing,
          },
        ]}
      />
    </>
  );
};
