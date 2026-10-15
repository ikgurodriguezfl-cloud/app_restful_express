const AlpacaAdapter = require('./alpaca/alpaca.adapter');

const createBroker = (config) => {
  if (config.provider === 'alpaca') return new AlpacaAdapter(config);
  throw new Error(`Proveedor de broker no soportado: ${config.provider}.`);
};

module.exports = { createBroker };
