import { createAuthClient } from "better-auth/react";
import { sanitizeNextURL } from "@/lib/url";
export const authClient = createAuthClient();

export type SocialProvider = "github"; //| "google"

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
