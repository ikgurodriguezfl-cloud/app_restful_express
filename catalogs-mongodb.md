# Catalogo de Catalogos — Esquema MongoDB

Dato maestro horizontal (brokers, strategies, indicators, temporalidades, tipos de
orden). Soporta N niveles genericos via parentId (maestro-detalle y
maestro-detalle-detalle). Un documento = un catalogo completo con su subdocumento
`values` embebido. Campos camelCase = mismo contrato que el API canonico, por lo
que NO se requiere transformacion en lectura. Codigos de valor en UPPER_SNAKE.
Labels/descripciones en espanol.

> Modelo embebido (a diferencia de una coleccion `catalog_values` separada): los
> catalogos siempre se leen enteros para poblar listas/combos/tablas y son datos de
> referencia read-heavy/write-light. El documento embebido ES el payload canonico
> (`{ ...catalog, values: [] }`); con coleccion separada haria falta `$lookup` para
> armar ese arreglo. Tamaño estimado por catalogo: cientos de subdocumentos, muy lejos
> del limite de 16MB por documento.

## Coleccion: catalogs (definicion del catalogo + valores embebidos)

| campo              | tipo              | notas                                   |
|--------------------|-------------------|-----------------------------------------|
| _id                | ObjectId/UUID     | PK                                      |
| key                | string            | UNIQUE, snake_case: 'vehicle_type'      |
| label              | string            | display en espanol: 'Tipos de Vehiculo' |
| description        | string            | explicacion en espanol                  |
| collection         | string            | dominio/agrupacion: 'config'            |
| section            | string            | 'Digital'                               |
| sequence           | int               | orden global                            |
| imageUrl           | string            |                                         |
| route              | string            | kebab-case: '/config/vehicle-type'      |
| active             | boolean           |                                         |
| deletedAt          | Date              | soft delete (null si activo)            |
| createdAt          | Date              |                                         |
| updatedAt          | Date              |                                         |
| createdBy          | string            | 'FIBARRAC'                              |
| updatedBy          | string            |                                         |
| **values**         | array<Value>      | subdocumento embebido (detalle)         |

### Subdocumento Value (values[])

| campo        | tipo            | notas                                   |
|--------------|-----------------|-----------------------------------------|
| id           | string          | unico dentro del catalogo               |
| parentId     | string/null     | null = nivel 1; apunta a id de value    |
| code         | string          | UPPER_SNAKE: 'VEH_PICKUP'               |
| value        | string          | display en espanol: 'Pick-Up'           |
| alias        | string          | 'PKP'                                   |
| sequence     | int             | unico por scope (parentId)              |
| imageUrl     | string          |                                         |
| description  | string          |                                         |
| active       | boolean         |                                         |
| deletedAt    | Date            |                                         |
| createdAt    | Date            |                                         |
| updatedAt    | Date            |                                         |
| createdBy    | string          |                                         |
| updatedBy    | string          |                                         |

## Ejemplo: catalogo con 3 niveles (maestro-detalle-detalle) en UN documento

```json
{
  "_id": "c-cat-1",
  "key": "strategies",
  "label": "Estrategias",
  "collection": "trading",
  "section": "Operacion",
  "sequence": 1,
  "route": "/config/strategies",
  "active": true,
  "createdAt": "2026-09-11T00:00:00Z",
  "updatedAt": "2026-09-11T00:00:00Z",
  "createdBy": "FIBARRAC",
  "values": [
    {
      "id": "v-1", "parentId": null,
      "code": "OPTIONS", "value": "Opciones", "alias": "OPT",
      "sequence": 1, "active": true
    },
    {
      "id": "v-2", "parentId": "v-1",
      "code": "IRON_CONDOR", "value": "Iron Condor", "alias": "IC",
      "sequence": 1, "active": true
    },
    {
      "id": "v-3", "parentId": "v-2",
      "code": "WIDE_IRON_CONDOR", "value": "Iron Condor Ancho", "alias": "WIC",
      "sequence": 1, "active": true
    }
  ]
}
```

Niveles: `parentId: null` = nivel 1 · apunta a valor nivel 1 = nivel 2 · apunta a
valor nivel 2 = nivel 3. N niveles genericos, misma semantica que Supabase.

## Indices (multikey sobre el subdocumento)

```
mon-1) catalogs:                { key: 1 }                       -> UNIQUE
mon-2) catalogs:                { "values.parentId": 1 }         -> multikey (consultas por nivel)
mon-3) catalogs:                { key: 1, "values.code": 1 }     -> UNIQUE multikey (code unico por catalogo)
mon-4) catalogs:                { key: 1, "values.sequence": 1 } -> multikey (orden por catalogo)
```

Nota: en un indice UNIQUE multikey, la unicidad se evalua por combinacion
(key, values.code); dos valores de catalagos distintos pueden repetir code, dentro
del mismo catalogo el code es unico.

## Mapping legacy -> canonico

| Legacy                 | Canonico                    |
|------------------------|-----------------------------|
| IDETIQUETA / IdEtiquetaOK | catalogs.key             |
| ETIQUETA / Etiqueta    | catalogs.label              |
| IDVALOR / IdValorOK    | values[].code               |
| VALOR / Valor          | values[].value              |
| ALIAS                  | values[].alias              |
| SECUENCIA / Secuencia  | values[].sequence           |
| IDVALORPA / IdValorPA  | values[].parentId (null, nunca "") |
| DETAIL_ROW.ACTIVED / detail_row.Activo | values[].active (boolean) |
| DETAIL_ROW.DELETED / detail_row.Borrado | values[].deletedAt   |
| detail_row_reg         | values[].createdBy / createdAt |

## Contrato API canonico (respuesta unificada - identico al de Supabase)

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

Almacenado embebido de esta forma, el documento Mongo se devuelve tal cual (solo se
mapea `_id` -> `id`). Supabase lo ensambla con la misma forma via recursive CTE.