import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  monitorNotificationRules,
  notificationChannels,
} from "@/lib/db/schema/notifications";

export type NotificationChannel = typeof notificationChannels.$inferSelect;
export type MonitorNotificationRule =
  typeof monitorNotificationRules.$inferSelect;

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

export type SetMonitorNotificationRuleInput = {
  channelId: string;
  event: MonitorNotificationRule["event"];
  enabled?: boolean;
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

export async function getNotificationRulesByMonitorId(monitorId: string) {
  return db.query.monitorNotificationRules.findMany({
    where: eq(monitorNotificationRules.monitorId, monitorId),
    with: {
      channel: true,
    },
  });
}

export async function getNotificationRulesByMonitorIds(monitorIds: string[]) {
  if (monitorIds.length === 0) return [];
  return db.query.monitorNotificationRules.findMany({
    where: inArray(monitorNotificationRules.monitorId, monitorIds),
    with: {
      channel: true,
    },
  });
}

export async function setMonitorNotificationRules(
  monitorId: string,
  rules: SetMonitorNotificationRuleInput[],
): Promise<MonitorNotificationRule[]> {
  return db.transaction(async (tx) => {
    await tx
      .delete(monitorNotificationRules)
      .where(eq(monitorNotificationRules.monitorId, monitorId));

    if (rules.length === 0) return [];

    return tx
      .insert(monitorNotificationRules)
      .values(
        rules.map((rule) => ({
          monitorId,
          channelId: rule.channelId,
          event: rule.event,
          enabled: rule.enabled ?? true,
        })),
      )
      .returning();
  });
}

