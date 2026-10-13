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
