CREATE TABLE IF NOT EXISTS "external_validation_audit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "resource_type" varchar(40) NOT NULL,
  "resource_id" uuid NOT NULL,
  "previous_status" varchar(40) NOT NULL,
  "new_status" varchar(40) NOT NULL,
  "reason" varchar(120),
  "trigger" varchar(20) NOT NULL,
  "actor" varchar(40) NOT NULL,
  "trace_id" varchar(64),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_validation_audit_resource_idx"
  ON "external_validation_audit" ("resource_type", "resource_id", "created_at");
--> statement-breakpoint
ALTER TABLE "external_validation_audit"
  ADD CONSTRAINT "external_validation_audit_resource_type_chk"
  CHECK ("resource_type" IN ('producer_document', 'farm_territorial'));
--> statement-breakpoint
ALTER TABLE "external_validation_audit"
  ADD CONSTRAINT "external_validation_audit_trigger_chk"
  CHECK ("trigger" IN ('write', 'job', 'admin'));
--> statement-breakpoint
ALTER TABLE "external_validation_audit"
  ADD CONSTRAINT "external_validation_audit_actor_chk"
  CHECK ("actor" IN ('system', 'admin'));
