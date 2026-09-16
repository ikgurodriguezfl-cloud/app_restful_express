# Catalogo de Catalogos — Esquema Supabase (Postgres)

Dato maestro horizontal (brokers, strategies, indicators, temporalidades, tipos de
orden). Soporta N niveles genericos via parentId (maestro-detalle y
maestro-detalle-detalle). Naming: tablas/columnas en snake_case; key del catalogo
en snake_case; codigos de valor en UPPER_SNAKE. Labels/descripciones en espanol.

## Sobre subdocumentos anidados (JSONB)

Postgres tiene el tipo JSONB, que permitiria guardar el catalogo como un JSON
anidado en una columna. **NO se usa aqui**: este esquema es fijo (no variable) y
requiere integridad real (FK, UNIQUE por scope, consulta por valor con indice
normal, actualizacion parcial de un valor sin reescribir todo el documento). Eso
corresponde a tablas relacionales. El repositorio ensambla el `values` (JSON crudo)
via recursive CTE, produciendo exactamente el mismo contrato que MongoDB. Las
estructuras internas de almacenamiento pueden diferir entre motores; el contrato
API es UNICO.

## Tablas

### catalogs (definicion del catalogo / maestro)

| columna      | tipo            | not null | default           | notas                                    |
|--------------|-----------------|----------|-------------------|------------------------------------------|
| id           | uuid            | si       | gen_random_uuid() | PK                                       |
| key          | text            | si       |                   | UNIQUE, snake_case: 'vehicle_type'       |
| label        | text            | si       |                   | display en espanol: 'Tipos de Vehiculo'  |
| description  | text            |          |                   | explicacion en espanol                   |
| collection   | text            | si       |                   | dominio/agrupacion destino: 'config'     |
| section      | text            |          |                   | seccion opcional: 'Digital'              |
| sequence     | integer         | si       | 0                | orden global                             |
| image_url    | text            |          |                   |                                          |
| route        | text            |          |                   | kebab-case: '/config/vehicle-type'       |
| active       | boolean         | si       | true             |                                          |
| deleted_at   | timestamptz     |          |                   | soft delete                              |
| created_at   | timestamptz     | si       | now()            |                                          |
| updated_at   | timestamptz     | si       | now()            |                                          |
| created_by   | text            |          |                   | auditoria (ej. 'FIBARRAC')               |
| updated_by   | text            |          |                   | auditoria                                |

### catalog_values (valores del catalogo / detalle, auto-referenciado)

| columna      | tipo            | not null | default           | notas                                    |
|--------------|-----------------|----------|-------------------|------------------------------------------|
| id           | uuid            | si       | gen_random_uuid() | PK                                       |
| catalog_id   | uuid            | si       |                   | FK -> catalogs(id), ON DELETE CASCADE    |
| parent_id    | uuid            |          |                   | FK -> catalog_values(id); NULL = nivel 1 |
| code         | text            | si       |                   | UPPER_SNAKE: 'VEH_PICKUP'                |
| value        | text            | si       |                   | display en espanol: 'Pick-Up'            |
| alias        | text            |          |                   | 'PKP'                                    |
| sequence     | integer         | si       | 0                | unico por scope (catalog_id, parent_id)  |
| image_url    | text            |          |                   |                                          |
| description  | text            |          |                   |                                          |
| active       | boolean         | si       | true             |                                          |
| deleted_at   | timestamptz     |          |                   | soft delete                              |
| created_at   | timestamptz     | si       | now()            |                                          |
| updated_at   | timestamptz     | si       | now()            |                                          |
| created_by   | text            |          |                   |                                          |
| updated_by   | text            |          |                   |                                          |

## DDL

```sql
CREATE TABLE catalogs (
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

CREATE TABLE catalog_values (
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

CREATE INDEX idx_catalog_values_catalog ON catalog_values (catalog_id);
CREATE INDEX idx_catalog_values_parent  ON catalog_values (parent_id);
```

## Niveles (maestro-detalle-detalle)

El nivel se deriva de la cadena parent_id (NULL = nivel 1). Sin columna level:
- nivel 1: parent_id IS NULL
- nivel 2: parent_id apunta a un valor nivel 1
- nivel 3: parent_id apunta a un valor nivel 2

Consulta de arbol (recursive CTE):

```sql
WITH RECURSIVE tree AS (
  SELECT id, catalog_id, parent_id, code, value, sequence, 1 AS level
  FROM catalog_values WHERE parent_id IS NULL
  UNION ALL
  SELECT v.id, v.catalog_id, v.parent_id, v.code, v.value, v.sequence, t.level + 1
  FROM catalog_values v JOIN tree t ON v.parent_id = t.id
)
SELECT * FROM tree WHERE catalog_id = :id ORDER BY sequence;
```

## Contrato API canonico (respuesta unificada)

```json
{
  "id": "uuid", "key": "vehicle_type", "label": "Tipos de Vehiculo",
  "description": "...", "collection": "config", "section": "Digital",
  "sequence": 5, "imageUrl": "...", "route": "/config/vehicle-type",
  "active": true, "createdAt": "...", "updatedAt": "...",
  "values": [
    { "id": "uuid", "parentId": null, "code": "VEH_PICKUP", "value": "Pick-Up",
      "alias": "PKP", "sequence": 2, "imageUrl": "...", "description": "..." }
  ]
}
```

El REST API SIEMPRE responde camelCase; esta tabla reside en Postgres (snake_case).
La forma del `values` de la respuesta la arma la capa de repositorios (recursive
CTE), identica a como MongoDB la devuelve embebida.