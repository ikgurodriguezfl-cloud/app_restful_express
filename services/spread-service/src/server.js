const app = require('./app');
const { port } = require('./config/env');
const mongoose = require('mongoose');
const { mongodb } = require('./config/env');

const start = async () => {
  await mongoose.connect(mongodb.uri, {
    dbName: mongodb.database,
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`MongoDB conectado a la base: ${mongodb.database}`);
  const server = app.listen(port, () => {
    console.log(`spread-service listening on port ${port}`);
  });
  server.on('error', async error => {
    console.error('No se pudo iniciar spread-service:', error.message);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
};

start().catch(error => {
  console.error('No se pudo iniciar spread-service:', error.message);
  process.exitCode = 1;
});
