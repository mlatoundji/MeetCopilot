import { createClient } from '@supabase/supabase-js';
import util from 'util';

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
    // Insert metric into Supabase
    const { data, error } = await supabase
      .from('metrics')
      .insert([metric], { returning: 'representation' });
    // Log the raw response for debugging
    if (error) {
      console.error('Supabase metric insertion failed:');
      // Reveal all own property names of the error object
      console.error('PostgrestError ownProps:', Object.getOwnPropertyNames(error));
      // Print default string representation
      console.error('Error.toString():', error.toString());
      // Destructure common fields (may still be undefined if non-enumerable)
      const { message, code, details, hint, status } = error;
      console.error('Supabase metric insertion details:', { message, code, details, hint, status });
      return;
    }
    // On success, if Supabase returned the inserted record, log it; otherwise log the original metric
    if (Array.isArray(data) && data.length > 0) {
      console.debug('Inserted metric record:', data[0]);
    } else {
      console.debug('Metric inserted (no returned data):', metric);
    }
  } catch (err) {
    console.error('Supabase metric insert exception:', util.inspect(err, { depth: null }));
  }
}; 