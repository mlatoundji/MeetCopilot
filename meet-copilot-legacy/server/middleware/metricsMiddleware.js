import { insertMetric } from '../services/metricsService.js';
import { Counter, Histogram } from 'prom-client';

// Read env flags (default true)
const recordMetricsTranscript = process.env.RECORD_METRICS_TRANSCRIPT?.toLowerCase() !== 'false';
const recordMetricsSummary = process.env.RECORD_METRICS_SUMMARY?.toLowerCase() !== 'false';
const recordMetricsSuggestions = process.env.RECORD_METRICS_SUGGESTIONS?.toLowerCase() !== 'false';

// Prometheus counters/histograms
const promptTokensCounter = new Counter({ name: 'prompt_tokens_total', help: 'Total approximate prompt tokens sent', labelNames: ['path'] });
const latencyHistogram = new Histogram({ name: 'latency_ms_bucket', help: 'Latency of LLM endpoints in ms', labelNames: ['path','method'], buckets: [50,100,200,500,1000,2000,5000,10000] });

// Middleware to measure request latency and token usage for LLM-related endpoints
export const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  // continue processing the request
  res.on('finish', () => {
    // Nano to ms
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

    // Only monitor relevant endpoints (suggestions, summary, transcribe)
    const url = req.originalUrl;
    // Filter by config flags
    if (/^\/api\/transcribe/.test(url) && !recordMetricsTranscript) return;
    if (/^\/api\/summary/.test(url) && !recordMetricsSummary) return;
    if (/^\/api\/suggestions/.test(url) && !recordMetricsSuggestions) return;
    if (!/\/api\/(suggestions|summary|transcribe)/.test(url)) return;

    const bodyText = JSON.stringify(req.body || {});
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
    const approxTokens = Math.round(wordCount / 0.75);

    // Determine conversation_id for metrics; support params, query, and body
    const conversationId = req.params?.cid || req.body?.conversation_id || req.query?.conversation_id;
    if (!conversationId) {
      console.warn('Skipping metric insertion: conversation_id is missing for path', url);
      return;
    }

    const metric = {
      conversation_id: conversationId,
      path: url,
      method: req.method,
      latency_ms: durationMs,
      tokens: approxTokens,
      created_at: new Date().toISOString(),
    };

    // Prometheus metrics
    promptTokensCounter.inc({ path: metric.path }, metric.tokens);
    latencyHistogram.observe({ path: metric.path, method: metric.method }, metric.latency_ms);

    // Async insert (fire-and-forget)
    insertMetric(metric).catch((err) => console.error('Metric insert failed', err));
  });

  next();
}; 