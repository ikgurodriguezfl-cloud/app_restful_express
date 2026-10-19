# Integración local de spreads con Supabase

Rama local: `integracion/spreads-supabase`. Integra `feature/G-routes` sobre `Avance_Datos_Reales`. No requiere modificar las tablas existentes.

## Arranque

Desde la raíz del proyecto, en terminales separadas:

```powershell
npm run start:gateway
npm run start:quant
npm run start:spread
npm run start:gui
```

Puertos: Gateway 3000, Quant 3002, Spreads 3004, GUI 3005. Reinicia los procesos que estaban abiertos antes de esta integración y recarga el navegador.
Spreads usa `SPREAD_PORT` y no hereda el `PORT` de Catalog. MongoDB no interviene en Spread Service; los demás módulos del equipo conservan su configuración.

El `.env` existente se conserva. Se requieren `SUPABASE_URL` y `SUPABASE_KEY` (clave pública), o `SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_ANON_KEY`. Las claves secretas/service_role se rechazan para mantener las políticas RLS. No se incluyen claves en este documento.

## Sesión y permisos

Las escrituras requieren `Authorization: Bearer <access_token>` de un usuario de **Supabase Auth del proyecto**, no la clave API pública ni la cuenta de Thunder Client. El servidor verifica la sesión con `getUser`; `user_id` se toma de esa sesión y no del cuerpo. Las consultas autenticadas se restringen al propietario. Las consultas públicas dependen de RLS. No se cambian permisos ni políticas.

El Dashboard permite iniciar sesión con correo y contraseña de un usuario existente de ese proyecto y **Guardar en Supabase** después de evaluar. La sesión se mantiene únicamente en memoria; la contraseña se limpia después del intento. No se implementa registro de usuarios. El guardado usa la copia de los parámetros evaluados y pide el precio del subyacente. Reevalúa para guardar otra estrategia. El historial local permanece identificado como local.

Para Thunder, `POST http://localhost:3005/api/supabase/session` con `{"email":"tu-correo","password":"tu-contraseña"}` devuelve `accessToken` y `expiresAt`. Usa ese token en las rutas de abajo. No compartas ni captures contraseñas o tokens.

## Contrato adaptado

Base por Gateway: `http://localhost:3000/api/v1/spreads`. Base directa: `http://localhost:3004/api/v1/spreads`.
IDs de spreads y piernas son UUID. Ya no se usan ObjectId ni búsquedas por `key`.

| Método | Sufijo | Cuerpo / propósito |
|---|---|---|
| GET | / | Listado `{data,total}`. Filtros `underlyingTicker`, `strategyType`, `status`, `limit` (1–100), `skip` |
| POST | / | Crear un spread; ejemplo abajo |
| GET | /:id | Consultar spread, piernas y evaluaciones |
| PUT | /:id | Reemplazar los campos del padre; requiere todos salvo notes; conserva las piernas |
| PATCH | /:id | Campos parciales del padre |
| DELETE | /:id | Borrado lógico por deleted_at |
| POST | /batch | `{"spreads":[... ]}` |
| PATCH | /batch | `{"operations":[{"spreadId":"UUID","changes":{"notes":"texto"}}]}` |
| DELETE | /batch | `{"spreadIds":["UUID"]}` |
| GET | /:spreadId/legs | Consultar piernas |
| GET | /:spreadId/legs/:legId | Consultar una pierna |
| POST | /:spreadId/legs | Array de exactamente dos piernas; establece/reemplaza el conjunto |
| PUT | /:spreadId/legs | `{"legs":[...dos piernas...]}` |
| PUT | /:spreadId/legs/:legId | Reemplazar una pierna; conserva UUID y orden |
| PATCH | /:spreadId/legs/:legId | Campos parciales de una pierna |
| DELETE | /:spreadId/legs/:legId | Eliminar físicamente una pierna, solo en draft |
| PATCH | /:spreadId/legs | `{"operations":[{"legId":"UUID","changes":{"premium":4}}]}` |
| DELETE | /:spreadId/legs | `{"legIds":["UUID"]}`, solo en draft |
| POST | /:id/evaluations | Calcula con Quant y guarda una nueva instantánea en spread_evaluations |

Son **18 contratos adaptados de G más uno de guardado de evaluación**; `/health` se cuenta aparte. No se implementa selección automática de width por sigma en esta integración.

Campos del padre: strategyType, underlyingTicker, currentStockPrice, expirationDate, quantity, multiplier, status, notes. status admite draft, active y closed, sujeto también a las restricciones existentes en la BD. Un draft puede tener cero, una o dos piernas; active/closed requieren dos válidas. No se aceptan label/key/sigma/métricas calculadas como columnas del padre: notes conserva la etiqueta y las métricas se calculan al guardar una evaluación.

Campos de pierna: contractSymbol (opcional), optionType, action, strike, expirationDate, premium, bid, ask, impliedVolatility, delta, gamma, theta, vega. Los cinco campos optionType/action/strike/expirationDate/premium son obligatorios. Todas las piernas comparten el vencimiento del padre. Dos piernas se validan con el motor Quant antes de persistir cambios. Supabase puede imponer restricciones adicionales a las observables por la API pública.

```json
{
  "strategyType": "BULL_CALL_SPREAD",
  "underlyingTicker": "AAPL",
  "currentStockPrice": 190,
  "expirationDate": "2026-12-18",
  "quantity": 1,
  "multiplier": 100,
  "status": "active",
  "notes": "Prueba Bull Call",
  "legs": [
    {"contractSymbol":"AAPL261218C00190000","optionType":"call","action":"buy","strike":190,"expirationDate":"2026-12-18","premium":4},
    {"contractSymbol":"AAPL261218C00195000","optionType":"call","action":"sell","strike":195,"expirationDate":"2026-12-18","premium":2}
  ]
}
```

La tabla strategy_types se consulta por código normalizado `bull_call_spread`, etc. El padre se guarda en spreads, las piernas en spread_legs (spread_id y leg_order), y las instantáneas en spread_evaluations. Cambiar un spread no reescribe evaluaciones anteriores; invoca de nuevo POST /:id/evaluations.

## Consistencia y alcance de verificación

Los lotes de padres tienen éxito parcial (`atomic:false`). La creación de padre y piernas usa dos llamadas: si falla la segunda, intenta eliminar el padre recién creado. Si esa compensación falla, devuelve el UUID para revisar el registro. No existe transacción entre tablas sin agregar una función SQL; esta integración no cambia el esquema. El guardado de una evaluación es otra operación y puede reintentarse sin crear otro padre. Los cambios concurrentes no tienen bloqueo optimista; evita editar el mismo spread desde dos clientes a la vez.

Se prueban las rutas, validación, aislamiento por propietario, compensación de errores y cálculos con persistencia simulada. La comprobación real contra Supabase solo consulta datos; no se insertan registros ni se modifican políticas. El CRUD real requiere una sesión válida y políticas de escritura del proyecto. No debe presentarse como probado contra la BD hasta realizar esa comprobación autenticada.

Comandos de verificación: `npm run test:spread`, `node --test services/api-gateway/test/spreads-proxy.test.js`, `npm --workspace services/quant-service test`.
