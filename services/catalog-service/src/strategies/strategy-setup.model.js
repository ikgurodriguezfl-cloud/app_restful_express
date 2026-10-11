const mongoose = require('mongoose');

const strategyLegSchema = new mongoose.Schema(
  {
    optionType: {
      type: String,
      enum: ['call', 'put'],
      required: true,
    },
    strike: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    side: {
      type: String,
      enum: ['buy', 'sell'],
      required: true,
    },
    price: {
      type: Number,
      min: 0,
    },
  },
  { _id: false },
);

const strategySetupSchema = new mongoose.Schema(
  {
    strategyType: {
      type: String,
      enum: ['BULL_CALL', 'BULL_PUT', 'BEAR_CALL', 'BEAR_PUT'],
      required: true,
      uppercase: true,
      trim: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z0-9.\-]+$/,
    },
    underlyingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    expiration: {
      type: Date,
      required: true,
    },
    longLeg: {
      type: strategyLegSchema,
      required: true,
    },
    shortLeg: {
      type: strategyLegSchema,
      required: true,
    },
    assumptions: {
      rate: { type: Number, required: true },
      volatility: { type: Number, required: true, min: 0 },
      timeToMaturity: { type: Number, required: true, min: 0 },
    },
    evaluation: {
      longOption: { type: Object },
      shortOption: { type: Object },
      netPremium: Number,
      maxProfit: Number,
      maxLoss: Number,
      breakEven: Number,
      scenarioMatrix: { type: [Object], default: [] },
      evaluatedAt: Date,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    active: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: String,
      trim: true,
    },
    updatedBy: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

strategySetupSchema.index({ symbol: 1, expiration: 1, active: 1 });

module.exports = mongoose.model('StrategySetup', strategySetupSchema, 'strategy_setups');
