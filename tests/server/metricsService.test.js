import { test } from 'node:test';
import assert from 'node:assert';

test('insertMetric logs metric when supabase is not configured', async () => {
  // Temporarily remove Supabase env vars
  const origUrl = process.env.SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Dynamically import to reinitialize supabase = null
  const { insertMetric } = await import('../../server/services/metricsService.js');

  // Spy on console.log
  const logged = [];
  const origLog = console.log;
  console.log = (...args) => logged.push(args);

  const metric = {
    path: '/test-path',
    method: 'GET',
    latency_ms: 10,
    tokens: 5,
    created_at: new Date().toISOString(),
  };

  await insertMetric(metric);

  // Restore console.log and env vars
  console.log = origLog;
  if (origUrl) process.env.SUPABASE_URL = origUrl;
  if (origKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;

  // Verify fallback logging
  assert.strictEqual(logged.length, 1);
  assert.deepStrictEqual(logged[0], ['[METRIC]', metric]);
}); 