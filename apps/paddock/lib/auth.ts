import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { lastLoginMethod } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/lib/db";
import { cache } from "react";
import { env } from "@/lib/env";

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
});

export const getSession = cache(auth.api.getSession)
