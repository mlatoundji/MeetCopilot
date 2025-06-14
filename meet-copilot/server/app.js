import express from 'express';
import cors from 'cors';
import sessionsRoutes from './routes/sessionsRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

// Mount migrated API routes
app.use('/api/sessions', sessionsRoutes);

// Export the Express app
export default app; 