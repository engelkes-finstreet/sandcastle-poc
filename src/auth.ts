import NextAuth, { NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { AuthenticationError } from "@/shared/utils/AuthenticationError";
import { secureFetchConfig } from "@/shared/backend/secureFetchConfig";

const nextAuth = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: {},
        password: {},
      },
      /**
       * Will be called once signin is called.
       * If the user is autorized return a user object, else return null
       * @param credentials
       */
      async authorize(credentials) {
        const { email, password } = credentials;
        const url = `${process.env.NEXT_PUBLIC_API_FE_BASE_URL}${secureFetchConfig.feApiPath}/sessions`;
        const response = await fetch(url, {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        const body = await response.json();

        if (body.errors?.length) {
          const title = body?.errors[0]?.title;
          const detail = body?.errors[0]?.detail;
          const errorMessage =
            (title ?? "") + (detail ? `\n ${detail}` : "") || undefined;
          throw new AuthenticationError({
            success: false,
            error: {
              type: "backend",
              status: response.status,
              message: errorMessage,
            },
          });
        }

        const result = body?.data;
        if (result && "token" in result) {
          const permissions = await getPermissions(result.token);
          const memberRoles = permissions.data.roles;

          const userWithoutPassword: any = {};

          return {
            ...userWithoutPassword,
            token: result.token,
            memberRoles,
            expiresAt: Date.parse(result.expires_at) / 1000,
          };
        }
      },
    }),
  ],
  events: {
    async signOut(params: any) {
      if (
        params?.token?.accessToken &&
        typeof params?.token?.accessToken === "string"
      ) {
        const url = `${process.env.NEXT_PUBLIC_API_FE_BASE_URL}${secureFetchConfig.feApiPath}/sessions/${params.token.accessToken}`;
        await fetch(url, {
          method: "DELETE",
          headers: {
            "x-session-token": params.token.accessToken,
          },
        });
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      // when logging in, a user is provided
      if (user) {
        token.accessToken = user.token;
        token.permissions = user.permissions;
        token.memberRoles = user.memberRoles;
        token.exp = user.expiresAt;
        token.expires = user.expiresAt;
        return token;
      }

      // reset token expiration to backend session expiration
      if (token) {
        token.exp = token.expires;
      }

      // if token is expired, return null to end session
      if (token.exp && new Date().getTime() / 1000 > token.exp) {
        return null;
      }

      return token;
    },

    // only add public data to the session
    session({ session, token }) {
      if (session.user) {
        session.user.permissions = token.permissions;
        session.user.memberRoles = token.memberRoles;
      }
      return session;
    },
  },
  debug: false,
});

async function getPermissions(token: string) {
  const url = `${process.env.NEXT_PUBLIC_API_FE_BASE_URL}${secureFetchConfig.feApiPath}/permissions`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-session-token": token,
    },
  });

  if (res.ok) {
    return res.json();
  }

  throw new Error("Failed to fetch permissions");
}

const handlers: NextAuthResult["handlers"] = nextAuth.handlers;
const signIn: NextAuthResult["signIn"] = nextAuth.signIn;
const signOut: NextAuthResult["signOut"] = nextAuth.signOut;
const auth: NextAuthResult["auth"] = nextAuth.auth;

export { handlers, signIn, signOut, auth };
