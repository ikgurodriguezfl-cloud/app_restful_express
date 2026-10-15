const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const port = Number(process.env.PORT || 3004);

module.exports = { port };
