import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { lastLoginMethod } from "better-auth/plugins";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { getLocationFromIP } from "@/lib/ip-location";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
    schema,
  }),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
  plugins: [lastLoginMethod(), nextCookies()],
  advanced: {
    cookiePrefix: "redline",
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  session: {
    additionalFields: {
      location: {
        type: "string",
        required: false,
        defaultValue: "Unknown Location",
        input: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (user) => {
          let loc = "Unknown Location";
          if (user.ipAddress) {
            loc = await getLocationFromIP(user.ipAddress);
          }
          return {
            data: {
              ...user,
              location: loc,
            },
          };
        },
      },
    },
  },
});

export const getSession = cache(auth.api.getSession);
