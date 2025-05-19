import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const insertMetric = async (metric) => {
  if (!supabase) {
    // fallback log only
    console.log('[METRIC]', metric);
    return;
  }
  try {
    const { error } = await supabase.from('metrics').insert([metric]);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase metric insert error', err.message);
  }
}; 