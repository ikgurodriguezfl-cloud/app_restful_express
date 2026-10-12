const crypto = require('crypto');
const mongoose = require('mongoose');

/**
 * Sub-esquema embebido: una pata (leg) individual del vertical spread.
 *
 * Decisiones de diseño:
 *  - _id: false  → Mongoose NO genera ObjectId automático para el subdocumento.
 *  - id (UUID)   → PK explícita en camelCase; permite referenciar desde Supabase
 *                  sin transformación y cumple el contrato API canónico.
 *  - parentId    → UUID del documento VerticalSpread padre.  Almacenado en el
 *                  subdocumento para que los índices multikey funcionen y para que
 *                  el mapeo Supabase → canónico sea simétrico.
 *  - timestamps  → Mongoose inyecta createdAt/updatedAt en camelCase (ver
 *                  SchemaOptions más abajo).  No se duplican en el shape explícito.
 */
const optionLegSchema = new mongoose.Schema(
  {
    /** UUID único dentro de la colección; usado como PK exportable. */
    id: {
      type: String,
      default: () => crypto.randomUUID(),
      trim: true,
    },

    /**
     * UUID del VerticalSpread que contiene esta pata.
     * Redundante en Mongo (ya está embebido) pero necesario para el índice
     * multikey y para que el repositorio Supabase devuelva el mismo shape.
     */
    parentId: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Símbolo OCC del contrato, ej.: "AAPL260117C00150000".
     * Formato: TICKER + YYMMDD + C/P + 8 dígitos de strike × 1000.
     */
    contractSymbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    /** 'call' | 'put' */
    optionType: {
      type: String,
      required: true,
      enum: ['call', 'put'],
      lowercase: true,
    },

    /** 'buy' = Long leg  /  'sell' = Short leg */
    action: {
      type: String,
      required: true,
      enum: ['buy', 'sell'],
      lowercase: true,
    },

    /** Strike price en USD. */
    strike: {
      type: Number,
      required: true,
      min: 0,
    },

    /** Fecha de vencimiento ISO-8601 (solo fecha, sin hora). */
    expirationDate: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    // ── Market data (opcional en el momento de creación, puede actualizarse) ──

    bid: { type: Number, min: 0, default: null },
    ask: { type: Number, min: 0, default: null },

    // ── Greeks ────────────────────────────────────────────────────────────────
    impliedVolatility: { type: Number, min: 0, default: null },
    delta:  { type: Number, default: null },
    gamma:  { type: Number, default: null },
    theta:  { type: Number, default: null },
    vega:   { type: Number, default: null },

    // ── Ciclo de vida ─────────────────────────────────────────────────────────
    active:    { type: Boolean, default: true },
    deletedAt: { type: Date,    default: null },
  },
  {
    /**
     * _id: false → No genera ObjectId para el subdocumento.
     * id: false  → Inhibe el virtual `id` automático de Mongoose (usamos el
     *              campo explícito `id` tipo String definido arriba).
     * timestamps: true con opción de suffixOptions en la versión base = createdAt/updatedAt.
     */
    _id: false,
    id: false,
    timestamps: true,
  },
);

module.exports = optionLegSchema;
