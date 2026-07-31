CREATE TYPE "public"."monitor_notification_event" AS ENUM('MONITOR_DOWN', 'MONITOR_RECOVERED', 'HIGH_LATENCY');--> statement-breakpoint
CREATE TYPE "public"."notification_channel_type" AS ENUM('discord');--> statement-breakpoint
CREATE TABLE "monitor_notification_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"monitor_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"event" "monitor_notification_event" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_channels" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "notification_channel_type" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "monitor_notification_rules" ADD CONSTRAINT "monitor_notification_rules_monitor_id_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitor_notification_rules" ADD CONSTRAINT "monitor_notification_rules_channel_id_notification_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."notification_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_monitor_notification_rules_monitor_id" ON "monitor_notification_rules" USING btree ("monitor_id");--> statement-breakpoint
CREATE INDEX "idx_monitor_notification_rules_channel_id" ON "monitor_notification_rules" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_notification_channels_user_id" ON "notification_channels" USING btree ("user_id");