import { CredentialsSignin } from "next-auth";

type StatusResponse = {
  success: boolean;
  error: {
    type: string;
    status: number;
    message: string | undefined;
  };
};

export class AuthenticationError extends CredentialsSignin {
  constructor(public statusResponse: StatusResponse) {
    super(statusResponse.error.message);
  }
}
