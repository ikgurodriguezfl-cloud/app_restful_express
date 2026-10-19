'use strict';
const { createClient } = require('@supabase/supabase-js');
const config = require('./config/env');
function createDatabase(token) {
  if (!config.supabaseUrl || !config.supabaseKey) {
    const error = new Error('Configura SUPABASE_URL y SUPABASE_KEY en el .env local.');
    error.status = 503;
    throw error;
  }
  let role;
  try { role = JSON.parse(Buffer.from(config.supabaseKey.split('.')[1], 'base64url')).role; } catch {}
  if (config.supabaseKey.startsWith('sb_secret_') || role === 'service_role') {
    throw new Error('Spread Service requiere una clave pública de Supabase.');
  }
  return createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
  });
}
module.exports = { createDatabase };
