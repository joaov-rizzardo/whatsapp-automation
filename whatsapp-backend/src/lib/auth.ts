import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";

import { env } from "../config/env.js";
import type { PrismaClient } from "../generated/prisma/client.js";

const googleProvider =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {};

export function createAuth(prisma: PrismaClient) {
  return betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    basePath: "/api/auth",
    trustedOrigins: [env.CLIENT_ORIGIN],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      requireEmailVerification: false,
    },
    socialProviders: googleProvider,
    account: {
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    advanced: {
      // Dev: front (:3000) and back (:3333) are both "localhost", and cookies
      // ignore the port, so the session cookie crosses between them as-is.
      //
      // Production will NOT work this way. Different subdomains
      // (zapbot.com / api.zapbot.com) need:
      //   crossSubDomainCookies: { enabled: true, domain: ".zapbot.com" }
      // Entirely different domains need sameSite: "none" + secure: true, and
      // then depend on the browser's third-party cookie policy.
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
      },
    },
    plugins: [organization()],
    databaseHooks: {
      session: {
        create: {
          // Runs on every session creation — password sign-in, Google and
          // sign-up alike. A user with exactly one organization is connected to
          // it without a click; 0 or many leave it null, and the frontend sends
          // them to onboarding or to the picker.
          before: async (session) => {
            const memberships = await prisma.member.findMany({
              where: { userId: session.userId },
              select: { organizationId: true },
              take: 2,
            });

            return {
              data: {
                ...session,
                activeOrganizationId:
                  memberships.length === 1
                    ? memberships[0].organizationId
                    : null,
              },
            };
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
