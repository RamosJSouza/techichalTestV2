ALTER TABLE producers DROP CONSTRAINT IF EXISTS producers_document_hash_unique;
DROP INDEX IF EXISTS producers_document_hash_unique;

CREATE UNIQUE INDEX IF NOT EXISTS producers_document_hash_active_uidx
  ON producers (document_hash)
  WHERE deleted_at IS NULL;
