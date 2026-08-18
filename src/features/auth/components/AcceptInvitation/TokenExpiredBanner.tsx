"use client";

import { Banner } from "@finstreet/ui/components/base/Banner";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { useExtracted } from "next-intl";

export const TokenExpiredBanner = () => {
  const t = useExtracted();

  return (
    <Banner type="warning">
      <Typography fontSize={"xl"}>
        {t("Einladungslink abgelaufen oder ungültig")}
      </Typography>
      <Typography>
        {t(
          "Ihr Einladungslink ist abgelaufen oder ungültig, bitte nutzen Sie die Passwort zurücksetzen Funktion, um einen neuen anzufordern. Dieser ist für 24 Stunden gültig. Falls Sie Hilfe benötigen, kontaktieren Sie uns bitte unter den unten angegebenen Kontaktdaten.",
        )}
      </Typography>
    </Banner>
  );
};
