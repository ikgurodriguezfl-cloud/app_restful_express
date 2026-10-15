const app = require('./app');
const { port } = require('./config/env');

app.listen(port, () => {
  console.log(`spread-service listening on port ${port}`);
});
