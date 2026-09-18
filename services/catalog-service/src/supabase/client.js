const { createClient } = require('@supabase/supabase-js');

const {
  supabaseUrl,
  supabaseKey
} = require('../config/env');

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

module.exports = supabase;