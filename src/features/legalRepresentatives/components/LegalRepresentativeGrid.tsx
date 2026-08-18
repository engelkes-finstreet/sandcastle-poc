import { CardsGridLayout } from "@finstreet/ui/components/pageLayout/Layout/CardsGridLayout";
import { EmptyLegalRepresentative } from "@/features/legalRepresentatives/components/EmptyLegalRepresentative";
import { LegalRepresentativePanel } from "@/features/legalRepresentatives/components/LegalRepresentativePanel";
import { ConfirmLegalRepresentativesButton } from "@/features/legalRepresentatives/components/ConfirmLegalRepresentativesButton";
import { Flex, VStack } from "@styled-system/jsx";
import { GetLegalRepresentativesResponseType } from "@/shared/backend/models/legalRepresentatives/schema";
import { DeleteLegalRepresentativeModal } from "@/features/legalRepresentatives/modals/DeleteLegalRepresentativeModal/modal";
import { UpdateLegalRepresentativeModal } from "@/features/legalRepresentatives/modals/UpdateLegalRepresentativeModal/modal";
import { CreateLegalRepresentativeModal } from "@/features/legalRepresentatives/modals/CreateLegalRepresentativeModal/modal";

type LegalRepresentativeGridProps = {
  legalRepresentativesResult: GetLegalRepresentativesResponseType;
  financingCaseId: string;
};

export async function LegalRepresentativeGrid({
  legalRepresentativesResult,
  financingCaseId,
}: LegalRepresentativeGridProps) {
  const { legalRepresentatives, flags } = legalRepresentativesResult;

  return (
    <>
      <VStack alignItems={"stretch"} gap={4}>
        <CardsGridLayout columns={{ base: 1, md: 2 }}>
          {legalRepresentatives.map((legalRepresentative) => {
            return (
              <LegalRepresentativePanel
                financingCaseId={financingCaseId}
                legalRepresentative={legalRepresentative}
                key={legalRepresentative.id}
                isEditable={flags.editable}
              />
            );
          })}
          {flags.addable && flags.editable ? (
            <EmptyLegalRepresentative financingCaseId={financingCaseId} />
          ) : null}
        </CardsGridLayout>
        <Flex justifyContent={"flex-end"} mt={12}>
          <ConfirmLegalRepresentativesButton
            financingCaseId={financingCaseId}
            legalRepresentativesConfirmable={flags.confirmable}
          />
        </Flex>
      </VStack>
      <CreateLegalRepresentativeModal />
      <DeleteLegalRepresentativeModal />
      <UpdateLegalRepresentativeModal />
    </>
  );
}
