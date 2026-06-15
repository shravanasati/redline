import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "@/lib/db/schema/auth-schema";

// 1. Enums Definition
export const monitorTypeEnum = pgEnum("monitor_type", [
  "ICMP",
  "HTTP",
  "HTTPS",
  "TCP",
  "DNS",
]);
export const monitorStatusEnum = pgEnum("monitor_status", [
  "active",
  "paused",
  "draft",
]);

// Strongly typed assertion definitions for the JSONB column.
type MonitorAssertionTarget = "status_code" | "body" | "response_time";

type MonitorAssertionOperatorByTarget = {
  status_code: "equals";
  body: "equals" | "contains";
  response_time: "less_than";
};

type MonitorAssertionValueByTarget = {
  status_code: number;
  body: string;
  response_time: number;
};

type MonitorAssertion<
  Target extends MonitorAssertionTarget = MonitorAssertionTarget,
> = {
  target: Target;
  operator: MonitorAssertionOperatorByTarget[Target];
  value: MonitorAssertionValueByTarget[Target];
};

export type MonitorAssertions = MonitorAssertion[];

export type MonitorMetadata = {
  headers?: Record<string, string>;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: string;
};

// 2. Table Definition
export const monitors = pgTable(
  "monitors",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: monitorTypeEnum("type").notNull(),
    endpoint: text("endpoint").notNull(),
    frequency: integer("frequency").notNull(),
    status: monitorStatusEnum("status").notNull().default("active"),
    isFailing: boolean("is_failing").notNull().default(false),
    timeout: integer("timeout").notNull().default(30),
    assertions: jsonb("assertions").$type<MonitorAssertions>(),
    metadata: jsonb("metadata").$type<MonitorMetadata>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => {
    return {
      // Indexes
      userIdIdx: index("idx_monitors_user_id").on(table.userId),
      // Partial index for active runners
      activeRunnersIdx: index("idx_monitors_active_runners")
        .on(table.status, table.frequency)
        .where(sql`status = 'active'`),

      // Constraints
      frequencyCheck: check(
        "check_frequency",
        sql`${table.frequency} >= 10 AND ${table.frequency} <= 3600`,
      ),
      timeoutCheck: check(
        "check_timeout",
        sql`${table.timeout} > 0 AND ${table.timeout} <= ${table.frequency}`,
      ),
    };
  },
);
