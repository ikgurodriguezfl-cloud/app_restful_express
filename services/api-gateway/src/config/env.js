const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '../../../../.env'),
});

const port = Number(process.env.GATEWAY_PORT || 3000);
const catalogServiceUrl = process.env.CATALOG_SERVICE_URL || 'http://localhost:3001';
const quantServiceUrl = process.env.QUANT_SERVICE_URL || 'http://localhost:3002';
const strategyServiceUrl = process.env.STRATEGY_SERVICE_URL || 'http://localhost:3003';

module.exports = {
  port,
  catalogServiceUrl,
  quantServiceUrl,
  strategyServiceUrl,
};
