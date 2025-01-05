import express from 'express';
import { generateSummary } from '../controllers/summaryController.js';

const router = express.Router();

// Routes
router.post('/summary', generateSummary);

export default router;