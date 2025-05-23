// server/main.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import transcriptionRoutes from './routes/transcriptionRoutes.js';
import suggestionRoutes from './routes/suggestionRoutes.js';
import summaryRoutes from './routes/summaryRoutes.js';
import { initializeLocalLLM, cleanupLocalLLM } from './services/localLLMService.js';
import path from 'path';
import meetingsRouter from './routes/meetingsRoutes.js';
import { fileURLToPath } from 'url';
import { metricsMiddleware } from './middleware/metricsMiddleware.js';
import conversationRouter from './routes/conversationRoutes.js';
import authRoutes from './routes/authRoutes.js';

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
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:8000', 'http://localhost:3000', 'http://[::]:8000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Add metrics instrumentation
app.use(metricsMiddleware);

// Additional CORS headers for extra compatibility
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (corsOptions.origin.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
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
app.use(apiPrefix + '/meetings', meetingsRouter);
app.use(apiPrefix + '/conversation', conversationRouter);
app.use(apiPrefix + '/auth', authRoutes);

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

// Start Server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log('Available routes:');
      console.log(`- GET  /`);
      console.log(`- POST /api/summary or /summary`);
      console.log(`- POST /api/summary/batch or /summary/batch`);
      console.log(`- GET  /api/cache/stats`);
      console.log(`- POST /api/cache/clear`);
      console.log(`- POST /api/transcribe/assemblyai or /transcribe/assemblyai`);
      console.log(`- POST /api/transcribe/whisper or /transcribe/whisper`);
      console.log(`- POST /api/suggestions/local or /suggestions/local (Uses local LLM)`);
      console.log(`- POST /api/meetings`);
      console.log(`- POST /api/conversation`);
      console.log(`- POST /api/auth/login`);
      console.log(`- POST /api/auth/register`);
  });
}

export default app;