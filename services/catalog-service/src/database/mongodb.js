const mongoose = require('mongoose');

const {
  mongodbUri,
  mongodbDatabase
} = require('../config/env');

const connectMongoDB = async () => {
  try {
    await mongoose.connect(mongodbUri, {
      dbName: mongodbDatabase
    });

    console.log(`MongoDB conectado a la base: ${mongodbDatabase}`);
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectMongoDB;