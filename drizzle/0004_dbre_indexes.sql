-- DBRE: índices em FKs e parciais para dashboard / soft-delete
-- CASCADE nas FKs já existe; soft delete não dispara CASCADE (apenas DELETE físico).
CREATE INDEX "farms_producer_id_idx" ON "farms" ("producer_id");
--> statement-breakpoint
CREATE INDEX "farms_active_state_idx" ON "farms" ("state") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "harvests_farm_id_idx" ON "harvests" ("farm_id");
--> statement-breakpoint
CREATE INDEX "harvests_active_farm_id_idx" ON "harvests" ("farm_id") WHERE "status" = 'ACTIVE';
--> statement-breakpoint
CREATE INDEX "farm_crops_harvest_id_idx" ON "farm_crops" ("harvest_id");
