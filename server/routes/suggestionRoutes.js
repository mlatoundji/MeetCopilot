import express from 'express';
import { generateSuggestions } from '../controllers/suggestionController.js';

const router = express.Router();

// Routes
router.post('/suggestions', generateSuggestions);

export default router;