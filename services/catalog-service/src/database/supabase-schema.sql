-- Schema de Supabase para catalogos maestros
-- Objetivo: mantener el mismo contrato de datos que MongoDB, pero con tablas relacionales.

CREATE TABLE IF NOT EXISTS catalogs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  description TEXT,
  collection  TEXT NOT NULL,
  section     TEXT,
  sequence    INTEGER NOT NULL DEFAULT 0,
  image_url   TEXT,
  route       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  TEXT,
  updated_by  TEXT
);

CREATE TABLE IF NOT EXISTS catalog_values (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id  UUID NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES catalog_values(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  value       TEXT NOT NULL,
  alias       TEXT,
  sequence    INTEGER NOT NULL DEFAULT 0,
  image_url   TEXT,
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  TEXT,
  updated_by  TEXT,
  CONSTRAINT catalog_values_code_scope UNIQUE (catalog_id, parent_id, code),
  CONSTRAINT catalog_values_seq_scope UNIQUE (catalog_id, parent_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_catalog_values_catalog
  ON catalog_values (catalog_id);

CREATE INDEX IF NOT EXISTS idx_catalog_values_parent
  ON catalog_values (parent_id);

-- Ejemplo de consulta recursiva para reconstruir el formato canonico del payload:
-- WITH RECURSIVE tree AS (
--   SELECT id, catalog_id, parent_id, code, value, sequence, 1 AS level
--   FROM catalog_values
--   WHERE parent_id IS NULL
--   UNION ALL
--   SELECT v.id, v.catalog_id, v.parent_id, v.code, v.value, v.sequence, t.level + 1
--   FROM catalog_values v
--   JOIN tree t ON v.parent_id = t.id
-- )
-- SELECT * FROM tree WHERE catalog_id = :catalog_id ORDER BY sequence;
