import { useState, useTransition } from "react";
import { useStopSubstituteModal } from "@/features/substitutes/fsp/modals/StopSubstituteModal/store";
import { HStack } from "@styled-system/jsx";
import { Banner } from "@finstreet/ui/components/base/Banner";
import { Button } from "@finstreet/ui/components/base/Button";
import { useExtracted } from "next-intl";
import { useRouter } from "next/navigation";
import { stopSubstituteAction } from "@/shared/backend/models/substitutes/fsp/actions";
import { dataTestIds } from "e2e/data/dataTestIds";

export const StopSubstituteSimpleForm = () => {
  const { membershipId, closeModal } = useStopSubstituteModal();
  const t = useExtracted();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await stopSubstituteAction({ membershipId });

      if (result.success) {
        closeModal();
        router.refresh();
      } else {
        setError(true);
      }
    });
  };

  return (
    <>
      {error ? (
        <Banner type="error">
          {t("Beim Beenden der Vertretung ist ein Fehler aufgetreten.")}
        </Banner>
      ) : null}
      <HStack mt={12} justifyContent={"space-between"}>
        <Button
          variant="text"
          onClick={() => closeModal()}
          data-testid={dataTestIds.members.stopSubstitute.cancelButton}
        >
          {t("Abbrechen")}
        </Button>
        <Button
          loading={isPending}
          onClick={handleSubmit}
          variant="destructive"
          data-testid={dataTestIds.members.stopSubstitute.confirmButton}
        >
          {t("Vertretung beenden")}
        </Button>
      </HStack>
    </>
  );
};
