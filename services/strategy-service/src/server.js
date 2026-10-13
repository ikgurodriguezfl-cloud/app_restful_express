const app = require('./app');
const { port } = require('./config/env');
const connectMongoDB = require('./database/mongodb');

const startServer = async () => {
  await connectMongoDB();
  app.listen(port, () => {
    console.log(`strategy-service listening on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error('No se pudo iniciar strategy-service:', error);
  process.exitCode = 1;
});
