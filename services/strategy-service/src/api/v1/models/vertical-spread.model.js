const mongoose = require('mongoose');
const optionLegSchema = require('./option-leg.schema');

const verticalSpreadSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    underlyingTicker: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    currentStockPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    strategyType: {
      type: String,
      required: true,
      enum: ['bull_call', 'bear_call', 'bull_put', 'bear_put'],
      lowercase: true,
    },
    spreadCategory: {
      type: String,
      required: true,
      enum: ['debit', 'credit'],
      lowercase: true,
    },
    width: {
      type: Number,
      required: true,
      min: 0,
    },
    netDebitOrCredit: {
      type: Number,
      required: true,
    },
    maxProfit: {
      type: Number,
      required: true,
      min: 0,
    },
    maxLoss: {
      type: Number,
      required: true,
      min: 0,
    },
    riskRewardRatio: {
      type: Number,
      required: true,
      min: 0,
    },
    breakEvenPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sigmaMultiplier: {
      type: Number,
      required: true,
      min: 0,
    },
    calculatedSigmaValue: {
      type: Number,
      required: true,
      min: 0,
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
    userId: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    lastEvaluation: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    legs: {
      type: [optionLegSchema],
      default: [],
      validate: {
        validator: (legs) => legs.length === 0 || legs.length === 2,
        message: 'Un vertical spread debe tener exactamente dos patas.',
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_document, result) => {
        result.id = result._id.toString();
        delete result._id;
        delete result.__v;
        return result;
      },
    },
  },
);

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

module.exports = mongoose.model('VerticalSpread', verticalSpreadSchema, 'vertical_spreads');
