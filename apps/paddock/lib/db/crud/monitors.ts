import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  type MonitorAssertions,
  type MonitorMetadata,
  monitors,
} from "@/lib/db/schema/monitors";

export type Monitor = typeof monitors.$inferSelect;

export type CreateMonitorInput = {
  userId: string;
  name: string;
  type: Monitor["type"];
  endpoint: string;
  frequency: number;
  timeout?: number;
  status?: Monitor["status"];
  isFailing?: boolean;
  assertions?: MonitorAssertions;
  metadata?: MonitorMetadata;
};

export type UpdateMonitorInput = Partial<Omit<CreateMonitorInput, "userId">>;

export async function createMonitor(
  input: CreateMonitorInput,
): Promise<Monitor> {
  const [monitor] = await db
    .insert(monitors)
    .values({
      userId: input.userId,
      name: input.name,
      type: input.type,
      endpoint: input.endpoint,
      frequency: input.frequency,
      timeout: input.timeout,
      status: input.status,
      isFailing: input.isFailing,
      assertions: input.assertions,
      metadata: input.metadata,
    })
    .returning();

  return monitor;
}

export async function getMonitorById(id: string): Promise<Monitor | undefined> {
  return db.query.monitors.findFirst({
    where: eq(monitors.id, id),
  });
}

export async function getMonitorsByUserId(userId: string): Promise<Monitor[]> {
  return db.query.monitors.findMany({
    where: eq(monitors.userId, userId),
    orderBy: (monitor, { desc }) => [desc(monitor.createdAt)],
  });
}

export async function updateMonitor(
  id: string,
  input: UpdateMonitorInput,
): Promise<Monitor | undefined> {
  const [monitor] = await db
    .update(monitors)
    .set({
      name: input.name,
      type: input.type,
      endpoint: input.endpoint,
      frequency: input.frequency,
      timeout: input.timeout,
      status: input.status,
      isFailing: input.isFailing,
      assertions: input.assertions,
      metadata: input.metadata,
    })
    .where(eq(monitors.id, id))
    .returning();

  return monitor;
}

export async function deleteMonitor(id: string): Promise<Monitor | undefined> {
  const [monitor] = await db
    .delete(monitors)
    .where(eq(monitors.id, id))
    .returning();

  return monitor;
}

export async function pauseMonitor(
  id: string,
  isPaused: boolean,
): Promise<Monitor | undefined> {
  const [monitor] = await db
    .update(monitors)
    .set({
      status: isPaused ? "paused" : "active",
    })
    .where(eq(monitors.id, id))
    .returning();

  return monitor;
}
