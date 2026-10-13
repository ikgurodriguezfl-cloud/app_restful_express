'use strict';

require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3004,
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DATABASE || 'spread_service',
  },
};