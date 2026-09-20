-- Invariantes de área e UF no storage (espelham FarmArea / schemas Zod).
-- Pré-check: falha a migration se houver linhas inválidas (preferível a constraint NOT VALID silenciosa).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM farms
    WHERE total_area::numeric <= 0
       OR arable_area::numeric < 0
       OR vegetation_area::numeric < 0
       OR (arable_area::numeric + vegetation_area::numeric) > total_area::numeric
       OR char_length(state) <> 2
  ) THEN
    RAISE EXCEPTION 'farms has rows violating area/state invariants; fix data before 0006';
  END IF;
END $$;

ALTER TABLE farms
  ADD CONSTRAINT farms_total_area_positive_chk CHECK (total_area > 0);

ALTER TABLE farms
  ADD CONSTRAINT farms_arable_area_nonneg_chk CHECK (arable_area >= 0);

ALTER TABLE farms
  ADD CONSTRAINT farms_vegetation_area_nonneg_chk CHECK (vegetation_area >= 0);

ALTER TABLE farms
  ADD CONSTRAINT farms_area_sum_chk CHECK (
    (arable_area + vegetation_area) <= total_area
  );

ALTER TABLE farms
  ADD CONSTRAINT farms_state_len_chk CHECK (char_length(state) = 2);
