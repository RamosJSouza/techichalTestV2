-- Listagem: farms_agg_for_list filtra producer_id IN (...).
-- Evidência M: L0 p95 FAIL + EXPLAIN farms_agg Seq Scan ~131ms.
CREATE INDEX IF NOT EXISTS farms_producer_id_active_idx
  ON farms (producer_id)
  WHERE deleted_at IS NULL;
