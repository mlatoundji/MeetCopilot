// server/main.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import transcriptionRoutes from './routes/transcriptionRoutes.js';
import suggestionRoutes from './routes/suggestionRoutes.js';
import summaryRoutes from './routes/summaryRoutes.js';
import imageAnalysisRoutes from './routes/imageAnalysisRoutes.js';
import { initializeLocalLLM, cleanupLocalLLM } from './services/localLLMService.js';
import path from 'path';
import meetingsRouter from './routes/meetingsRoutes.js';
import { fileURLToPath } from 'url';
import { metricsMiddleware } from './middleware/metricsMiddleware.js';
import conversationRouter from './routes/conversationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import compression from 'compression';
import http2 from 'http2';
import fs from 'fs';
import { register } from 'prom-client';
import cron from 'node-cron';
import redis from './utils/redisClient.js';
import { fetchConversation, persistConversation } from './controllers/conversationController.js';
import { estimateTokens } from './utils/tokenEstimator.js';
import { buildAssistantSummaryPrompt } from './services/promptBuilder.js';
import { chatCompletion as mistralChatCompletion } from './services/mistralService.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import sessionsRoutes from './routes/sessionsRoutes.js';

// Determine __dirname differently in test environment to avoid import.meta.url errors
let __dirname;
if (process.env.NODE_ENV === 'test') {
  __dirname = path.resolve();
} else {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
}

// Configuration
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:8000', 'http://localhost:3000', 'http://localhost:5173', 'http://[::]:8000', 'http://[::]:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Add metrics instrumentation
app.use(metricsMiddleware);

// Only compress non-SSE responses to keep EventSource working
const shouldCompress = (req, res) => {
  // Do not compress server-sent events
  if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
    return false;
  }
  // Fallback to default filter function
  return compression.filter(req, res);
};

// Add compression middleware for transport optimization
app.use(compression({
  filter: shouldCompress,
  brotli: { enabled: true, zlib: {} },
  threshold: 512
}));

// Additional CORS headers for extra compatibility
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (corsOptions.origin.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Local LLM
console.log('Initializing Local LLM...');
initializeLocalLLM().then(initialized => {
    if (initialized) {
        console.log('Local LLM initialized successfully');
    } else {
        console.error('Failed to initialize Local LLM. API fallback will be used.');
    }
}).catch(error => {
    console.error('Error during Local LLM initialization:', error);
});

// Basic root route for testing
app.get('/', (req, res) => {
    res.json({ message: 'API is running' });
});

// API Routes with and without /api prefix for backward compatibility
const apiPrefix = '/api';
app.use(apiPrefix + '/suggestions', suggestionRoutes);
app.use(apiPrefix + '/summary', summaryRoutes);
app.use(apiPrefix + '/transcribe', transcriptionRoutes);
app.use(apiPrefix + '/analyze', imageAnalysisRoutes);
app.use(apiPrefix + '/meetings', meetingsRouter);
app.use(apiPrefix + '/sessions', sessionsRoutes);
app.use(apiPrefix + '/conversation', conversationRouter);
app.use(apiPrefix + '/auth', authRoutes);
app.use(apiPrefix + '/chatbot', chatbotRoutes);

// Prometheus metrics endpoint (moved above error handler)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Function to sanitize URL for logging
function sanitizeUrl(url) {
  return url.replace(/[^\w\s-]/g, '');
}

// Error handling middleware
app.use((req, res, next) => {
    console.log(`404 - Not Found: ${req.method} ${sanitizeUrl(req.originalUrl)}`);
    res.status(404).json({ 
        error: 'Not Found',
        path: req.originalUrl,
        method: req.method
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Shared async function to handle cleanup with timeout
async function handleCleanup(signal) {
  console.log(`Received ${signal}, cleaning up...`);
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Cleanup timed out')), 5000);
    });
    await Promise.race([cleanupLocalLLM(), timeoutPromise]);
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error(`Error during cleanup: ${error.message}`);
  } finally {
    process.exit(0);
  }
}

// Cleanup on server shutdown
process.on('SIGINT', () => handleCleanup('SIGINT'));
process.on('SIGTERM', () => handleCleanup('SIGTERM'));

// Start server with optional HTTP/2
if (process.env.NODE_ENV !== 'test') {
  if (process.env.HTTP2 === 'true' && process.env.HTTP2_KEY_PATH && process.env.HTTP2_CERT_PATH) {
    const key = fs.readFileSync(process.env.HTTP2_KEY_PATH);
    const cert = fs.readFileSync(process.env.HTTP2_CERT_PATH);
    const server2 = http2.createSecureServer({ key, cert, allowHTTP1: true }, app);
    server2.on('sessionError', (err) => console.error('HTTP/2 session error:', err));
    server2.on('error', (err) => console.error('HTTP/2 server error:', err));
    server2.listen(PORT, () => console.log(`HTTP/2 server listening on port ${PORT}`));
  } else {
    const server1 = app.listen(PORT, () => console.log(`HTTP/1.1 server listening on port ${PORT}`));
    server1.on('error', (err) => console.error('HTTP/1 server error:', err));
  }
}

// Auto-tuning cron: every hour, compress long conversations
if (process.env.NODE_ENV !== 'test' && process.env.AUTO_TUNER === 'true') {
cron.schedule('0 * * * *', async () => {
  console.log('Auto-tuner: running memory check...');
  try {
    const keys = await redis.keys('conv:*');
    for (const key of keys) {
      const cid = key.split(':')[1];
      let memory;
      try {
        memory = await fetchConversation(cid);
      } catch (err) {
        console.error(`Auto-tuner fetch failed for ${cid}:`, err.message);
        continue;
      }
      const summaryTokens = estimateTokens(memory.summary);
      const messageTokens = estimateTokens(memory.messages);
      const totalTokens = summaryTokens + messageTokens;
      if (totalTokens > 50000) {
        console.log(`Compressing conversation ${cid}: ${totalTokens} tokens`);
        const chunkToSummarise = memory.messages.slice(0, -WINDOW_MAX_TURNS);
        if (chunkToSummarise.length) {
          try {
            const prompt = buildAssistantSummaryPrompt(chunkToSummarise);
            const newSummary = await mistralChatCompletion(prompt, { model: 'mistral-medium', max_tokens: 250, temperature: 0.4 });
            memory.summary = newSummary;
            memory.messages = memory.messages.slice(-WINDOW_MAX_TURNS);
            await persistConversation(cid, memory, null);
            console.log(`Conversation ${cid} compressed successfully`);
          } catch (err) {
            console.error(`Auto-tuner compression failed for ${cid}:`, err.message);
          }
        }
      }
    }
  } catch (err) {
    console.error('Auto-tuner job failed:', err.message);
  }
});
}

export default app;