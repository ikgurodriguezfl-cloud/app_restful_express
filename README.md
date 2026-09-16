# Catalogos Microservices Demo

Demo de una aplicacion REST con Express organizada como microservicios.

## Estructura base

- `services/api-gateway`: punto de entrada HTTP para los clientes.
- `services/catalog-service`: servicio preparado para el dominio de catalogos.
- `catalogs-mongodb.md`: modelo de persistencia para MongoDB.
- `catalogs-supabase-postgres.md`: modelo de persistencia para Supabase/Postgres.

Esta entrega se limita a la estructura base y a la configuracion minima para ejecutar Express. La implementacion de modelos, conexiones a base de datos, servicios de negocio, controladores y rutas CRUD pertenece a etapas posteriores del reporte.

Cada servicio puede arrancar de forma independiente y expone un endpoint tecnico `/health`.
