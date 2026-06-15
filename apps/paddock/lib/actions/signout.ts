"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function signOutAction() {
  try {
    await auth.api.signOut({ headers: await headers() });
    return { success: true };
  } catch (e) {
    console.error("Sign out failed:", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function revokeSessionAction(sessionToken: string) {
  try {
    await auth.api.revokeSession({
      body: { token: sessionToken },
      headers: await headers(),
    });
    revalidatePath("/profile");
    return { success: true };
  } catch (e) {
    console.error("Revoke session failed:", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function revokeOtherSessionsAction() {
  try {
    await auth.api.revokeOtherSessions({ headers: await headers() });
    revalidatePath("/profile");
    return { success: true };
  } catch (e) {
    console.error("Revoke all sessions failed:", e);
    return { success: false, error: (e as Error).message };
  }
}
