const mongoose = require('mongoose');
const catalogValueSchema = require('./catalog-value.schema');

// FIC: Esquema principal de un catálogo (ej. key: "institutos")
const catalogSchema = new mongoose.Schema(
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
    collection: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
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
    route: {
      type: String,
      trim: true,
    },
    values: {
      type: [catalogValueSchema],
      default: [],
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
    timestamps: true,
  },
);

module.exports = mongoose.model('Catalog', catalogSchema, 'catalogs');
