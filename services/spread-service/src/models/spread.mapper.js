/**
 * spread.mapper.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilidad única: transformar filas relacionales de Supabase/Postgres
 * (snake_case) al contrato API canónico (camelCase) del spread-service.
 *
 * IMPORTANTE: MongoDB NO usa este mapper.  El modelo Mongoose (vertical-spread.model.js)
 * ya almacena en camelCase y el `toJSON.transform` convierte `_id → id` directamente.
 * Este archivo SOLO lo consume spread.supabase.repository.js (Punto D).
 *
 * Convención de parámetros:
 *   row  → fila cruda de `vertical_spreads` devuelta por el cliente Supabase.
 *   legs → array de filas crudas de `spread_legs` asociadas al spread.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

/**
 * Transforma una fila de `spread_legs` (snake_case) al shape canónico de una pata.
 *
 * @param {Object} row - Fila cruda de Supabase (spread_legs).
 * @returns {Object}   - Pata en formato camelCase del contrato API.
 */
const mapLeg = (row) => ({
  id:                row.id,
  parentId:          row.parent_id,
  contractSymbol:    row.contract_symbol,
  optionType:        row.option_type,
  action:            row.action,
  strike:            Number(row.strike),
  expirationDate:    row.expiration_date,          // 'YYYY-MM-DD'
  bid:               row.bid               != null ? Number(row.bid)                : null,
  ask:               row.ask               != null ? Number(row.ask)                : null,
  impliedVolatility: row.implied_volatility != null ? Number(row.implied_volatility) : null,
  delta:             row.delta             != null ? Number(row.delta)              : null,
  gamma:             row.gamma             != null ? Number(row.gamma)              : null,
  theta:             row.theta             != null ? Number(row.theta)              : null,
  vega:              row.vega              != null ? Number(row.vega)               : null,
  active:            row.active,
  deletedAt:         row.deleted_at  ?? null,
  createdAt:         row.created_at,
  updatedAt:         row.updated_at,
});

/**
 * Transforma una fila de `vertical_spreads` + su array de patas al contrato canónico.
 *
 * @param {Object}   row  - Fila cruda de Supabase (vertical_spreads).
 * @param {Object[]} legs - Array de filas crudas de spread_legs para este spread.
 * @returns {Object}      - Spread en formato camelCase del contrato API.
 */
const mapSpread = (row, legs = []) => ({
  id:                   row.id,
  key:                  row.key,
  label:                row.label,
  description:          row.description           ?? null,
  underlyingTicker:     row.underlying_ticker,
  currentStockPrice:    Number(row.current_stock_price),
  strategyType:         row.strategy_type,
  spreadCategory:       row.spread_category,
  width:                Number(row.width),
  netDebitOrCredit:     Number(row.net_debit_or_credit),
  maxProfit:            Number(row.max_profit),
  maxLoss:              Number(row.max_loss),
  riskRewardRatio:      Number(row.risk_reward_ratio),
  breakEvenPrice:       Number(row.break_even_price),
  sigmaMultiplier:      Number(row.sigma_multiplier),
  calculatedSigmaValue: Number(row.calculated_sigma_value),
  active:               row.active,
  deletedAt:            row.deleted_at             ?? null,
  createdAt:            row.created_at,
  updatedAt:            row.updated_at,
  createdBy:            row.created_by             ?? null,
  updatedBy:            row.updated_by             ?? null,
  legs:                 legs.map(mapLeg),
});

/**
 * Valida que el objeto resultante cumpla el contrato mínimo esperado.
 * Útil para tests unitarios y para detectar columnas faltantes en una migración.
 *
 * @param {Object} canonical - Objeto ya mapeado por mapSpread().
 * @throws {Error}           - Si algún campo requerido es undefined.
 */
const REQUIRED_FIELDS = [
  'id', 'key', 'label', 'underlyingTicker', 'currentStockPrice',
  'strategyType', 'spreadCategory', 'width', 'netDebitOrCredit',
  'maxProfit', 'maxLoss', 'riskRewardRatio', 'breakEvenPrice',
  'sigmaMultiplier', 'calculatedSigmaValue',
];

const assertCanonicalShape = (canonical) => {
  const missing = REQUIRED_FIELDS.filter(
    (field) => canonical[field] === undefined,
  );
  if (missing.length > 0) {
    throw new Error(
      `[spread.mapper] Campos requeridos faltantes en el contrato canónico: ${missing.join(', ')}`,
    );
  }
};

module.exports = {
  mapLeg,
  mapSpread,
  assertCanonicalShape,
};
