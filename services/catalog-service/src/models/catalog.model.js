const mongoose = require('mongoose');

const catalogValueSchema = require('./catalog-value.schema');

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
      match: /^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/,
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
    values: {
      type: [catalogValueSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
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

catalogSchema.index({ 'values.parentId': 1 });
catalogSchema.index({ key: 1, 'values.code': 1 }, { unique: true });
catalogSchema.index({ key: 1, 'values.sequence': 1 }, { unique: true });

const Catalog = mongoose.model('Catalog', catalogSchema, 'catalogs');

module.exports = Catalog;