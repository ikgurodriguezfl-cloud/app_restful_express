const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '../../../../.env'),
});

const port = Number(process.env.STRATEGY_PORT || 3003);
const mongodbUri = process.env.MONGODB_URI;
const mongodbDatabase = process.env.MONGODB_DATABASE;

module.exports = {
  port,
  mongodbUri,
  mongodbDatabase,
};
