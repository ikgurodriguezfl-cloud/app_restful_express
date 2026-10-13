'use strict';

const fail = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};
const object = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Se requiere un objeto JSON.');
  return value;
};
const spreadFields = ['label', 'description', 'underlyingTicker', 'currentStockPrice', 'strategyType',
  'spreadCategory', 'width', 'netDebitOrCredit', 'maxProfit', 'maxLoss', 'riskRewardRatio',
  'breakEvenPrice', 'sigmaMultiplier', 'calculatedSigmaValue', 'updatedBy'];
const spreadRequired = spreadFields.filter((field) => !['description', 'updatedBy'].includes(field));
const legFields = ['contractSymbol', 'optionType', 'action', 'strike', 'expirationDate',
  'bid', 'ask', 'impliedVolatility', 'delta', 'gamma', 'theta', 'vega'];
const legRequired = ['contractSymbol', 'optionType', 'action', 'strike', 'expirationDate'];
const fields = (value, allowed, required = []) => {
  object(value);
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length) fail(`Campos no permitidos: ${unexpected.join(', ')}.`);
  const missing = required.filter((key) => value[key] === undefined || value[key] === null);
  if (missing.length) fail(`Campos obligatorios: ${missing.join(', ')}.`);
  if (!Object.keys(value).length) fail('No se enviaron campos.');
  return value;
};
const ids = (value) => {
  if (!Array.isArray(value) || !value.length || value.length > 100) fail('Se requieren entre 1 y 100 IDs.');
  value.forEach(legId);
  if (new Set(value).size !== value.length) fail('Los IDs no deben repetirse.');
  return value;
};
const spreadId = (value) => {
  if (!/^[0-9a-fA-F]{24}$/.test(value || '')) fail('ID de spread inválido.');
  return value;
};
const legId = (value) => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) fail('ID de pata inválido.');
  return value;
};
module.exports = { fail, object, fields, ids, spreadId, legId, spreadFields, spreadRequired, legFields, legRequired };
