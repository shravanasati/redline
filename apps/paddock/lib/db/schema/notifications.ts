import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { monitors } from "@/lib/db/schema/monitors";
import { user } from "@/lib/db/schema/auth-schema";

export const notificationChannelTypeEnum = pgEnum("notification_channel_type", [
  "discord",
  "email",
]);

export const monitorNotificationEventEnum = pgEnum(
  "monitor_notification_event",
  ["INCIDENT_OPENED", "INCIDENT_RESOLVED", "LATENCY_DEGRADED"],
);

export type NotificationChannelConfig = Record<string, unknown>;

export const notificationChannels = pgTable(
  "notification_channels",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: notificationChannelTypeEnum("type").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    config: jsonb("config").$type<NotificationChannelConfig>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_notification_channels_user_id").on(table.userId),
  }),
);

export const monitorNotificationRules = pgTable(
  "monitor_notification_rules",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => notificationChannels.id, { onDelete: "cascade" }),
    event: monitorNotificationEventEnum("event").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    monitorIdIdx: index("idx_monitor_notification_rules_monitor_id").on(
      table.monitorId,
    ),
    channelIdIdx: index("idx_monitor_notification_rules_channel_id").on(
      table.channelId,
    ),
  }),
);

export const notificationChannelRelations = relations(
  notificationChannels,
  ({ one, many }) => ({
    user: one(user, {
      fields: [notificationChannels.userId],
      references: [user.id],
    }),
    rules: many(monitorNotificationRules),
  }),
);

export const monitorNotificationRuleRelations = relations(
  monitorNotificationRules,
  ({ one }) => ({
    monitor: one(monitors, {
      fields: [monitorNotificationRules.monitorId],
      references: [monitors.id],
    }),
    channel: one(notificationChannels, {
      fields: [monitorNotificationRules.channelId],
      references: [notificationChannels.id],
    }),
  }),
);
