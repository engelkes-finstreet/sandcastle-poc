import { AcceptInvitationType } from "@/features/auth/forms/acceptInvitationForm/acceptInvitationFormSchema";
import { FormFieldsType } from "@finstreet/forms";
import { useExtracted } from "next-intl";

export function useAcceptInvitationFormFields(): FormFieldsType<AcceptInvitationType> {
  const t = useExtracted();

  return {
    password: {
      type: "password",
      label: t("Passwort"),
    },
    passwordConfirmation: {
      type: "password",
      label: t("Passwort bestätigen"),
    },
    token: {
      type: "hidden",
    },
    firstName: {
      type: "hidden",
    },
    lastName: {
      type: "hidden",
    },
  };
}
