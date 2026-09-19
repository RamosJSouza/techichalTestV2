-- Fase 2: ESG / CAR / risco climático
ALTER TABLE "producers" ADD COLUMN "esg_status" varchar(20) DEFAULT 'APPROVED' NOT NULL;
ALTER TABLE "producers" ADD COLUMN "esg_checked_at" timestamp with time zone;
ALTER TABLE "farms" ADD COLUMN "car_number" varchar(100);
ALTER TABLE "farms" ADD COLUMN "climate_risk_score" numeric(5, 2);
