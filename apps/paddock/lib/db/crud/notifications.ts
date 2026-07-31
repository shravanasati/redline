import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationChannels } from "@/lib/db/schema/notifications";

export type NotificationChannel = typeof notificationChannels.$inferSelect;

export type CreateNotificationChannelInput = {
  userId: string;
  name: string;
  type: NotificationChannel["type"];
  config: Record<string, unknown>;
};

export type UpdateNotificationChannelInput = {
  name?: string;
  config?: Record<string, unknown>;
};

export async function createNotificationChannel(
  input: CreateNotificationChannelInput,
): Promise<NotificationChannel> {
  const [channel] = await db
    .insert(notificationChannels)
    .values({
      userId: input.userId,
      name: input.name,
      type: input.type,
      config: input.config,
    })
    .returning();

  return channel;
}

export async function getNotificationChannelsByUserId(
  userId: string,
): Promise<NotificationChannel[]> {
  return db.query.notificationChannels.findMany({
    where: eq(notificationChannels.userId, userId),
    orderBy: (channel, { desc }) => [desc(channel.createdAt)],
  });
}

export async function toggleNotificationChannelEnabled(
  channelId: string,
  userId: string,
  enabled: boolean,
): Promise<NotificationChannel | undefined> {
  const [channel] = await db
    .update(notificationChannels)
    .set({ enabled })
    .where(
      and(
        eq(notificationChannels.id, channelId),
        eq(notificationChannels.userId, userId),
      ),
    )
    .returning();

  return channel;
}

export async function updateNotificationChannel(
  channelId: string,
  userId: string,
  input: UpdateNotificationChannelInput,
): Promise<NotificationChannel | undefined> {
  const [channel] = await db
    .update(notificationChannels)
    .set({
      name: input.name,
      config: input.config,
    })
    .where(
      and(
        eq(notificationChannels.id, channelId),
        eq(notificationChannels.userId, userId),
      ),
    )
    .returning();

  return channel;
}

export async function deleteNotificationChannel(
  channelId: string,
  userId: string,
): Promise<NotificationChannel | undefined> {
  const [channel] = await db
    .delete(notificationChannels)
    .where(
      and(
        eq(notificationChannels.id, channelId),
        eq(notificationChannels.userId, userId),
      ),
    )
    .returning();

  return channel;
}
