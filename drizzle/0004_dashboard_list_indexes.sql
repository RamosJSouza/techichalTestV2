CREATE INDEX IF NOT EXISTS farms_deleted_state_idx
  ON farms (deleted_at, state);

CREATE INDEX IF NOT EXISTS farms_deleted_car_status_idx
  ON farms (deleted_at, car_status);

CREATE INDEX IF NOT EXISTS farms_climate_risk_idx
  ON farms (climate_risk_score)
  WHERE deleted_at IS NULL AND climate_risk_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS harvests_farm_status_year_idx
  ON harvests (farm_id, status, year);

CREATE INDEX IF NOT EXISTS producers_deleted_created_idx
  ON producers (deleted_at, created_at DESC);
