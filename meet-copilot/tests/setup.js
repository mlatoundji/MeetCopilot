import dotenv from 'dotenv';
dotenv.config();

// Mock Supabase environment variables to prevent real API calls
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-anon-key';

// Silence console methods if SILENCE_CONSOLE is set
if (process.env.SILENCE_CONSOLE === 'true') {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
}

// Global test helpers can be added below 