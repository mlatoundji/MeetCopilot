import { insertMetric } from '../services/metricsService.js';

// Read env flags (default true)
const recordMetricsTranscript = process.env.RECORD_METRICS_TRANSCRIPT?.toLowerCase() !== 'false';
const recordMetricsSummary = process.env.RECORD_METRICS_SUMMARY?.toLowerCase() !== 'false';
const recordMetricsSuggestions = process.env.RECORD_METRICS_SUGGESTIONS?.toLowerCase() !== 'false';

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
    const wordCount = bodyText.split(/\s+/).length;
    const approxTokens = Math.round(wordCount / 0.75); // rough heuristic

    const metric = {
      path: req.originalUrl,
      method: req.method,
      latency_ms: durationMs,
      tokens: approxTokens,
      created_at: new Date().toISOString(),
    };

    // Async insert (fire-and-forget)
    insertMetric(metric).catch((err) => console.error('Metric insert failed', err));
  });

  next();
}; 