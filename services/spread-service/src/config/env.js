'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });
module.exports = {
  port: Number(process.env.SPREAD_PORT || 3004),
  supabaseUrl: (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, ''),
  supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY,
};
