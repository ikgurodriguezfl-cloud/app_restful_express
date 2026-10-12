const mongoose = require('mongoose');

const optionLegSchema = require('./option-leg.schema');

/**
 * Esquema principal: un Vertical Spread completo con sus patas embebidas.
 *
 * Colección MongoDB: "vertical_spreads"
 * Contrato API:      camelCase idéntico al de Supabase (el repositorio Supabase
 *                    transforma snake_case → camelCase para garantizar el mismo shape).
 *
 * Tipos de estrategia soportados (F3 Cinnamons):
 *   bull_call  → spread de débito alcista   (compra call ITM, vende call OTM)
 *   bear_call  → spread de crédito bajista  (vende call ITM/ATM, compra call OTM)
 *   bull_put   → spread de crédito alcista  (vende put ITM/ATM, compra put OTM)
 *   bear_put   → spread de débito bajista   (compra put ITM, vende put OTM)
 */
const verticalSpreadSchema = new mongoose.Schema(
  {
    /**
     * Clave de negocio única, legible, en snake_case.
     * Ejemplo: "bull_call_aapl_2026_01_17_150_155"
     * Patrón:  solo minúsculas, dígitos y guiones bajos.
     */
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
    },

    /** Nombre legible para UI/reportes. */
    label: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    // ── Subyacente ────────────────────────────────────────────────────────────

    /** Ticker del activo subyacente, ej.: "AAPL", "SPY", "QQQ". */
    underlyingTicker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    /** Precio spot del subyacente al momento de calcular el spread. */
    currentStockPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // ── Clasificación ─────────────────────────────────────────────────────────

    /**
     * Tipo de estrategia:
     *   'bull_call' | 'bear_call' | 'bull_put' | 'bear_put'
     */
    strategyType: {
      type: String,
      required: true,
      enum: ['bull_call', 'bear_call', 'bull_put', 'bear_put'],
      lowercase: true,
    },

    /**
     * Categoría financiera:
     *   'debit'  → se paga prima neta (bull_call, bear_put)
     *   'credit' → se cobra prima neta (bear_call, bull_put)
     */
    spreadCategory: {
      type: String,
      required: true,
      enum: ['debit', 'credit'],
      lowercase: true,
    },

    // ── Geometría del spread ───────────────────────────────────────────────────

    /**
     * Distancia en puntos entre los dos strikes seleccionados.
     * Calculado por el motor F0: width = |strike_long - strike_short|.
     * Optimizado por σ (desviación estándar).
     */
    width: {
      type: Number,
      required: true,
      min: 0,
    },

    // ── P&L metrics ───────────────────────────────────────────────────────────

    /**
     * Prima neta pagada (debit, valor negativo) o cobrada (credit, valor positivo).
     * Convención: negativo = salida de caja (debit), positivo = entrada (credit).
     */
    netDebitOrCredit: {
      type: Number,
      required: true,
    },

    /** Ganancia máxima posible en USD por contrato (× 100 acciones). */
    maxProfit: {
      type: Number,
      required: true,
      min: 0,
    },

    /** Pérdida máxima posible en USD por contrato (× 100 acciones). */
    maxLoss: {
      type: Number,
      required: true,
      min: 0,
    },

    /** maxProfit / maxLoss. */
    riskRewardRatio: {
      type: Number,
      required: true,
      min: 0,
    },

    /** Precio del subyacente al que el spread llega a punto de equilibrio. */
    breakEvenPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // ── Selector de width por σ (motor F0 Core Quant) ─────────────────────────

    /**
     * Multiplicador de desviación estándar usado para seleccionar el width.
     * Ejemplo: 1.0 = selección de strikes a 1σ del precio actual.
     */
    sigmaMultiplier: {
      type: Number,
      required: true,
      min: 0,
    },

    /**
     * Valor absoluto de σ calculado para el subyacente en la fecha de vencimiento.
     * σ = S × IV × √(T/252)  donde T = días a vencimiento.
     */
    calculatedSigmaValue: {
      type: Number,
      required: true,
      min: 0,
    },

    // ── Ciclo de vida ─────────────────────────────────────────────────────────

    active:    { type: Boolean, default: true },
    deletedAt: { type: Date,    default: null },
    createdBy: { type: String,  trim: true },
    updatedBy: { type: String,  trim: true },

    // ── Patas del spread (subdocumentos embebidos) ────────────────────────────

    /**
     * Array de patas (mínimo 2, máximo 2 para un vertical spread de una fecha).
     * Orden recomendado: [leg_long, leg_short].
     */
    legs: {
      type: [optionLegSchema],
      default: [],
      validate: {
        validator: (legs) => legs.length === 0 || legs.length === 2,
        message: 'Un vertical spread debe tener exactamente 2 patas (legs).',
      },
    },
  },
  {
    /**
     * timestamps: true → Mongoose agrega `createdAt` y `updatedAt` automáticamente.
     * toJSON.transform  → Mapea _id → id y elimina __v antes de serializar.
     *                     Garantiza el contrato camelCase sin transformación adicional.
     */
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_document, returned) => {
        returned.id = returned._id.toString();
        delete returned._id;
        delete returned.__v;
        return returned;
      },
    },
  },
);

// ── Índices ──────────────────────────────────────────────────────────────────

/**
 * mon-1) Lookup por ticker + tipo de estrategia (filtro más frecuente en el motor F3).
 * mon-2) Multikey sobre parentId embebido (consultas de patas por parentId).
 * mon-3) UNIQUE multikey: un mismo contractSymbol no puede repetirse dentro del spread.
 * mon-4) Soft-delete: queries de activos / no borrados.
 */
verticalSpreadSchema.index(
  { underlyingTicker: 1, strategyType: 1 },
  { name: 'idx_vs_ticker_type' },
);

verticalSpreadSchema.index(
  { 'legs.parentId': 1 },
  { name: 'idx_vs_legs_parentId' },
);

verticalSpreadSchema.index(
  { key: 1, 'legs.contractSymbol': 1 },
  { unique: true, name: 'idx_vs_key_contractSymbol' },
);

verticalSpreadSchema.index(
  { active: 1, deletedAt: 1 },
  { name: 'idx_vs_active_deletedAt' },
);

// ── Modelo ───────────────────────────────────────────────────────────────────

const VerticalSpread = mongoose.model(
  'VerticalSpread',
  verticalSpreadSchema,
  'vertical_spreads',   // nombre explícito de la colección
);

module.exports = VerticalSpread;
