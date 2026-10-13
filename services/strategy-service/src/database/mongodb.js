const mongoose = require('mongoose');
const { mongodbUri, mongodbDatabase } = require('../config/env');

const connectMongoDB = async () => {
  if (!mongodbUri) {
    throw new Error('La variable MONGODB_URI es necesaria para strategy-service.');
  }

  await mongoose.connect(mongodbUri, {
    dbName: mongodbDatabase,
  });

  console.log(`MongoDB conectado a la base: ${mongodbDatabase}`);
};

module.exports = connectMongoDB;
