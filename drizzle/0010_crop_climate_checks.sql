-- crop_name não vazio (espelha Zod min(1) no storage)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM farm_crops WHERE char_length(trim(crop_name)) = 0
  ) THEN
    RAISE EXCEPTION 'farm_crops has empty crop_name; clean before 0010';
  END IF;
  IF EXISTS (
    SELECT 1 FROM farms
    WHERE climate_risk_score IS NOT NULL
      AND (climate_risk_score < 0 OR climate_risk_score > 100.01)
  ) THEN
    RAISE EXCEPTION 'farms has climate_risk_score out of range; clean before 0010';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "farm_crops" ADD CONSTRAINT "farm_crops_name_nonempty_chk"
  CHECK (char_length(trim(crop_name)) > 0);
--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_climate_risk_range_chk"
  CHECK (
    climate_risk_score IS NULL
    OR (climate_risk_score >= 0 AND climate_risk_score <= 100.01)
  );
