'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

module.exports = {
  port: Number(process.env.SPREAD_PORT || process.env.PORT || 3004),
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DATABASE || 'spread_service',
  },
};
