const app = require('./app');
const { port } = require('./config/env');

app.listen(port, () => {
  console.log(`quant-service listening on port ${port}`);
});
