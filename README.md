# Catalogos Microservices Demo

Demo de una aplicacion REST con Express organizada como microservicios.

## Estructura base

- `services/api-gateway`: punto de entrada HTTP para los clientes.
- `services/catalog-service`: servicio preparado para el dominio de catalogos.
- `services/quant-service`: servicio base para cálculo cuantitativo, market data y estrategias de opciones.
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

Esta entrega limita la implementación a la base operativa y la configuración de microservicios para integrar el dominio cuantitativo/estratégico. La persistencia y la lógica de negocio avanzada quedan preparadas para etapas posteriores.

Cada servicio puede arrancar de forma independiente y expone un endpoint tecnico `/health`.
