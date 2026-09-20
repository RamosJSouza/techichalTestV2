ALTER TABLE "producers" ADD COLUMN IF NOT EXISTS "document_validation_pending_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "producers" ADD COLUMN IF NOT EXISTS "document_validation_pending_reason" varchar(120);
--> statement-breakpoint
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "territorial_validation_pending_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "territorial_validation_pending_reason" varchar(120);
