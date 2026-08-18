import { FormConfig } from "@finstreet/forms";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { DeepPartial } from "react-hook-form";
import { useRouter } from "next/navigation";
import { loginFormAction } from "src/features/auth/forms/loginForm/loginFormAction";
import { dataTestIds } from "e2e/data/dataTestIds";
import { useExtracted } from "next-intl";
import { HStack } from "@styled-system/jsx";
import { Button } from "@finstreet/ui/components/base/Button";
import {
  LoginFormState,
  loginSchema,
  LoginType,
} from "@/features/auth/forms/loginForm/loginFormSchema";
import { useLoginFormFields } from "@/features/auth/forms/loginForm/useLoginFormFields";
import { Link } from "@finstreet/ui/components/base/Link";
import { routes } from "@/routes";

export function useLoginFormConfig(): FormConfig<LoginFormState, LoginType> {
  const t = useExtracted();

  const defaultValues: DeepPartial<LoginType> = {
    email: "",
    password: "",
  };

  const fields = useLoginFormFields();

  return {
    fields,
    defaultValues,
    schema: loginSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: loginFormAction,
    useErrorAction: () => {
      return (formState: LoginFormState) => {
        console.log(formState?.error);
      };
    },
    useSuccessAction: () => {
      const router = useRouter();

      return (_formState: LoginFormState) => {
        router.push("/test");
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={8} justifyContent={"space-between"}>
          <Link
            name={"Password vergessen?"}
            href={routes.auth.requestPasswordReset()}
            data-testid={dataTestIds.login.requestPasswordResetLink}
          >
            {t("Password vergessen?")}
          </Link>
          <Button
            loading={isPending}
            type="submit"
            data-testid={dataTestIds.buttons.submitButton}
          >
            {t("Jetzt anmelden")}
          </Button>
        </HStack>
      );
    },
  };
}
