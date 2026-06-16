import { createAuthClient } from "better-auth/react";
import { sanitizeNextURL } from "@/lib/url";
import { lastLoginMethodClient } from "better-auth/client/plugins";
export const authClient = createAuthClient({
  plugins: [lastLoginMethodClient()]
});

export type SocialProvider = "github" | "google";

export const signIn = async (
  provider: SocialProvider,
  callbackURL: string = "/dashboard",
) => {
  const data = await authClient.signIn.social({
    provider: provider,
    callbackURL: sanitizeNextURL(callbackURL),
  });
  return data;
};

export const signOut = async () => {
  try {
    const result = await authClient.signOut();
    return result;
  } catch (error) {
    console.error("Sign out failed:", error);
    throw error;
  }
};
