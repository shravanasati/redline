"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  type CreateNotificationChannelInput,
  createNotificationChannel,
  deleteNotificationChannel,
  getNotificationChannelsByUserId,
  toggleNotificationChannelEnabled,
  updateNotificationChannel,
} from "@/lib/db/crud/notifications";
import { notificationChannelTypeEnum } from "@/lib/db/schema/notifications";

const notificationChannelTypeValues = notificationChannelTypeEnum.enumValues;

const configSchema = z
  .record(z.string(), z.unknown())
  .refine((val) => Object.keys(val).length > 0, {
    message: "Config is required",
  });

const createNotificationChannelSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(notificationChannelTypeValues),
  config: configSchema,
});

const updateNotificationChannelSchema = createNotificationChannelSchema
  .pick({ name: true, config: true })
  .partial();

export async function createNotificationChannelAction(
  _prevState: unknown,
  formData: FormData,
) {
  try {
    const session = await getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const raw = Object.fromEntries(formData);

    let configJson: unknown;
    if (raw.config) {
      try {
        configJson = JSON.parse(raw.config as string);
      } catch {}
    }

    const parsed = createNotificationChannelSchema.safeParse({
      ...raw,
      config: configJson,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    const input: CreateNotificationChannelInput = {
      userId: session.user.id,
      ...parsed.data,
    };

    const channel = await createNotificationChannel(input);

    revalidatePath("/dashboard/notifications");

    return { success: true, data: channel };
  } catch (e) {
    console.error("createNotificationChannelAction failed:", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function updateNotificationChannelAction(
  channelId: string,
  _prevState: unknown,
  formData: FormData,
) {
  try {
    const session = await getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const raw = Object.fromEntries(formData);

    let configJson: unknown;
    if (raw.config) {
      try {
        configJson = JSON.parse(raw.config as string);
      } catch {}
    }

    const parsed = updateNotificationChannelSchema.safeParse({
      ...raw,
      config: raw.config ? configJson : undefined,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    if (Object.keys(parsed.data).length === 0) {
      return { success: false, error: "No fields provided for update" };
    }

    const channel = await updateNotificationChannel(
      channelId,
      session.user.id,
      parsed.data,
    );

    if (!channel) {
      return { success: false, error: "Notification channel not found" };
    }

    revalidatePath("/dashboard/notifications");

    return { success: true, data: channel };
  } catch (e) {
    console.error("updateNotificationChannelAction failed:", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteNotificationChannelAction(channelId: string) {
  try {
    const session = await getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const channel = await deleteNotificationChannel(channelId, session.user.id);

    if (!channel) {
      return { success: false, error: "Notification channel not found" };
    }

    revalidatePath("/dashboard/notifications");

    return { success: true, data: channel };
  } catch (e) {
    console.error("deleteNotificationChannelAction failed:", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function fetchNotificationChannelsByUser() {
  try {
    const session = await getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const channels = await getNotificationChannelsByUserId(session.user.id);

    return { success: true, data: channels };
  } catch (e) {
    console.error("fetchNotificationChannelsByUser failed:", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function toggleNotificationChannelEnabledAction(
  channelId: string,
  enabled: boolean,
) {
  try {
    const session = await getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const channel = await toggleNotificationChannelEnabled(
      channelId,
      session.user.id,
      enabled,
    );

    if (!channel) {
      return { success: false, error: "Notification channel not found" };
    }

    revalidatePath("/dashboard/notifications");

    return { success: true, data: channel };
  } catch (e) {
    console.error("toggleNotificationChannelEnabledAction failed:", e);
    return { success: false, error: (e as Error).message };
  }
}
