-- Status e UF válidos (espelham enums do domínio).
-- Pré-check falha a migration se houver linhas inválidas.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM farms
    WHERE state NOT IN (
      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
      'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
    )
  ) THEN
    RAISE EXCEPTION 'farms has rows with invalid state (UF); fix data before 0007';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM harvests
    WHERE status NOT IN ('ACTIVE', 'ARCHIVED')
  ) THEN
    RAISE EXCEPTION 'harvests has rows with invalid status; fix data before 0007';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM producers
    WHERE esg_status NOT IN ('APPROVED', 'WARNING', 'BLOCKED')
  ) THEN
    RAISE EXCEPTION 'producers has rows with invalid esg_status; fix data before 0007';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM farms
    WHERE car_status IS NOT NULL
      AND car_status NOT IN ('ACTIVE', 'PENDING', 'CANCELLED')
  ) THEN
    RAISE EXCEPTION 'farms has rows with invalid car_status; fix data before 0007';
  END IF;
END $$;

ALTER TABLE farms
  ADD CONSTRAINT farms_state_uf_chk CHECK (
    state IN (
      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
      'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
    )
  );

ALTER TABLE harvests
  ADD CONSTRAINT harvests_status_chk CHECK (status IN ('ACTIVE', 'ARCHIVED'));

ALTER TABLE producers
  ADD CONSTRAINT producers_esg_status_chk CHECK (
    esg_status IN ('APPROVED', 'WARNING', 'BLOCKED')
  );

ALTER TABLE farms
  ADD CONSTRAINT farms_car_status_chk CHECK (
    car_status IS NULL OR car_status IN ('ACTIVE', 'PENDING', 'CANCELLED')
  );
