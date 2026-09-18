const crypto = require('crypto');
const mongoose = require('mongoose');

const catalogValueSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => crypto.randomUUID(),
      trim: true,
    },
    parentId: {
      type: String,
      default: null,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    alias: {
      type: String,
      trim: true,
    },
    sequence: {
      type: Number,
      default: 0,
      min: 0,
      validate: Number.isInteger,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
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
  {
    _id: false,
    id: false,
    timestamps: true,
  },
);

module.exports = catalogValueSchema;