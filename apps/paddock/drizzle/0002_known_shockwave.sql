ALTER TABLE "monitors" DROP CONSTRAINT "check_timeout";--> statement-breakpoint
ALTER TABLE "monitors" ADD CONSTRAINT "check_timeout" CHECK ("monitors"."timeout" > 0 AND "monitors"."timeout" <= 30);