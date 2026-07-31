ALTER TABLE "monitor_notification_rules" ALTER COLUMN "event" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."monitor_notification_event";--> statement-breakpoint
CREATE TYPE "public"."monitor_notification_event" AS ENUM('INCIDENT_OPENED', 'INCIDENT_RESOLVED', 'LATENCY_DEGRADED');--> statement-breakpoint
ALTER TABLE "monitor_notification_rules" ALTER COLUMN "event" SET DATA TYPE "public"."monitor_notification_event" USING "event"::"public"."monitor_notification_event";