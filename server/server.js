// backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import transcriptionRoutes from './routes/transcriptionRoutes.js';
import suggestionRoutes from './routes/suggestionRoutes.js';
import summaryRoutes from './routes/summaryRoutes.js';

// Configuration
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/', suggestionRoutes);
app.use('/', summaryRoutes);
app.use('/transcribe', transcriptionRoutes);


// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

