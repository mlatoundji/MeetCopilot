// backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import transcriptionRoutes from './routes/transcriptionRoutes.js';
import suggestionRoutes from './routes/suggestionRoutes.js';
import summaryRoutes from './routes/summaryRoutes.js';
import { initializeLocalLLM, cleanupLocalLLM } from './services/localLLMService.js';

// Configuration
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
const corsOptions = {
    origin: [
        'http://localhost:8000',
        'http://localhost:5173', 
        'http://localhost:3000',
        'http://127.0.0.1:8000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));

// Additional CORS headers for extra compatibility
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/suggestions', suggestionRoutes);
app.use('/suggestions', suggestionRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/summary', summaryRoutes);
app.use('/api/transcribe', transcriptionRoutes);
app.use('/transcribe', transcriptionRoutes);

// Error handling middleware
app.use((req, res, next) => {
    console.log(`404 - Not Found: ${req.method} ${req.originalUrl}`);
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

// Cleanup on server shutdown
process.on('SIGINT', () => {
    console.log('Cleaning up...');
    cleanupLocalLLM();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Cleaning up...');
    cleanupLocalLLM();
    process.exit(0);
});

// Start Server
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
});

