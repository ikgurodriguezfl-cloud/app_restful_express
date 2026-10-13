# Catalogos Microservices Demo

Demo de una aplicacion REST con Express organizada como microservicios.

## Estructura base

- `services/api-gateway`: punto de entrada HTTP para los clientes.
- `services/catalog-service`: servicio preparado para el dominio de catalogos.
- `services/quant-service`: servicio base para cálculo cuantitativo, market data y estrategias de opciones.
- `services/strategy-service`: servicio de persistencia y CRUD de setups F3 y sus patas.
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
- CRUD de setups F3 en `/api/v1/strategies/setups` y sus subdocumentos en `/api/v1/strategies/setups/:setupId/legs`
- `GET /api/v1/market-data/options-chains`

El API Gateway conserva el prefijo `/api/v1`: `/api/v1/strategies/setups` y sus subrutas se reenvían a `strategy-service` (puerto 3003 por defecto); las rutas de tipos, construcción y evaluación se reenvían a `quant-service` (puerto 3002).

Configura `MONGODB_URI` y `MONGODB_DATABASE` para la persistencia de setups; puedes cambiar los destinos con `STRATEGY_SERVICE_URL` y `STRATEGY_PORT`.

El servicio F3 sigue la estructura `src/api/v1/{controllers,models,routes,services}`. Sus modelos Mongoose `VerticalSpread` y `optionLeg` usan la colección `vertical_spreads` y el contrato camelCase definido para este módulo.

Cada servicio puede arrancar de forma independiente y expone un endpoint técnico `/health`. Ejecuta `npm run dev:strategy` para iniciar el servicio F3 y `npm run test:strategy` para validar sus reglas y modelos de spreads.
