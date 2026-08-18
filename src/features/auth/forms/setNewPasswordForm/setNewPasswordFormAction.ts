import {
  SetNewPasswordFormState,
  SetNewPasswordType,
} from "@/features/auth/forms/setNewPasswordForm/setNewPasswordFormSchema";

export async function setNewPasswordFormAction(
  _state: SetNewPasswordFormState,
  _newPassword: SetNewPasswordType,
): Promise<SetNewPasswordFormState> {
  return {
    error: null,
    message: "New password set successfully",
  };
}
