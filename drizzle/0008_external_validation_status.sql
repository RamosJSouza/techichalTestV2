-- Status de validação externa BrasilAPI (documento / territorial).
-- Distinto de esg_status e car_status.

ALTER TABLE producers
  ADD COLUMN IF NOT EXISTS document_validation_status varchar(40)
    NOT NULL DEFAULT 'VALIDATED';

ALTER TABLE farms
  ADD COLUMN IF NOT EXISTS territorial_validation_status varchar(40)
    NOT NULL DEFAULT 'VALIDATED';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM producers
    WHERE document_validation_status NOT IN (
      'VALIDATED', 'PENDING_EXTERNAL_VALIDATION', 'REJECTED'
    )
  ) THEN
    RAISE EXCEPTION 'producers has invalid document_validation_status; fix before 0008';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM farms
    WHERE territorial_validation_status NOT IN (
      'VALIDATED', 'PENDING_EXTERNAL_VALIDATION', 'REJECTED'
    )
  ) THEN
    RAISE EXCEPTION 'farms has invalid territorial_validation_status; fix before 0008';
  END IF;
END $$;

ALTER TABLE producers
  ADD CONSTRAINT producers_document_validation_status_chk CHECK (
    document_validation_status IN (
      'VALIDATED', 'PENDING_EXTERNAL_VALIDATION', 'REJECTED'
    )
  );

ALTER TABLE farms
  ADD CONSTRAINT farms_territorial_validation_status_chk CHECK (
    territorial_validation_status IN (
      'VALIDATED', 'PENDING_EXTERNAL_VALIDATION', 'REJECTED'
    )
  );
