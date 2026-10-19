> Referencia histórica de la rama G. Para el contrato adaptado a Supabase en esta integración, usa [INTEGRACION_SUPABASE.md](INTEGRACION_SUPABASE.md).

# Preparación del punto G: ruteo de spreads verticales

## Base y alcance

- Rama de origen: `feacture/F-controler`, commit `f19121805a17ecb9492e4cb8fe2c4333b8628030`.
- Rama local de trabajo: `feature/G-routes`.
- Alcance propuesto: F3, spreads verticales Bull/Bear Call/Put y sus subdocumentos `legs`.
- Las 18 rutas de la matriz están implementadas en esta rama. Los estados de la tabla describen la base F antes de estos cambios.

El documento de la actividad enumera APIs de F0–F5 y describe F0 en B, pero los modelos de C y servicios de E revisados corresponden a F3. Para G se propone completar F3 sobre los controladores de F en `spread-service`, conservando su prefijo `/api/v1/spreads`.

## Estado actual

`spread-service` contiene modelos, servicios, nueve controladores y nueve rutas montadas en su App. `strategy-service` contiene una implementación adicional de modelos, dominio y servicios con operaciones por lotes, pero no expone esas operaciones por HTTP. Los controladores de F no llaman a esos servicios de E: usan su propio `SpreadService`.

No conviene importar directamente el servicio interno de otro microservicio. Las operaciones faltantes deberán implementarse o adaptarse dentro de `spread-service`, verificando sus modelos y reglas. Las rutas iniciales `/api/v1/strategies/setups` de `quant-service` devuelven datos de demostración; no son el CRUD persistente de F3.

## Matriz de rutas

Todas las URLs de esta tabla tienen el prefijo `/api/v1/spreads`. Los nombres de controladores nuevos son propuestas.

| Método | Ruta relativa | Controlador | Estado en F | Entrada principal / resultado |
| --- | --- | --- | --- | --- |
| GET | `/` | `listSpreads` | Existe | Filtros y paginación; `{ data, total }` |
| POST | `/` | `createSpread` | Existe | Objeto del spread; recurso creado, 201 |
| GET | `/:id` | `getSpread` | Existe | ObjectId o key; recurso o 404 |
| PATCH | `/:id` | `updateSpread` | Existe | ObjectId y cambios parciales; recurso actualizado |
| PUT | `/:id` | `replaceSpread` | Pendiente | ObjectId y representación completa; validar campos obligatorios |
| DELETE | `/:id` | `deleteSpread` | Existe | ObjectId, `deletedBy` opcional; borrado lógico |
| POST | `/batch` | `createSpreadsBatch` | Pendiente | `{ spreads: [...] }`; resultado por elemento |
| PATCH | `/batch` | `updateSpreadsBatch` | Pendiente | `{ operations: [{ spreadId, changes }] }`; resultado por elemento |
| DELETE | `/batch` | `deleteSpreadsBatch` | Pendiente | `{ spreadIds: [...] }`; resultado por elemento |
| GET | `/:spreadId/legs` | `getLegs` | Existe | ObjectId del padre; arreglo de patas |
| GET | `/:spreadId/legs/:legId` | `getLeg` | Pendiente | ObjectId del padre y UUID de pata; pata o 404 |
| POST | `/:spreadId/legs` | `setLegs` | Existe | Arreglo de exactamente dos patas; reemplaza el arreglo, 201 |
| PUT | `/:spreadId/legs` | `replaceLegs` | Pendiente | `{ legs: [...] }`; reemplazo explícito del arreglo completo |
| PATCH | `/:spreadId/legs/:legId` | `updateLeg` | Existe | Cambios parciales; spread actualizado |
| PUT | `/:spreadId/legs/:legId` | `replaceLeg` | Pendiente | Representación completa de una pata; conservar su identidad |
| DELETE | `/:spreadId/legs/:legId` | `deleteLeg` | Existe | Borrado lógico de una pata |
| PATCH | `/:spreadId/legs` | `updateLegsBatch` | Pendiente | `{ operations: [{ legId, changes }] }`; validar antes de guardar |
| DELETE | `/:spreadId/legs` | `deleteLegsBatch` | Pendiente | `{ legIds: [...] }`; borrado lógico múltiple |

La creación múltiple de patas ya está cubierta por el POST existente que recibe un arreglo. La creación de una sola pata necesita definir primero un estado borrador: el modelo de F admite cero o dos patas, y el dominio de E exige exactamente dos. Añadir una pata a un spread completo o quitarla físicamente rompe esa regla. No debe prometerse un POST individual funcional sin resolverlo. El borrado lógico usado en F mantiene la estructura, pero también debe aclararse cómo se evalúa una estrategia con una pata inactiva.

## Criterios para implementar G

1. Mantener las nueve rutas existentes y agregar las faltantes con controladores reales; PUT debe validar una representación completa y no ser simplemente un alias de PATCH.
2. Registrar `/batch` antes de `/:id`, para que Express no interprete `batch` como un identificador.
3. Crear un índice `src/routes/index.js` que agrupe el router de spreads. Coordinar su montaje en App con H.
4. Validar ObjectId del padre y UUID de las patas, entradas JSON y campos permitidos. Conservar IDs y campos de auditoría.
5. Definir lotes de hasta 100 elementos, con resultados por elemento y éxito parcial explícito para spreads. Para cambios de varias patas de un mismo spread, validar el conjunto antes de guardar.
6. Verificar el despacho de cada ruta, especialmente `/batch`, errores de entrada, recursos inexistentes y operaciones sobre subdocumentos. Después probar persistencia real con una base de prueba.

## Integración que corresponde coordinar con H

- El gateway actual no reenvía `/api/v1/spreads`. Agregar destino y configuración para `spread-service` (puerto predeterminado actual: 3004).
- Resuelto: `spread-service/src/server.js` conecta Mongoose antes de iniciar HTTP, con timeout de 5 segundos y configuración del .env raíz.
- Agregar scripts raíz para arrancar `spread-service` y documentar las variables de entorno necesarias.
- El README describe un estado anterior a F; actualizarlo al integrar G/H.

Validación de G: 23 pruebas pasan en spread-service (incluye las 18 rutas mediante HTTP con servicios simulados, errores de entrada, lotes y validación real de modelos con guardado simulado). También pasan las 9 pruebas existentes de strategy-service. Ejecutar `npm run test:spread` y `npm run test:strategy`. Se verificó además contra MongoDB local, base market_signal: health, creación de spread, reemplazo de dos patas, consulta individual de pata, PATCH de spread y PATCH por lote. El registro de prueba se eliminó lógicamente. El gateway sigue pendiente de H.
