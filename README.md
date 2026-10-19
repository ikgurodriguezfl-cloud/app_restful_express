> Integración local actual: consulta [INTEGRACION_SUPABASE.md](INTEGRACION_SUPABASE.md). El contrato Supabase de ese documento sustituye las referencias antiguas de MongoDB para Spread Service.

# Catalogos Microservices Demo

Demo de una aplicacion REST con Express organizada como microservicios.

## Estructura base

- `services/api-gateway`: punto de entrada HTTP para los clientes.
- `services/catalog-service`: servicio preparado para el dominio de catalogos.
- `services/quant-service`: servicio base para cálculo cuantitativo, market data y estrategias de opciones.
- `services/strategy-service`: capa de dominio, modelos y servicios de persistencia para F3.
- `catalogs-mongodb.md`: modelo de persistencia para MongoDB.
- `catalogs-supabase-postgres.md`: modelo de persistencia para Supabase/Postgres.

## Módulos base integrados

- `GET /health` en cada servicio
- `POST /api/v1/quant/prices`
- `POST /api/v1/quant/greeks`
- `POST /api/v1/quant/implied-volatility`
- `GET /api/v1/strategies/types`
- `POST /api/v1/strategies/build`
- `POST /api/v1/strategies/evaluate`
- `GET /api/v1/market-data/options-chains`

El API Gateway conserva el prefijo `/api/v1`; las rutas HTTP de estrategias que ya existen se reenvían a `quant-service` (puerto 3002). 

Configura `MONGODB_URI` y `MONGODB_DATABASE` para la persistencia de spreads; `STRATEGY_PORT` permite configurar el puerto del proceso de `strategy-service`.

La implementación F3 incluye los modelos Mongoose `VerticalSpread` y `optionLeg` en `src/api/v1/models`, además de la lógica de dominio y operaciones de persistencia exportadas desde `src/api/v1/services`.

Cada servicio puede arrancar de forma independiente y expone un endpoint técnico `/health`. Ejecuta `npm run dev:strategy` para iniciar la conexión de `strategy-service` y `npm run test:strategy` para validar las reglas, el mapeo y los modelos de spreads.

## Punto G: rutas de spreads verticales

La rama `feature/G-routes` expone 18 rutas en `spread-service`, agrupadas en
`src/routes/index.js`: CRUD de spreads, lotes y operaciones sobre `legs`.
La matriz completa y pendientes de integración están en [PUNTO_G_RUTAS.md](PUNTO_G_RUTAS.md).

- `npm run test:spread`: pruebas HTTP con servicios simulados y pruebas de modelos.
- `npm run test:strategy`: pruebas existentes del dominio F3.
- `services/spread-service/examples/spreads.http`: ejemplos para un cliente REST.

PUT de un spread requiere todos los campos de negocio y `legs`; conserva key, ID,
createdBy y auditoría. Los opcionales omitidos se eliminan. PUT de una pata conserva
su ID y parentId, y restablece opcionales omitidos. POST de patas conserva el contrato
anterior de F: recibe un arreglo completo de dos patas. No admite creación de una pata
suelta porque el modelo admite cero o dos patas. DELETE de patas es lógico; GET de patas
incluye sus indicadores active/deletedAt para auditoría, pero GET individual responde
404 si la pata ya está eliminada.

Los lotes de spreads admiten hasta 100 elementos con éxito parcial (`atomic: false`).
Las operaciones de varias patas se guardan juntas solamente si todas son válidas.
PATCH acepta únicamente campos de negocio permitidos; no permite cambiar IDs ni auditoría.

spread-service ya conecta MongoDB antes de iniciar HTTP. H debe
configurar el proxy `/api/v1/spreads` en el gateway. Para arrancar directamente: `npm --workspace services/spread-service start`. La configuración usa el .env raíz; `SPREAD_PORT` tiene prioridad sobre `PORT`. El ruteo se puede verificar con
los tests sin credenciales. Estas pruebas no validan persistencia SQL ni selección
de base de datos al iniciar sesión.
