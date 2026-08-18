"use client";

import { routes } from "@/routes";
import { Link } from "@finstreet/ui/components/base/Link";
import { useExtracted } from "next-intl";

export default function RequestAccountUnlockLink() {
  const t = useExtracted();

  return (
    <Link href={routes.requestAccountUnlock} name={"requestAccountUnlock"}>
      {t("Freischaltung anfordern")}
    </Link>
  );
}
