const crypto = require('crypto');
const mongoose = require('mongoose');

const optionLegSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => crypto.randomUUID(),
      trim: true,
    },
    parentId: {
      type: String,
      required: true,
      trim: true,
    },
    contractSymbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    optionType: {
      type: String,
      required: true,
      enum: ['call', 'put'],
      lowercase: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['buy', 'sell'],
      lowercase: true,
    },
    strike: {
      type: Number,
      required: true,
      min: 0,
    },
    expirationDate: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    bid: {
      type: Number,
      min: 0,
      default: null,
    },
    ask: {
      type: Number,
      min: 0,
      default: null,
    },
    impliedVolatility: {
      type: Number,
      min: 0,
      default: null,
    },
    delta: {
      type: Number,
      default: null,
    },
    gamma: {
      type: Number,
      default: null,
    },
    theta: {
      type: Number,
      default: null,
    },
    vega: {
      type: Number,
      default: null,
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1,
      validate: Number.isInteger,
    },
    active: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
    id: false,
    timestamps: true,
  },
);

module.exports = optionLegSchema;
