//const port = Number(process.env.PORT || 3001);

//module.exports = { port };

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '../../../../.env')
});

const port = Number(process.env.PORT || 3001);

const mongodbUri = process.env.MONGODB_URI;
const mongodbDatabase = process.env.MONGODB_DATABASE;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;


module.exports = {
  port,
  mongodbUri,
  mongodbDatabase,
  supabaseUrl,
  supabaseKey
};